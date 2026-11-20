"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function EditorialReveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("editorial-revealed");
        observer.unobserve(entry.target);
      }
    }, { threshold: .1 });
    root.querySelectorAll(".editorial-reveal").forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return <div ref={ref}>{children}</div>;
}
