import type { ReactNode } from "react";

export type VisualCallout = { title: string; detail: string };

export function VisualFrame({ label, callout, children }: {
  label: string;
  callout: VisualCallout | null;
  children: ReactNode;
}) {
  return (
    <figure className="editorial-visual-frame overflow-hidden rounded-sm bg-[#001B44] text-white">
      <div className="relative">
        {children}
        {callout && (
          <div className="editorial-caption-in pointer-events-none absolute inset-x-3 bottom-3 sm:right-auto sm:max-w-xs">
            <div className="rounded-sm border border-white/25 bg-[#001B44]/95 px-3 py-2 shadow-lg">
              <p className="text-sm font-semibold text-ice">{callout.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-white/90">{callout.detail}</p>
            </div>
          </div>
        )}
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-white/15 px-4 py-3 font-mono text-[10px] uppercase tracking-[.14em] text-white/85">
        <span>{label}</span>
        <span className="text-ice">Capability illustration</span>
      </figcaption>
    </figure>
  );
}
