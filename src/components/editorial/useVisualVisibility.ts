"use client";

import { useEffect, useRef, useState } from "react";

export function useVisualVisibility() {
  const ref = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const observer = new IntersectionObserver(([entry]) => {
      setActive(entry.isIntersecting && entry.intersectionRatio >= .25);
    }, { threshold: .25 });
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);
  return { ref, active };
}
