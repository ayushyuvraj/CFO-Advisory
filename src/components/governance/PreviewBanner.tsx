"use client";

import { ArrowUUpLeft, Eye, ShieldWarning } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";

export function PreviewBanner() {
  const { user, isPreviewMode, exitPreview } = useAuth();

  if (!isPreviewMode || !user) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-sm border-2 border-[#1E49E2] bg-[#0C233C] px-5 py-3.5 text-white shadow-md">
      <div className="flex items-center gap-3">
        <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-[#1E49E2] text-white">
          <Eye size={18} weight="bold" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold tracking-wider text-[#60A5FA] uppercase">
              KPMG Live Preview Mode
            </span>
            <span className="inline-flex items-center gap-1 rounded-xs bg-white/10 px-2 py-0.5 font-mono text-[10px] text-white/90">
              <ShieldWarning size={12} weight="bold" />
              Read-Only Perspective Check
            </span>
          </div>
          <p className="mt-0.5 text-sm font-medium text-white">
            Viewing portal as{" "}
            <span className="font-bold text-[#93C5FD]">{user.name}</span> (
            {user.role}) at{" "}
            <span className="font-bold text-white">{user.companyName}</span>
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={exitPreview}
        className="inline-flex items-center gap-2 rounded-sm bg-white px-4 py-2 text-xs font-semibold text-[#0C233C] shadow-xs transition-colors hover:bg-[#F4F6FA] active:scale-[0.98]"
      >
        <ArrowUUpLeft size={15} weight="bold" />
        <span>Exit Preview & Return to KPMG Lead</span>
      </button>
    </div>
  );
}
