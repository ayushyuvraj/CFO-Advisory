"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  PlusCircle,
  Copy,
  Check,
  Key,
  ShieldCheck,
  ArrowSquareOut,
  TerminalWindow,
} from "@phosphor-icons/react";
import { RegisteredProduct } from "@/lib/telemetry/types";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: (product: RegisteredProduct) => void;
}

function AddProductModalInner({
  onClose,
  onProductCreated,
}: {
  onClose: () => void;
  onProductCreated: (product: RegisteredProduct) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [pillar, setPillar] = useState<"TRANSFORMATION_AI" | "TREASURY" | "CLOSE_REPORT" | "EPM">(
    "TRANSFORMATION_AI"
  );
  const [launchUrl, setLaunchUrl] = useState("http://localhost:3002");
  const [portFrontend, setPortFrontend] = useState("3002");
  const [portBackend, setPortBackend] = useState("8002");
  const [description, setDescription] = useState("");
  const [systemIntegration, setSystemIntegration] = useState("SAP S/4HANA · Oracle Cloud");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdProduct, setCreatedProduct] = useState<RegisteredProduct | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);

  const handleSafeClose = useCallback(() => {
    if (!isLoading) {
      onClose();
    }
  }, [isLoading, onClose]);

  useDialogFocusTrap(true, panelRef, handleSafeClose);

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name,
          slug,
          pillar,
          launchUrl,
          portFrontend: portFrontend ? parseInt(portFrontend, 10) : undefined,
          portBackend: portBackend ? parseInt(portBackend, 10) : undefined,
          description: description || `Autonomous execution product integrated with ${systemIntegration}.`,
          systemIntegration,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to register product");
      }

      setCreatedProduct(data.product);
      onProductCreated(data.product);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: "key" | "endpoint") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "key") {
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
      } else {
        setCopiedEndpoint(true);
        setTimeout(() => setCopiedEndpoint(false), 2000);
      }
    } catch {
      // Clipboard API may be restricted in non-HTTPS contexts
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-product-modal-title"
      data-lenis-prevent="true"
      data-lenis-prevent-wheel="true"
      data-lenis-prevent-touch="true"
    >
      <div
        onClick={handleSafeClose}
        className="fixed inset-0 bg-[#0C233C]/60 backdrop-blur-xs"
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        onWheel={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto overscroll-contain rounded-sm border border-[#D8DFE9] bg-white shadow-2xl focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D8DFE9] bg-[#F8FAFC] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-sm bg-[#00338D]/10 text-[#00338D]">
              <PlusCircle size={20} weight="bold" />
            </div>
            <div>
              <h2 id="add-product-modal-title" className="text-base font-bold text-[#0C233C]">
                {createdProduct ? "Product Onboarding Complete" : "Register New Connected Product"}
              </h2>
              <p className="text-xs text-[#4B5563]">
                {createdProduct
                  ? "Credentials and telemetry contract generated"
                  : "Onboard any standalone product with autonomous telemetry streaming"}
              </p>
            </div>
          </div>
          <button
            type="button"
            data-dialog-close="true"
            disabled={isLoading}
            onClick={handleSafeClose}
            aria-label="Close add product modal"
            className="rounded-sm p-1.5 text-[#4B5563] transition-colors hover:bg-[#E2E8F0] hover:text-[#0C233C] disabled:opacity-50"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-sm border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {error}
            </div>
          )}

          {createdProduct ? (
            /* Post-Registration Credentials Card */
            <div className="space-y-4">
              <div className="rounded-sm border border-[#009A44]/30 bg-[#F0FDF4] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#009A44]">
                  <ShieldCheck size={20} weight="bold" />
                  <span>Product Successfully Registered in Catalog</span>
                </div>
                <p className="mt-1 text-xs text-[#333940]">
                  <strong className="text-[#0C233C]">{createdProduct.name}</strong> ({createdProduct.id}) is now live. Provide the telemetry contract below to your engineering team.
                </p>
              </div>

              {/* API Key */}
              <div className="rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] p-3.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-mono text-xs font-semibold text-[#0C233C]">
                    <Key size={14} weight="bold" className="text-[#00338D]" />
                    Product API Key (Secret)
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(createdProduct.apiKey, "key")}
                    className="inline-flex items-center gap-1 rounded-sm border border-[#D8DFE9] bg-white px-2 py-1 font-mono text-[11px] text-[#00338D] hover:bg-[#F4F6FA]"
                  >
                    {copiedKey ? <Check size={12} weight="bold" /> : <Copy size={12} />}
                    {copiedKey ? "Copied" : "Copy Key"}
                  </button>
                </div>
                <p className="mt-2 font-mono text-xs text-[#1E49E2] break-all">
                  {createdProduct.apiKey}
                </p>
              </div>

              {/* Telemetry Endpoint */}
              <div className="rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] p-3.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-mono text-xs font-semibold text-[#0C233C]">
                    <TerminalWindow size={14} weight="bold" className="text-[#00338D]" />
                    Telemetry Ingestion Endpoint
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard("/api/telemetry", "endpoint")}
                    className="inline-flex items-center gap-1 rounded-sm border border-[#D8DFE9] bg-white px-2 py-1 font-mono text-[11px] text-[#00338D] hover:bg-[#F4F6FA]"
                  >
                    {copiedEndpoint ? <Check size={12} weight="bold" /> : <Copy size={12} />}
                    {copiedEndpoint ? "Copied" : "Copy Route"}
                  </button>
                </div>
                <p className="mt-2 font-mono text-xs text-[#333940]">
                  POST /api/telemetry
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#D8DFE9]">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-sm border border-[#D8DFE9] bg-white px-4 py-2 text-xs font-semibold text-[#333940] hover:bg-[#F8FAFC]"
                >
                  Done
                </button>
                <a
                  href={createdProduct.launchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-sm bg-[#00338D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E49E2]"
                >
                  <span>Launch Product Now</span>
                  <ArrowSquareOut size={14} weight="bold" />
                </a>
              </div>
            </div>
          ) : (
            /* Registration Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="add-product-name" className="block text-xs font-semibold text-[#0C233C]">
                    Product Title *
                  </label>
                  <input
                    id="add-product-name"
                    data-autofocus="true"
                    type="text"
                    required
                    placeholder="e.g. Autonomous Treasury Reconciliation"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="mt-1 w-full rounded-sm border border-[#D8DFE9] bg-white px-3 py-2 text-xs text-[#0C233C] focus:border-[#00338D] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="add-product-slug" className="block text-xs font-semibold text-[#0C233C]">
                    System Identifier (Slug) *
                  </label>
                  <input
                    id="add-product-slug"
                    type="text"
                    required
                    placeholder="e.g. liquidity-stress-test"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="mt-1 w-full rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] px-3 py-2 font-mono text-xs text-[#0C233C] focus:border-[#00338D] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="add-product-pillar" className="block text-xs font-semibold text-[#0C233C]">
                    Practice Pillar *
                  </label>
                  <select
                    id="add-product-pillar"
                    value={pillar}
                    onChange={(e) => setPillar(e.target.value as typeof pillar)}
                    className="mt-1 w-full rounded-sm border border-[#D8DFE9] bg-white px-3 py-2 text-xs text-[#0C233C] focus:border-[#00338D] focus:outline-none"
                  >
                    <option value="TRANSFORMATION_AI">Transformation & AI Automation</option>
                    <option value="TREASURY">Treasury & Working Capital</option>
                    <option value="CLOSE_REPORT">Close-to-Report & ESG</option>
                    <option value="EPM">Enterprise Performance Management (EPM)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="add-product-launch-url" className="block text-xs font-semibold text-[#0C233C]">
                    Launch Destination URL *
                  </label>
                  <input
                    id="add-product-launch-url"
                    type="text"
                    required
                    placeholder="http://localhost:3002 or https://..."
                    value={launchUrl}
                    onChange={(e) => setLaunchUrl(e.target.value)}
                    className="mt-1 w-full rounded-sm border border-[#D8DFE9] bg-white px-3 py-2 font-mono text-xs text-[#0C233C] focus:border-[#00338D] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="add-product-port-fe" className="block text-xs font-semibold text-[#0C233C]">
                    Frontend Port (Local Dev)
                  </label>
                  <input
                    id="add-product-port-fe"
                    type="number"
                    placeholder="3002"
                    value={portFrontend}
                    onChange={(e) => setPortFrontend(e.target.value)}
                    className="mt-1 w-full rounded-sm border border-[#D8DFE9] bg-white px-3 py-2 font-mono text-xs text-[#0C233C] focus:border-[#00338D] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="add-product-port-be" className="block text-xs font-semibold text-[#0C233C]">
                    Backend Port (Local Dev)
                  </label>
                  <input
                    id="add-product-port-be"
                    type="number"
                    placeholder="8002"
                    value={portBackend}
                    onChange={(e) => setPortBackend(e.target.value)}
                    className="mt-1 w-full rounded-sm border border-[#D8DFE9] bg-white px-3 py-2 font-mono text-xs text-[#0C233C] focus:border-[#00338D] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="add-product-erp" className="block text-xs font-semibold text-[#0C233C]">
                  Integrated Systems / ERP
                </label>
                <input
                  id="add-product-erp"
                  type="text"
                  placeholder="e.g. SAP S/4HANA · Kyriba TMS · Workday"
                  value={systemIntegration}
                  onChange={(e) => setSystemIntegration(e.target.value)}
                  className="mt-1 w-full rounded-sm border border-[#D8DFE9] bg-white px-3 py-2 text-xs text-[#0C233C] focus:border-[#00338D] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="add-product-desc" className="block text-xs font-semibold text-[#0C233C]">
                  Description
                </label>
                <textarea
                  id="add-product-desc"
                  rows={2}
                  placeholder="Summarize product purpose and capabilities..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-sm border border-[#D8DFE9] bg-white px-3 py-2 text-xs text-[#0C233C] focus:border-[#00338D] focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#D8DFE9]">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleSafeClose}
                  className="rounded-sm border border-[#D8DFE9] bg-white px-4 py-2 text-xs font-semibold text-[#333940] hover:bg-[#F8FAFC] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 rounded-sm bg-[#00338D] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#1E49E2] disabled:opacity-50"
                >
                  {isLoading ? "Registering..." : "Register Product"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export function AddProductModal({
  isOpen,
  onClose,
  onProductCreated,
}: AddProductModalProps) {
  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <AddProductModalInner
      onClose={onClose}
      onProductCreated={onProductCreated}
    />,
    document.body
  );
}
