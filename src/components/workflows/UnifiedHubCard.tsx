"use client";

import { useState, useRef, useEffect, ReactNode, MouseEvent } from "react";

export interface UnifiedHubCardProps {
  icon: ReactNode;
  badge: ReactNode;
  title: string;
  subtitle?: ReactNode;
  meta?: ReactNode;
  onTitleClick?: () => void;
  actions: ReactNode;
  dataCardId?: string;
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
}

export function UnifiedHubCard({
  icon,
  badge,
  title,
  subtitle,
  meta,
  onTitleClick,
  actions,
  dataCardId,
  onClick,
  className = "",
  children,
}: UnifiedHubCardProps) {
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

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
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

  const handleMouseDown = (e: MouseEvent) => {
    // Only register press if not clicking interactive action buttons/links directly
    if ((e.target as HTMLElement).closest("a, button, input, [role='button']")) return;
    setIsPressed(true);
  };

  const handleMouseUp = () => {
    setIsPressed(false);
  };

  const handleCardClick = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest("a, button, input, [role='button']")) return;
    if (onClick) {
      onClick();
    } else if (onTitleClick) {
      onTitleClick();
    }
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
      data-hub-card={dataCardId}
      onClick={handleCardClick}
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
      className={`group relative flex flex-col justify-between rounded-sm border bg-white p-4.5 cursor-pointer select-none h-[181px] ${
        isHovered
          ? "border-[#C5CFDC] shadow-[0_20px_35px_-10px_rgba(12,35,60,0.12),0_10px_20px_-5px_rgba(12,35,60,0.06)]"
          : "border-[#D8DFE9] shadow-xs"
      } ${className}`}
    >
      {/* Holographic Cursor Spotlight / Glare Sheen */}
      <div
        className="pointer-events-none absolute inset-0 rounded-sm transition-opacity duration-300 overflow-hidden"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(circle 240px at ${glarePosition.x}% ${glarePosition.y}%, rgba(255, 255, 255, 0.65), transparent 75%)`,
        }}
      />

      {/* Top Section: Icon + Badge (Z-plane 20px) */}
      <div
        style={{
          transform: isHovered ? "translateZ(20px)" : "translateZ(0)",
          transition: "transform 180ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        <div className="flex items-center justify-between pb-2.5">
          {/* 34px x 34px Icon Container */}
          <div
            className={`flex h-8.5 w-8.5 items-center justify-center rounded-sm transition-all duration-200 ${
              isHovered
                ? "bg-[#00338D] text-white shadow-sm scale-105"
                : "bg-[#00338D]/10 text-[#00338D]"
            }`}
          >
            {icon}
          </div>

          {/* Right Status / Visibility Badge */}
          {badge}
        </div>

        {/* Title (Standardized font, size, line-height across all sheets) */}
        <h3
          onClick={(e) => {
            if (onTitleClick) {
              e.stopPropagation();
              onTitleClick();
            }
          }}
          className={`font-sans text-[13.5px] font-bold leading-snug text-[#0C233C] transition-colors duration-150 group-hover:text-[#00338D] ${
            subtitle ? "line-clamp-1" : "line-clamp-2 min-h-[38px]"
          }`}
          title={title}
        >
          {title}
        </h3>

        {subtitle && (
          <div className="mt-0.5 font-mono text-[11px] font-semibold text-[#00338D] truncate">
            {subtitle}
          </div>
        )}

        {children}
      </div>

      {/* Bottom Section: Smile Style Pure Icon Action Bar + Left Meta (Z-plane 22px) */}
      <div
        style={{
          transform: isHovered ? "translateZ(22px)" : "translateZ(0)",
          transition: "transform 180ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
        className="flex items-center justify-between border-t border-[#F1F5F9] pt-2.5"
      >
        <div className="flex items-center gap-2 min-w-0 pr-2">
          {meta}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {actions}
        </div>
      </div>
    </div>
  );
}
