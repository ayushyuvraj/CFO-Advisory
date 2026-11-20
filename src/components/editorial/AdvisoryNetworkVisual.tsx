"use client";

import { useState } from "react";
import { VisualFrame, type VisualCallout } from "./VisualFrame";
import { useVisualVisibility } from "./useVisualVisibility";

const NODES = [[52, 128], [128, 58], [131, 174], [211, 113], [271, 50], [289, 171], [349, 108]];
const CALLOUTS = [
  { title: "Process scope", detail: "Define the activities and records to review." },
  { title: "Activity sequence", detail: "Trace the sequence of steps recorded in source systems." },
  { title: "Source data", detail: "Identify which systems capture each step." },
  { title: "Process variants", detail: "Compare how different cases move through the same process." },
  { title: "Process ownership", detail: "Identify teams responsible for decisions and approvals." },
  { title: "Controls", detail: "Set practical checks for handoffs across teams." },
  { title: "Improvement opportunities", detail: "Use recurring delays and exceptions to guide review." },
];
const EDGES = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [4, 6], [5, 6]];

export function AdvisoryNetworkVisual() {
  const { ref, active } = useVisualVisibility();
  const [callout, setCallout] = useState<VisualCallout | null>(null);
  return (
    <VisualFrame label="Process Mining" callout={callout}>
    <svg ref={ref} data-active={active} viewBox="0 0 400 235" className="editorial-network block h-auto w-full" role="group" aria-label="Process Mining callouts" onKeyDown={(event) => { if (event.key === "Escape") setCallout(null); }}>
      {EDGES.map(([a, b], index) => {
        const [x1, y1] = NODES[a];
        const [x2, y2] = NODES[b];
        return (
          <g key={`${a}-${b}`}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#0091DA" strokeOpacity=".49" />
            <circle className="editorial-network-packet" r="3" fill="#ACEAFF" style={{ offsetPath: `path("M${x1} ${y1}L${x2} ${y2}")`, animationDelay: `${index * -.7}s` }} />
          </g>
        );
      })}
      {NODES.map(([x, y], index) => (
        <g key={x}
          tabIndex={0}
          aria-label={`${CALLOUTS[index].title}. ${CALLOUTS[index].detail}`}
          className="editorial-visual-hotspot"
          onPointerEnter={() => setCallout(CALLOUTS[index])}
          onPointerLeave={() => setCallout(null)}
          onFocus={() => setCallout(CALLOUTS[index])}
          onBlur={() => setCallout(null)}
          onClick={() => setCallout(CALLOUTS[index])}
        >
          <circle cx={x} cy={y} r="21" fill="transparent" />
          <circle cx={x} cy={y} r={index === 3 ? 17 : 11} fill="#001B44" stroke="#0091DA" />
          <circle cx={x} cy={y} r={index === 3 ? 8 : 4} fill={index % 2 ? "#ACEAFF" : "#483698"} />
        </g>
      ))}
    </svg>
    </VisualFrame>
  );
}
