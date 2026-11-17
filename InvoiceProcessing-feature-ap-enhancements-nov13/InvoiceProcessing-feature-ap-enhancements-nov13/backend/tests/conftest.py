import hashlib
import os
import sys
import tempfile
from pathlib import Path

import pytest

# Settings are read at import time — configure the environment first.
_TMP = Path(tempfile.mkdtemp(prefix="fcc-test-"))
os.environ.update({
    "DATABASE_URL": f"sqlite:///{(_TMP / 'test.db').as_posix()}",
    "STORAGE_DIR": str(_TMP / "documents"),
    "ASYNC_PROCESSING": "false",
    "ZOHO_MODE": "mock",
    "ZOHO_SYNC_ON_STARTUP": "true",
    "GEMINI_API_KEY": "",
})

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))
sys.path.insert(0, str(BACKEND / "scripts"))

from fastapi.testclient import TestClient  # noqa: E402

import sample_invoices  # noqa: E402
from app.main import app  # noqa: E402
from app.services import extraction  # noqa: E402


class FakeExtractor:
    """Returns the extraction Gemini would produce, keyed by file content."""

    def __init__(self) -> None:
        self.by_hash: dict[str, dict] = {}

    def register(self, content: bytes, payload: dict) -> None:
        self.by_hash[hashlib.sha256(content).hexdigest()] = payload

    async def extract(self, path: str, mime: str, pages: int) -> dict:
        digest = hashlib.sha256(Path(path).read_bytes()).hexdigest()
        return self.by_hash[digest]


@pytest.fixture(scope="session")
def fake() -> FakeExtractor:
    f = FakeExtractor()
    extraction.set_extractor(f)
    return f


@pytest.fixture(scope="session")
def samples(fake: FakeExtractor) -> dict[str, bytes]:
    out = {}
    for key in sample_invoices.SAMPLES:
        path = _TMP / "samples" / f"{key}.pdf"
        pos = sample_invoices.render(key, path)
        content = path.read_bytes()
        fake.register(content, sample_invoices.fake_extraction(key, pos))
        out[key] = content
    return out


@pytest.fixture(scope="session")
def client(fake, samples):
    with TestClient(app) as c:
        yield c


def upload(client: TestClient, content: bytes, name: str = "invoice.pdf", user: str = "s.joshi@genstar-demo.in") -> dict:
    r = client.post("/api/invoices", files={"file": (name, content, "application/pdf")}, headers={"X-User": user})
    assert r.status_code == 202, r.text
    return r.json()
