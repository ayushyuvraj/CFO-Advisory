"use client";

import { useState } from "react";
import { VisualFrame, type VisualCallout } from "./VisualFrame";
import { useVisualVisibility } from "./useVisualVisibility";

const BAR_HEIGHTS = [49, 72, 64, 112, 101, 144];
const CALLOUTS = [
  { title: "Coverage", detail: "Identify the records and reporting periods in scope." },
  { title: "Data quality", detail: "Check for missing fields, duplicate entries, and inconsistent records." },
  { title: "Anomaly detection", detail: "Surface unusual movements for investigation." },
  { title: "Variance analysis", detail: "Trace differences to transactions and operating drivers." },
  { title: "Controls testing", detail: "Review evidence against defined control requirements." },
  { title: "Audit evidence", detail: "Link findings to the records that support them." },
];
const POINTS = [[36, 129], [100, 111], [163, 116], [226, 75], [289, 82], [354, 42]];

export function AuditAnalyticsVisual() {
  const { ref, active } = useVisualVisibility();
  const [callout, setCallout] = useState<VisualCallout | null>(null);
  return (
    <VisualFrame label="Audit" callout={callout}>
    <svg ref={ref} data-active={active} className="editorial-audit block h-auto w-full" viewBox="0 0 400 235" role="group" aria-label="Audit and financial analytics callouts" onKeyDown={(event) => { if (event.key === "Escape") setCallout(null); }}>
      <path d="M30 48H370M30 86H370M30 124H370M30 162H370M30 199H370" stroke="#83CAEE" strokeOpacity=".24" />
      {BAR_HEIGHTS.map((height, index) => (
        <g key={height}
          tabIndex={0}
          aria-label={`${CALLOUTS[index].title}. ${CALLOUTS[index].detail}`}
          className="editorial-visual-hotspot"
          onPointerEnter={() => setCallout(CALLOUTS[index])}
          onPointerLeave={() => setCallout(null)}
          onFocus={() => setCallout(CALLOUTS[index])}
          onBlur={() => setCallout(null)}
          onClick={() => setCallout(CALLOUTS[index])}
        >
          <rect className="editorial-chart-bar" x={36 + index * 56} y={198 - height} width="36" height={height} rx="2" fill={index % 2 ? "#483698" : "#0091DA"} style={{ animationDelay: `${index * 70}ms` }} />
        </g>
      ))}
      <path pointerEvents="none" className="editorial-chart-line" d="M36 129 100 111 163 116 226 75 289 82 354 42" pathLength="1" fill="none" stroke="#ACEAFF" strokeWidth="2" />
      {POINTS.map(([x, y], index) => (
        <circle pointerEvents="none" className="editorial-chart-point" key={x} cx={x} cy={y} r="3.5" fill="#ACEAFF" style={{ animationDelay: `${index * 240}ms` }} />
      ))}
    </svg>
    </VisualFrame>
  );
}
