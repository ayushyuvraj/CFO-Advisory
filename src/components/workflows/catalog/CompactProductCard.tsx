"use client";

import { useState, useRef, useEffect } from "react";
import {
  ArrowSquareOut,
  Code,
  Eye,
  Prohibit,
  Sliders,
  Cpu,
} from "@phosphor-icons/react";
import { ConnectedPlatform } from "@/data/platforms";

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
  // Use real-time live probe if available; otherwise fall back to platform.status
  const currentStatus = probe
    ? probe.status
    : platform.status === "active"
      ? "operational"
      : "maintenance";

  const isOperational = currentStatus === "operational";
  const isMaintenance = currentStatus === "maintenance";
  const safeLaunch = isSafeLaunchUrl(platform.launchUrl);

  // 3D Tilt and Interactive Pop Physics
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const media = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(media.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    }
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Subtle, high-end 3D tilt physics (max ±6.5deg)
    const rotX = -((y - centerY) / centerY) * 6.5;
    const rotY = ((x - centerX) / centerX) * 6.5;

    setRotateX(rotX);
    setRotateY(rotY);
    setGlarePosition({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsPressed(false);
    setRotateX(0);
    setRotateY(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only register press if not clicking action icons directly
    if ((e.target as HTMLElement).closest("a, button")) return;
    setIsPressed(true);
  };

  const handleMouseUp = () => {
    setIsPressed(false);
  };

  // Compute 3D transform style
  const cardTransform = prefersReducedMotion
    ? isPressed
      ? "scale(0.98)"
      : isHovered
        ? "translateY(-4px)"
        : "translateY(0)"
    : isPressed
      ? `perspective(1000px) rotateX(${rotateX * 0.4}deg) rotateY(${rotateY * 0.4}deg) translateY(-1px) translateZ(8px) scale3d(0.975, 0.975, 0.975)`
      : isHovered
        ? `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px) translateZ(16px) scale3d(1.02, 1.02, 1.02)`
        : "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0) translateZ(0) scale3d(1, 1, 1)";

  return (
    <div
      ref={cardRef}
      data-product-card={platform.id}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      style={{
        transform: cardTransform,
        transformStyle: "preserve-3d",
        transition: isHovered && !isPressed
          ? "transform 140ms cubic-bezier(0.23, 1, 0.32, 1), box-shadow 220ms ease-out, border-color 200ms ease-out"
          : "transform 420ms cubic-bezier(0.23, 1, 0.32, 1), box-shadow 350ms ease-out, border-color 250ms ease-out",
        willChange: "transform, box-shadow",
      }}
      className={`group relative flex flex-col justify-between rounded-sm border bg-white p-4.5 cursor-pointer select-none ${
        isHovered
          ? "border-[#C5CFDC] shadow-[0_20px_35px_-10px_rgba(12,35,60,0.12),0_10px_20px_-5px_rgba(12,35,60,0.06)]"
          : "border-[#D8DFE9] shadow-xs"
      }`}
    >
      {/* Holographic Cursor Spotlight / Glare Sheen (Neutral light reflection) */}
      <div
        className="pointer-events-none absolute inset-0 rounded-sm transition-opacity duration-300 overflow-hidden"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(circle 240px at ${glarePosition.x}% ${glarePosition.y}%, rgba(255, 255, 255, 0.65), transparent 75%)`,
        }}
      />

      {/* Top: Icon + Dynamic Health Status Badge (Z-plane 20px) */}
      <div
        style={{
          transform: isHovered ? "translateZ(20px)" : "translateZ(0)",
          transition: "transform 180ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        <div className="flex items-center justify-between pb-3">
          <div
            className={`flex h-8.5 w-8.5 items-center justify-center rounded-sm transition-all duration-200 ${
              isHovered
                ? "bg-[#00338D] text-white shadow-sm scale-105"
                : "bg-[#00338D]/10 text-[#00338D]"
            }`}
          >
            <Cpu size={19} weight="bold" />
          </div>

          {/* Real-time Dynamic Health Badge */}
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
        </div>

        {/* Title (Z-plane 16px) */}
        <h3
          onClick={() => onInspect(platform)}
          className="font-sans text-[13.5px] font-bold leading-snug text-[#0C233C] transition-colors duration-150 group-hover:text-[#00338D] line-clamp-2"
          title={platform.title}
        >
          {platform.title}
        </h3>
      </div>

      {/* Bottom: Pure Icon Action Bar ("Smile" style) (Z-plane 22px) */}
      <div
        style={{
          transform: isHovered ? "translateZ(22px)" : "translateZ(0)",
          transition: "transform 180ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
        className="mt-4 flex items-center justify-end border-t border-[#F1F5F9] pt-3"
      >
        <div className="flex items-center gap-1.5">
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
              href={platform.launchUrl}
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
        </div>
      </div>
    </div>
  );
}
