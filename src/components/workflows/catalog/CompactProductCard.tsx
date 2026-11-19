"use client";

import {
  ArrowSquareOut,
  Code,
  Eye,
  Prohibit,
  Sliders,
  Cpu,
} from "@phosphor-icons/react";
import { ConnectedPlatform } from "@/data/platforms";
import { useAuth } from "@/context/AuthContext";
import { UnifiedHubCard } from "../UnifiedHubCard";

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

export interface ProductHealthProbe {
  status: "operational" | "offline" | "maintenance";
  frontendOnline: boolean;
  backendOnline: boolean;
}

interface CompactProductCardProps {
  platform: ConnectedPlatform;
  probe?: ProductHealthProbe;
  canLaunchProducts: boolean;
  isPreviewMode: boolean;
  onInspect: (platform: ConnectedPlatform) => void;
}

export function CompactProductCard({
  platform,
  probe,
  canLaunchProducts,
  isPreviewMode,
  onInspect,
}: CompactProductCardProps) {
  const { user } = useAuth();

  const launchHref = (() => {
    if (!platform.launchUrl) return "#";
    try {
      const url = new URL(platform.launchUrl);
      if (user?.email) url.searchParams.set("userEmail", user.email);
      if (user?.companyId) url.searchParams.set("companyId", user.companyId);
      if (user?.personaId || user?.id) url.searchParams.set("personaId", user?.personaId || user?.id);
      return url.toString();
    } catch {
      return platform.launchUrl;
    }
  })();
  // Use real-time live probe if available; otherwise fall back to platform.status
  const currentStatus = probe
    ? probe.status
    : platform.status === "active"
      ? "operational"
      : "maintenance";

  const isOperational = currentStatus === "operational";
  const isMaintenance = currentStatus === "maintenance";
  const safeLaunch = isSafeLaunchUrl(platform.launchUrl);

  const badgeElement = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-xs px-2 py-0.5 font-mono text-[11px] font-semibold transition-all duration-200 ${
        isOperational
          ? "bg-[#009A44]/10 text-[#009A44]"
          : isMaintenance
            ? "bg-amber-500/10 text-amber-700"
            : "bg-red-500/10 text-red-700"
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
  );

  const actionsElement = (
    <>
      {/* Inspect / Drawer Trigger Icon */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onInspect(platform);
        }}
        title="Inspect platform specifications"
        aria-label="Inspect platform details"
        className="flex h-7.5 w-7.5 items-center justify-center rounded-sm text-[#526075] transition-all duration-150 hover:bg-[#F4F6FA] hover:text-[#00338D] hover:scale-110 active:scale-[0.92]"
      >
        <Sliders size={16} weight="bold" />
      </button>

      {/* Backend API Docs Icon */}
      {platform.portBackend && (
        <a
          href={`http://localhost:${platform.portBackend}/docs`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title="API Documentation"
          aria-label="API Documentation"
          className="flex h-7.5 w-7.5 items-center justify-center rounded-sm text-[#526075] transition-all duration-150 hover:bg-[#F4F6FA] hover:text-[#00338D] hover:scale-110 active:scale-[0.92]"
        >
          <Code size={16} weight="bold" />
        </a>
      )}

      {/* Primary 1-Click Launch Icon Button */}
      {isPreviewMode ? (
        <button
          type="button"
          disabled
          onClick={(e) => e.stopPropagation()}
          title="Launch disabled during preview mode"
          aria-label="Launch disabled during preview mode"
          className="flex h-7.5 w-7.5 items-center justify-center rounded-sm border border-[#1E49E2]/30 bg-[#1E49E2]/10 text-[#00338D] cursor-not-allowed opacity-75"
        >
          <Eye size={16} weight="bold" />
        </button>
      ) : canLaunchProducts && safeLaunch ? (
        <a
          href={launchHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title={`Launch ${platform.title}`}
          aria-label={`Launch ${platform.title}`}
          className="flex h-7.5 w-7.5 items-center justify-center rounded-sm bg-[#00338D] text-white shadow-xs transition-all duration-150 hover:bg-[#1E49E2] hover:scale-110 hover:shadow-md active:scale-[0.92]"
        >
          <ArrowSquareOut size={16} weight="bold" />
        </a>
      ) : (
        <button
          type="button"
          disabled
          onClick={(e) => e.stopPropagation()}
          title="Launch restricted by persona role"
          aria-label="Launch restricted"
          className="flex h-7.5 w-7.5 items-center justify-center rounded-sm border border-[#D8DFE9] bg-gray-100 text-[#6B7280] cursor-not-allowed"
        >
          <Prohibit size={16} weight="bold" />
        </button>
      )}
    </>
  );

  return (
    <UnifiedHubCard
      dataCardId={platform.id}
      icon={<Cpu size={19} weight="bold" />}
      badge={badgeElement}
      title={platform.title}
      onTitleClick={() => onInspect(platform)}
      onClick={() => onInspect(platform)}
      actions={actionsElement}
    />
  );
}
