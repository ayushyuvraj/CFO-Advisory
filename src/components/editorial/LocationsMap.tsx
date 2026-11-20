"use client";

import { useState } from "react";

type City = { name: string; x: number; y: number };

export function LocationsMap({ mapSrc, cities }: { mapSrc?: string; cities: readonly City[] }) {
  const [active, setActive] = useState(0);

  return (
    <section id="locations" className="editorial-reveal scroll-mt-18 bg-surface px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-[1336px]">
        <h2 className="text-2xl font-semibold tracking-tight text-kpmg-blue">Locations</h2>
        {mapSrc && cities.length ? (
          <div className="relative mt-6 aspect-video overflow-hidden bg-white">
            {/* The supplied map and its normalized pin coordinates share this view box. */}
            <svg viewBox="0 0 1600 900" className="size-full" role="img" aria-label="Office locations">
              <image href={mapSrc} width="1600" height="900" preserveAspectRatio="none" />
            </svg>
            {cities.map(({ name, x, y }, index) => (
              <button key={name} type="button" aria-label={name} aria-pressed={active === index} onClick={() => setActive(index)}
                className="editorial-location-pin absolute grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-cobalt"
                style={{ left: `${x}%`, top: `${y}%` }}>
                <span className="relative size-3 rounded-full border-2 border-white bg-kpmg-blue" />
              </button>
            ))}
          </div>
        ) : <p className="mt-2 text-muted-ink">Under construction. A verified office map is unavailable.</p>}
      </div>
    </section>
  );
}
