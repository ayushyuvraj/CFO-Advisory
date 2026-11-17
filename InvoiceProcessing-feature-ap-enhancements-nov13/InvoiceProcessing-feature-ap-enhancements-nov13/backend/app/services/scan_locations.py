"""Offline scan text locations. Images and recognised text stay in memory.

PP-OCRv4 ONNX models: PaddleOCR/RapidOCR, Apache-2.0. Model files are shipped
with the app; there is no model download or OCR service at runtime.
"""
import hashlib
import threading
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort

_lock = threading.Lock()
_models = None
_MODEL_SHA256 = {'text_det.onnx': 'd2a7720d45a54257208b1e13e36a8479894cb74155a5efe29462512d42f49da9', 'identifier_rec.onnx': '48fc40f24f6d2a207a2b1091d3437eb3cc3eb6b676dc3ef9c37384005483683b'}


def _engine():
    global _models
    if _models is None:
        opts = ort.SessionOptions()
        opts.intra_op_num_threads = opts.inter_op_num_threads = 1
        opts.enable_cpu_mem_arena = False
        opts.log_severity_level = 4
        root = Path(__file__).parents[1] / 'assets'
        for name, expected in _MODEL_SHA256.items():
            if hashlib.sha256((root / name).read_bytes()).hexdigest() != expected:
                raise RuntimeError('OCR model integrity check failed')
        sessions = [ort.InferenceSession(str(root / name), sess_options=opts,
                    providers=['CPUExecutionProvider'])
                    for name in ('text_det.onnx', 'identifier_rec.onnx')]
        chars = [''] + sessions[1].get_modelmeta().custom_metadata_map['character'].splitlines() + [' ']
        _models = (*sessions, chars)
    return _models


def _recognise(image, session, chars):
    h, w = image.shape[:2]
    width = min(2048, max(1, int(np.ceil(48 * w / h))))
    resized = cv2.resize(image, (width, 48)).astype(np.float32).transpose(2, 0, 1) / 127.5 - 1
    tensor = np.zeros((1, 3, 48, max(320, width)), dtype=np.float32)
    tensor[0, :, :, :width] = resized
    pred = session.run(None, {session.get_inputs()[0].name: tensor})[0][0]
    indexes, scores = pred.argmax(axis=1), pred.max(axis=1)
    text, probs, previous = [], [], -1
    for token, score in zip(indexes, scores):
        token = int(token)
        if token and token != previous and token < len(chars):
            text.append(chars[token])
            probs.append(float(score))
        previous = token
    return ''.join(text), sum(probs) / max(1, len(probs))


def read_page(page):
    """Return [(text, confidence, PDF-point rectangle)], no disk cache/logs."""
    with _lock:
        detector, recogniser, chars = _engine()
        # Bounded raster and single-threaded inference for the 1-CPU service.
        scale = min(180 / 72, 2200 / max(page.rect.width, page.rect.height))
        import pymupdf
        pix = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=False,
                              colorspace=pymupdf.csRGB)
        img = np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width, 3)[:, :, ::-1].copy()
        ih, iw = img.shape[:2]
        ratio = min(1, 1600 / max(ih, iw))
        dh, dw = max(32, round(ih * ratio / 32) * 32), max(32, round(iw * ratio / 32) * 32)
        inp = cv2.resize(img, (dw, dh)).astype(np.float32) / 255
        inp = ((inp - .5) / .5).transpose(2, 0, 1)[None].astype(np.float32)
        heat = detector.run(None, {detector.get_inputs()[0].name: inp})[0][0, 0]
        contours, _ = cv2.findContours((heat > .3).astype(np.uint8), cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        found = []
        for contour in contours[:1500]:
            rect = cv2.minAreaRect(contour)
            (cx, cy), (w, h), angle = rect
            if min(w, h) < 3:
                continue
            mask = np.zeros(heat.shape, dtype=np.uint8)
            cv2.fillPoly(mask, [contour], 1)
            if cv2.mean(heat, mask)[0] < .55:
                continue
            # Expand the detected text core into a complete line rectangle.
            pad = w * h * 1.5 / max(1, 2 * (w + h))
            box = cv2.boxPoints(((cx, cy), (w + 2 * pad, h + 2 * pad), angle))
            box[:, 0] *= iw / heat.shape[1]
            box[:, 1] *= ih / heat.shape[0]
            x0, y0 = np.maximum(0, np.floor(box.min(axis=0))).astype(int)
            x1, y1 = np.minimum([iw, ih], np.ceil(box.max(axis=0))).astype(int)
            if x1 - x0 < 5 or y1 - y0 < 5:
                continue
            crop = img[y0:y1, x0:x1]
            text, score = _recognise(crop, recogniser, chars)
            if text.strip() and score >= .90:
                found.append((text, score, [float(x0 / iw * page.rect.width), float(y0 / ih * page.rect.height),
                                           float(x1 / iw * page.rect.width), float(y1 / ih * page.rect.height)]))
        return sorted(found, key=lambda row: (row[2][1], row[2][0]))


def read_row_characters(page, box):
    """CTC character spans for one detected row, in PDF coordinates.

    Used only by bank highlighting to separate a value from its label/currency.
    No text/image is saved; existing full-page OCR behaviour is unchanged.
    """
    import pymupdf
    with _lock:
        _, recogniser, chars = _engine()
        clip = (pymupdf.Rect(box) + (-1, -1, 1, 1)) & page.rect
        if clip.is_empty:
            return []
        pix = page.get_pixmap(matrix=pymupdf.Matrix(4, 4), clip=clip,
                             alpha=False, colorspace=pymupdf.csRGB)
        image = np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width, 3)[:, :, ::-1].copy()
        h, w = image.shape[:2]
        width = min(2048, max(1, int(np.ceil(48*w/h))))
        resized = cv2.resize(image, (width, 48)).astype(np.float32).transpose(2, 0, 1)/127.5-1
        tensor_width = max(320, width)
        tensor = np.zeros((1, 3, 48, tensor_width), dtype=np.float32)
        tensor[0, :, :, :width] = resized
        pred = recogniser.run(None, {recogniser.get_inputs()[0].name: tensor})[0][0]
        indexes, scores = pred.argmax(axis=1), pred.max(axis=1)
        spans, previous = [], -1
        for t, (token, score) in enumerate(zip(indexes, scores)):
            token = int(token)
            if token and token == previous and spans:
                spans[-1][2] = t+1
                spans[-1][3] = max(spans[-1][3], float(score))
            elif token and token < len(chars):
                spans.append([chars[token], t, t+1, float(score)])
            previous = token
        factor = tensor_width/len(indexes)/width*clip.width
        return [(text, score, [max(clip.x0, clip.x0+start*factor), clip.y0,
                               min(clip.x1, clip.x0+end*factor), clip.y1])
                for text, start, end, score in spans if clip.x0+start*factor < clip.x1]
