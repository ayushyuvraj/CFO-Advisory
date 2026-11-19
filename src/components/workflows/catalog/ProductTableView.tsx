"use client";

import {
  ArrowSquareOut,
  Code,
  Eye,
  Prohibit,
  Sliders,
} from "@phosphor-icons/react";
import { ConnectedPlatform } from "@/data/platforms";
import { ProductHealthProbe } from "./CompactProductCard";

function isSafeLaunchUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === "https:") return true;
    if (
      parsed.protocol === "http:" &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

interface ProductTableViewProps {
  products: ConnectedPlatform[];
  probes?: Record<string, ProductHealthProbe>;
  canLaunchProducts: boolean;
  isPreviewMode: boolean;
  onInspect: (platform: ConnectedPlatform) => void;
}

export function ProductTableView({
  products,
  probes,
  canLaunchProducts,
  isPreviewMode,
  onInspect,
}: ProductTableViewProps) {
  return (
    <div className="overflow-hidden rounded-sm border border-[#D8DFE9] bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[#D8DFE9] bg-[#F8FAFC] font-mono text-[11px] font-semibold uppercase text-[#526075]">
              <th className="py-2.5 px-4 font-semibold">
                Status
              </th>
              <th className="py-2.5 px-4 font-semibold">
                Platform Name
              </th>
              <th className="py-2.5 px-4 text-right font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8DFE9]">
            {products.map((platform) => {
              const probe = probes?.[platform.id];
              const currentStatus = probe
                ? probe.status
                : platform.status === "active"
                  ? "operational"
                  : "maintenance";

              const isOperational = currentStatus === "operational";
              const isMaintenance = currentStatus === "maintenance";
              const isOffline = currentStatus === "offline";
              const safeLaunch = isSafeLaunchUrl(platform.launchUrl);

              return (
                <tr
                  key={platform.id}
                  className="transition-colors duration-100 hover:bg-[#F8FAFC]"
                >
                  {/* Real-time Dynamic Status */}
                  <td className="whitespace-nowrap py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold ${
                        isOperational
                          ? "text-[#009A44]"
                          : isMaintenance
                            ? "text-amber-700"
                            : "text-red-700"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isOperational
                            ? "bg-[#009A44] animate-pulse"
                            : isMaintenance
                              ? "bg-amber-500"
                              : "bg-red-600"
                        }`}
                      />
                      {isOperational
                        ? "Operational"
                        : isMaintenance
                          ? "Maintenance"
                          : "Offline"}
                    </span>
                  </td>

                  {/* Title */}
                  <td className="py-3 px-4">
                    <div
                      onClick={() => onInspect(platform)}
                      className="cursor-pointer font-sans font-semibold text-[#0C233C] transition-colors hover:text-[#00338D]"
                    >
                      {platform.title}
                    </div>
                  </td>

                  {/* Icon Actions */}
                  <td className="whitespace-nowrap py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      {/* Inspect Drawer Icon */}
                      <button
                        type="button"
                        onClick={() => onInspect(platform)}
                        title="Inspect platform details"
                        aria-label="Inspect platform details"
                        className="flex h-7 w-7 items-center justify-center rounded-sm text-[#526075] transition-colors hover:bg-[#F4F6FA] hover:text-[#00338D]"
                      >
                        <Sliders size={15} weight="bold" />
                      </button>

                      {/* API Docs Icon */}
                      {platform.portBackend && (
                        <a
                          href={`http://localhost:${platform.portBackend}/docs`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="API Documentation"
                          aria-label="API Documentation"
                          className="flex h-7 w-7 items-center justify-center rounded-sm text-[#526075] transition-colors hover:bg-[#F4F6FA] hover:text-[#00338D]"
                        >
                          <Code size={15} weight="bold" />
                        </a>
                      )}

                      {/* Launch Button */}
                      {isPreviewMode ? (
                        <button
                          type="button"
                          disabled
                          title="Launch disabled during preview mode"
                          aria-label="Launch disabled during preview mode"
                          className="flex h-7 w-7 items-center justify-center rounded-sm border border-[#1E49E2]/30 bg-[#1E49E2]/10 text-[#00338D] cursor-not-allowed opacity-75"
                        >
                          <Eye size={15} weight="bold" />
                        </button>
                      ) : canLaunchProducts && safeLaunch ? (
                        <a
                          href={platform.launchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`Launch ${platform.title}`}
                          aria-label={`Launch ${platform.title}`}
                          className="flex h-7 w-7 items-center justify-center rounded-sm bg-[#00338D] text-white shadow-xs transition-colors hover:bg-[#1E49E2]"
                        >
                          <ArrowSquareOut size={15} weight="bold" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          title="Launch restricted"
                          aria-label="Launch restricted"
                          className="flex h-7 w-7 items-center justify-center rounded-sm border border-[#D8DFE9] bg-gray-100 text-[#6B7280] cursor-not-allowed"
                        >
                          <Prohibit size={15} weight="bold" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
