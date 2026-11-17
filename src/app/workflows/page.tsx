"use client";

import {
  ArrowRight,
  ArrowSquareOut,
  CheckCircle,
  Cpu,
  Database,
  LockKey,
  ShieldCheck,
  Sparkle,
} from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { CONNECTED_PLATFORMS, type ConnectedPlatform } from "@/data/platforms";
import { AmbientLedgerGridCanvas } from "@/components/three/AmbientLedgerGridCanvas";

function WorkflowsSkeleton() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 pt-28 pb-20 sm:px-6 lg:px-8">
      <div className="h-28 w-full animate-pulse rounded-sm border border-[#D8DFE9] bg-[#F4F6FA]" />
      <div className="mt-8 grid grid-cols-1 gap-6">
        <div className="h-96 animate-pulse rounded-sm border border-[#D8DFE9] bg-[#F4F6FA]" />
      </div>
    </div>
  );
}

export default function WorkflowsPage() {
  const { user, isLoading, openLogin } = useAuth();

  if (isLoading) {
    return <WorkflowsSkeleton />;
  }

  if (!user) {
    return (
      <section className="flex min-h-[100dvh] items-center justify-center bg-[#F8FAFC] px-4 pt-24 pb-16">
        <div className="w-full max-w-lg rounded-sm border border-[#D8DFE9] bg-white p-8 shadow-lg sm:p-10">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-[#D8DFE9] bg-[#F4F6FA] text-[#00338D]">
            <LockKey size={20} weight="light" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-[#0C233C]">
            Protected Advisory Workspace
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#4B5563]">
            Authenticate with your designated KPMG Lead credentials to access the
            CFO Advisory Connected Platforms and enterprise execution suites.
          </p>
          <button
            type="button"
            onClick={openLogin}
            className="mt-7 inline-flex items-center gap-2 rounded-sm bg-[#00338D] px-5 py-2.5 text-sm font-medium text-white whitespace-nowrap transition-[background-color,transform] duration-150 hover:bg-[#1E49E2] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2]"
          >
            <span>Sign in as KPMG Lead</span>
            <ArrowRight size={16} weight="light" />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-[100dvh] bg-[#F8FAFC] px-4 pt-28 pb-20 sm:px-6 lg:px-8">
      <AmbientLedgerGridCanvas />

      <div className="relative z-10 mx-auto max-w-[1400px]">
        {/* Executive Header Banner */}
        <div className="flex flex-col justify-between gap-6 rounded-sm border border-[#D8DFE9] bg-white/95 p-6 shadow-sm backdrop-blur-xl sm:p-8 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-sm border border-[#009A44]/30 bg-[#009A44]/10 px-2.5 py-1 font-mono text-xs font-medium text-[#009A44]">
                <span className="h-2 w-2 rounded-full bg-[#009A44] animate-pulse" aria-hidden="true" />
                SYSTEM ONLINE · 100% OPERATIONAL
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-sm border border-[#1E49E2]/30 bg-[#1E49E2]/10 px-2.5 py-1 font-mono text-xs font-medium text-[#00338D]">
                <ShieldCheck size={14} weight="bold" />
                {user.badge}
              </span>
            </div>

            <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#0C233C] sm:text-3xl">
              CFO Advisory — Connected Platforms Hub
            </h1>
            <p className="mt-1.5 text-sm text-[#4B5563]">
              Active session for{" "}
              <span className="font-semibold text-[#0C233C]">{user.name}</span> · {user.role}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-sm border border-[#D8DFE9] bg-[#F4F6FA] px-4 py-2.5 text-right">
              <p className="font-mono text-xs font-semibold text-[#00338D]">
                {CONNECTED_PLATFORMS.length} Connected Platform{CONNECTED_PLATFORMS.length > 1 ? "s" : ""}
              </p>
              <p className="text-[11px] text-[#4B5563]">1-Click Seamless Launch</p>
            </div>
          </div>
        </div>

        {/* Section Heading */}
        <div className="mt-10 flex items-center justify-between border-b border-[#D8DFE9] pb-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-[#0C233C]">
              Enterprise Solution Catalog
            </h2>
            <p className="text-xs text-[#4B5563]">
              Autonomous execution engines and advisory platforms attached to this CFO workspace.
            </p>
          </div>
        </div>

        {/* Platforms Grid */}
        <div className="mt-6 grid grid-cols-1 gap-6">
          {CONNECTED_PLATFORMS.map((platform: ConnectedPlatform) => (
            <div
              key={platform.id}
              className="relative overflow-hidden rounded-sm border border-[#D8DFE9] bg-white shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-[#00338D] hover:shadow-md"
            >
              <div className="border-b border-[#D8DFE9] bg-[#F8FAFC] px-6 py-4 sm:px-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#009A44] animate-pulse" />
                    <span className="font-mono text-xs font-semibold text-[#009A44] uppercase tracking-wider">
                      Platform Live · Port {platform.portFrontend}
                    </span>
                    {platform.portBackend && (
                      <span className="rounded-sm border border-[#D8DFE9] bg-white px-2 py-0.5 font-mono text-[11px] text-[#4B5563]">
                        FastAPI :{platform.portBackend}
                      </span>
                    )}
                  </div>
                  <span className="rounded-sm border border-[#D8DFE9] bg-white px-2.5 py-0.5 font-mono text-xs font-medium text-[#00338D]">
                    {platform.category}
                  </span>
                </div>
              </div>

              <div className="p-6 sm:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-sm bg-[#00338D]/10 text-[#00338D]">
                        <Cpu size={24} weight="bold" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold tracking-tight text-[#0C233C] sm:text-2xl">
                          {platform.title}
                        </h3>
                        <p className="font-mono text-xs text-[#1E49E2]">
                          System Identifier: {platform.id}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm leading-relaxed text-[#333940]">
                      {platform.description}
                    </p>

                    <div className="rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] p-4">
                      <h4 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[#0C233C] uppercase">
                        <Sparkle size={14} weight="bold" className="text-[#00338D]" />
                        Core Platform Capabilities
                      </h4>
                      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {platform.features.map((feature, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-[#333940]">
                            <CheckCircle size={15} weight="fill" className="mt-0.5 shrink-0 text-[#009A44]" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 text-xs text-[#4B5563]">
                      <Database size={15} weight="bold" className="text-[#00338D]" />
                      <span className="font-medium text-[#0C233C]">Integrated Systems:</span>
                      <span className="font-mono">{platform.systemIntegration}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {platform.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-sm border border-[#D8DFE9] bg-[#F4F6FA] px-2.5 py-1 font-mono text-[11px] text-[#333940]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 1-Click Launch Action Column */}
                  <div className="flex w-full shrink-0 flex-col gap-3 rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] p-6 lg:w-72">
                    <div className="space-y-1">
                      <p className="font-mono text-xs font-semibold text-[#0C233C] uppercase tracking-wider">
                        One-Click Access
                      </p>
                      <p className="text-xs text-[#4B5563]">
                        Launches the live platform directly in a new browser tab.
                      </p>
                    </div>

                    <a
                      href={platform.launchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-[#00338D] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-[background-color,transform] duration-150 hover:bg-[#1E49E2] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2] focus-visible:ring-offset-2"
                    >
                      <span>Launch Platform</span>
                      <ArrowSquareOut size={18} weight="bold" />
                    </a>

                    {platform.portBackend && (
                      <a
                        href={`http://localhost:${platform.portBackend}/docs`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-sm border border-[#D8DFE9] bg-white px-3 py-2 text-xs font-medium text-[#333940] transition-[border-color,color] duration-150 hover:border-[#00338D] hover:text-[#00338D]"
                      >
                        <span>Backend API Docs</span>
                        <ArrowSquareOut size={13} weight="light" />
                      </a>
                    )}

                    <div className="border-t border-[#D8DFE9] pt-3 text-center">
                      <p className="font-mono text-[11px] text-[#4B5563]">
                        Target: {platform.launchUrl}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
