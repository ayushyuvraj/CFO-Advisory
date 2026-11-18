"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle,
  UploadSimple,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";
import {
  ValidatedDashboardImport,
  validateImportedDashboardJson,
} from "@/lib/dashboards/exportUtils";
import { CreateDashboardInput } from "@/lib/dashboards/types";

interface ImportDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (input: CreateDashboardInput) => Promise<void>;
}

export function ImportDashboardModal(props: ImportDashboardModalProps) {
  if (!props.isOpen || typeof document === "undefined") return null;
  return <ImportDashboardModalInner {...props} />;
}

function ImportDashboardModalInner({
  isOpen,
  onClose,
  onImport,
}: ImportDashboardModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [rawJson, setRawJson] = useState("");
  const [preview, setPreview] = useState<ValidatedDashboardImport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useDialogFocusTrap(isOpen, dialogRef, onClose);

  const parseContent = (text: string) => {
    setRawJson(text);
    if (!text.trim()) {
      setPreview(null);
      setError(null);
      return;
    }
    try {
      const validated = validateImportedDashboardJson(text);
      setPreview(validated);
      setError(null);
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : "Invalid dashboard JSON.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      parseContent(typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview) {
      setError("Upload or paste a valid dashboard definition JSON file first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onImport({
        title: preview.title,
        description: preview.description,
        refreshIntervalSec: preview.refreshIntervalSec,
        pages: preview.pages,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-dashboard-title"
      data-lenis-prevent="true"
      data-lenis-prevent-wheel="true"
      data-lenis-prevent-touch="true"
    >
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#0C233C]/45 backdrop-blur-xs"
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative z-10 flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-sm border border-[#D8DFE9] bg-white shadow-2xl focus:outline-none"
        data-lenis-prevent="true"
        data-lenis-prevent-wheel="true"
        data-lenis-prevent-touch="true"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#D8DFE9] bg-[#F8FAFC] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-sm bg-[#00338D]/10 text-[#00338D]">
              <UploadSimple size={20} weight="light" />
            </div>
            <div>
              <h2
                id="import-dashboard-title"
                className="text-base font-bold text-[#0C233C]"
              >
                Import Dashboard Layout JSON
              </h2>
              <p className="text-xs text-[#526075]">
                Imports page & visual bindings connected strictly to your live platform stores.
              </p>
            </div>
          </div>
          <button
            type="button"
            data-dialog-close="true"
            onClick={onClose}
            aria-label="Close import modal"
            className="rounded-sm p-1.5 text-[#526075] hover:bg-[#E2E8F0] hover:text-[#0C233C]"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-sm border border-[#B91C1C]/30 bg-[#B91C1C]/5 p-3 text-xs text-[#991B1B]"
            >
              <WarningCircle size={16} weight="bold" className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="import-json-file"
              className="block text-xs font-semibold text-[#0C233C]"
            >
              Select Exported .json File
            </label>
            <input
              id="import-json-file"
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="mt-1.5 block w-full text-xs text-[#333940] file:mr-3 file:rounded-sm file:border file:border-[#D8DFE9] file:bg-[#F4F6FA] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#00338D] hover:file:bg-[#E8EEF5]"
            />
          </div>

          <div>
            <label
              htmlFor="import-json-text"
              className="block text-xs font-semibold text-[#0C233C]"
            >
              Or Paste Dashboard JSON
            </label>
            <textarea
              id="import-json-text"
              data-autofocus="true"
              rows={6}
              value={rawJson}
              onChange={(e) => parseContent(e.target.value)}
              placeholder='{"title": "...", "pages": [...]}'
              className="mt-1.5 w-full rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] p-2.5 font-mono text-xs text-[#0C233C] focus:border-[#00338D] focus:bg-white focus:outline-none"
            />
          </div>

          {preview && (
            <div className="rounded-sm border border-[#009A44]/40 bg-[#009A44]/5 p-3 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-[#009A44]">
                <CheckCircle size={15} weight="fill" />
                <span>Schema Verified</span>
              </div>
              <p className="mt-1 font-semibold text-[#0C233C]">{preview.title}</p>
              <p className="font-mono text-[11px] text-[#526075]">
                {preview.pages.length} page{preview.pages.length !== 1 ? "s" : ""} ·{" "}
                {preview.widgetCount} visual widget{preview.widgetCount !== 1 ? "s" : ""}
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-[#D8DFE9] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm border border-[#D8DFE9] bg-white px-4 py-2 text-xs font-semibold text-[#333940] hover:bg-[#F4F6FA]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!preview || submitting}
              className="rounded-sm bg-[#00338D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E49E2] disabled:opacity-50"
            >
              {submitting ? "Importing..." : "Import Dashboard"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
