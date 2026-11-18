"use client";

import React from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface InteractiveHoverButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string;
}

const InteractiveHoverButton = React.forwardRef<
  HTMLButtonElement,
  InteractiveHoverButtonProps
>(({ text = "Button", className, type = "button", ...props }, ref) => {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "group relative inline-flex w-auto cursor-pointer items-center justify-center overflow-hidden rounded-full border border-[#D8DFE9] bg-white px-5 py-2 text-center text-xs font-semibold text-[#0C233C] shadow-xs transition-[border-color,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-[#00338D] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F8FAFC]",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="h-2 w-2 shrink-0 rounded-full bg-[#00338D] transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[45]"
        />
        <span className="inline-block whitespace-nowrap transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-10 group-hover:opacity-0">
          {text}
        </span>
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 z-10 flex h-full w-full translate-x-10 items-center justify-center gap-1.5 text-white opacity-0 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-0 group-hover:opacity-100"
      >
        <span className="whitespace-nowrap">{text}</span>
        <ArrowRight size={14} weight="bold" />
      </div>
    </button>
  );
});

InteractiveHoverButton.displayName = "InteractiveHoverButton";

export { InteractiveHoverButton };
