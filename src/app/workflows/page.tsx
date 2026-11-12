"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Clock,
  LockKey,
  MagnifyingGlass,
  SlidersHorizontal,
} from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import {
  WORKFLOWS,
  WORKFLOW_PILLARS,
  type WorkflowItem,
  type WorkflowPillar,
} from "@/data/workflows";
import { WorkflowDrawer } from "@/components/workflows/WorkflowDrawer";
import { AmbientLedgerGridCanvas } from "@/components/three/AmbientLedgerGridCanvas";

function WorkflowsSkeleton() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 pt-28 pb-20 sm:px-6 lg:px-8">
      <div className="h-24 w-full animate-pulse rounded-sm border border-[#162447] bg-[#0B1736]" />
      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-64 animate-pulse rounded-sm border border-[#162447] bg-[#0B1736]"
          />
        ))}
      </div>
    </div>
  );
}

export default function WorkflowsPage() {
  const { user, isLoading, openLogin } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activePillar, setActivePillar] = useState<"All" | WorkflowPillar>(
    "All"
  );
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowItem | null>(
    null
  );

  const filteredWorkflows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return WORKFLOWS.filter((wf) => {
      const matchesPillar =
        activePillar === "All" || wf.pillar === activePillar;
      const matchesQuery =
        !query ||
        wf.title.toLowerCase().includes(query) ||
        wf.id.toLowerCase().includes(query) ||
        wf.pillar.toLowerCase().includes(query) ||
        wf.sourceSystems.some((s) => s.toLowerCase().includes(query));
      return matchesPillar && matchesQuery;
    });
  }, [searchQuery, activePillar]);

  if (isLoading) {
    return <WorkflowsSkeleton />;
  }

  if (!user) {
    return (
      <section className="flex min-h-[100dvh] items-center justify-center px-4 pt-24 pb-16">
        <div className="w-full max-w-lg rounded-sm border border-[#162447] bg-[#0B1736] p-8 sm:p-10">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-[#162447] bg-[#07112B] text-[#1E6BFF]">
            <LockKey size={20} weight="light" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-[#F4F7FB]">
            Protected Advisory Workspace
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#CBD5E1]">
            Authenticate with KPMG Enterprise SSO, your advisory email, or a
            client engagement token to inspect live Workflow Studio blueprints
            and lineage trails.
          </p>
          <button
            type="button"
            onClick={openLogin}
            className="mt-7 inline-flex items-center gap-2 rounded-sm bg-[#1E6BFF] px-5 py-2.5 text-sm font-medium text-white whitespace-nowrap transition-[background-color,transform] duration-150 hover:bg-[#1557D6] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6BFF]"
          >
            <span>Sign in to Workflows</span>
            <ArrowRight size={16} weight="light" />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-[100dvh] bg-[#030816] px-4 pt-28 pb-20 sm:px-6 lg:px-8">
      <AmbientLedgerGridCanvas />
      <div className="relative z-10 mx-auto max-w-[1400px]">
        <div className="flex flex-col justify-between gap-6 rounded-sm border border-[#162447]/90 bg-[#0B1736]/82 p-6 backdrop-blur-xl sm:p-8 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-sm border border-[#1E6BFF]/40 bg-[#1E6BFF]/10 px-2.5 py-1 font-mono text-xs text-[#7FB0FF]">
                <span
                  className="h-1.5 w-1.5 rounded-sm bg-[#1E6BFF]"
                  aria-hidden="true"
                />
                Synced with Workflow Studio
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-sm border border-[#10B981]/35 bg-[#10B981]/10 px-2.5 py-1 font-mono text-xs text-[#10B981]">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-[#10B981]"
                  aria-hidden="true"
                />
                Δ 0.00 VERIFIED
              </span>
              <span className="rounded-sm border border-[#162447] bg-[#07112B] px-2.5 py-1 font-mono text-xs text-[#CBD5E1]">
                {user.badge}
              </span>
            </div>

            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[#F4F7FB] sm:text-3xl">
              CFO Advisory Workflows Hub
            </h1>
            <p className="mt-1.5 text-sm text-[#CBD5E1]">
              Active session for{" "}
              <span className="font-medium text-[#F4F7FB]">{user.name}</span> (
              {user.role})
            </p>
          </div>

          <div className="w-full lg:max-w-xs">
            <label
              htmlFor="workflow-search"
              className="mb-2 block text-xs font-medium text-[#CBD5E1]"
            >
              Search workflows or source systems
            </label>
            <div className="relative">
              <MagnifyingGlass
                size={16}
                weight="light"
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#7E91B3]"
              />
              <input
                id="workflow-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="SAP, Kyriba, CSRD..."
                className="w-full rounded-sm border border-[#162447] bg-[#07112B] py-2 pr-3 pl-9 text-sm text-[#F4F7FB] placeholder:text-[#7E91B3] transition-colors duration-150 focus:border-[#1E6BFF] focus:outline-none focus:ring-1 focus:ring-[#1E6BFF]"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="mr-1 inline-flex items-center gap-1.5 text-xs text-[#7E91B3]">
            <SlidersHorizontal size={15} weight="light" />
            <span>Pillar:</span>
          </span>
          {WORKFLOW_PILLARS.map((pillar) => {
            const active = activePillar === pillar;
            return (
              <button
                key={pillar}
                type="button"
                onClick={() => setActivePillar(pillar)}
                className={`rounded-sm px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6BFF] ${
                  active
                    ? "bg-[#1E6BFF] text-white"
                    : "border border-[#162447] bg-[#07112B] text-[#CBD5E1] hover:border-white/20 hover:text-[#F4F7FB]"
                }`}
              >
                {pillar}
              </button>
            );
          })}
        </div>

        {filteredWorkflows.length === 0 ? (
          <div className="mt-8 rounded-sm border border-[#162447] bg-[#0B1736] p-10 text-center">
            <p className="text-base font-semibold text-[#F4F7FB]">
              No matching workflows found
            </p>
            <p className="mt-2 text-sm text-[#CBD5E1]">
              Adjust your search query or reset the active practice pillar
              filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setActivePillar("All");
              }}
              className="mt-5 rounded-sm border border-[#162447] bg-[#07112B] px-4 py-2 text-sm font-medium text-[#F4F7FB] transition-colors duration-150 hover:border-[#1E6BFF] active:scale-[0.98]"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredWorkflows.map((wf) => (
              <button
                key={wf.id}
                type="button"
                onClick={() => setSelectedWorkflow(wf)}
                className="group flex flex-col justify-between rounded-sm border border-[#162447]/90 bg-[#0B1736]/82 p-6 text-left backdrop-blur-xl transition-[border-color,background-color,transform] duration-150 hover:border-[#1E6BFF]/70 hover:bg-[#0D1C42]/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6BFF]"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-[#7FB0FF]">
                      {wf.id}
                    </span>
                    <span className="rounded-sm border border-[#162447] bg-[#07112B] px-2 py-0.5 font-mono text-xs text-[#CBD5E1]">
                      {wf.status}
                    </span>
                  </div>

                  <h2 className="mt-4 text-lg font-semibold tracking-tight text-[#F4F7FB]">
                    {wf.title}
                  </h2>
                  <p className="mt-1 text-xs font-medium text-[#7E91B3]">
                    {wf.pillar}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-[#CBD5E1]">
                    {wf.executiveSummary}
                  </p>
                </div>

                <div className="mt-6 w-full border-t border-[#162447] pt-4">
                  <div className="flex flex-wrap gap-1.5">
                    {wf.sourceSystems.map((sys) => (
                      <span
                        key={sys}
                        className="rounded-sm border border-[#162447] bg-[#07112B] px-2.5 py-1 font-mono text-[11px] text-[#CBD5E1]"
                      >
                        {sys}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2 text-xs text-[#7E91B3]">
                    <span className="inline-flex items-center gap-1.5 font-mono">
                      <Clock size={14} weight="light" className="text-[#1E6BFF]" />
                      {wf.lastRunAt}
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium text-[#7FB0FF] transition-transform duration-150 group-hover:translate-x-0.5">
                      <span>Inspect lineage</span>
                      <ArrowRight size={14} weight="light" />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <WorkflowDrawer
        workflow={selectedWorkflow}
        onClose={() => setSelectedWorkflow(null)}
      />
    </section>
  );
}
