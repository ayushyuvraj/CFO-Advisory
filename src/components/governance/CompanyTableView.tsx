"use client";

import { SlidersHorizontal } from "@phosphor-icons/react";
import {
  CompanyProfile,
  CompanyEntitlement,
  CompanyPersona,
  CompanySpendSummary,
} from "@/lib/governance/types";
import { ConnectedPlatform } from "@/data/platforms";

interface CompanyTableViewProps {
  companies: CompanyProfile[];
  entitlements: CompanyEntitlement[];
  personas?: CompanyPersona[];
  availableProducts: ConnectedPlatform[];
  spendSummary?: Record<string, CompanySpendSummary>;
  onManage: (companyId: string) => void;
}

export function CompanyTableView({
  companies,
  entitlements,
  personas = [],
  availableProducts,
  spendSummary,
  onManage,
}: CompanyTableViewProps) {
  const registeredProductIds = new Set(availableProducts.map((p) => p.id));

  return (
    <div className="overflow-hidden rounded-sm border border-[#D8DFE9] bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[#D8DFE9] bg-[#F8FAFC] font-mono text-[11px] font-semibold uppercase text-[#526075]">
              <th className="py-2.5 px-4 font-semibold">Status</th>
              <th className="py-2.5 px-4 font-semibold">Organization</th>
              <th className="py-2.5 px-4 font-semibold">Code</th>
              <th className="py-2.5 px-4 font-semibold">Entitlements</th>
              <th className="py-2.5 px-4 font-semibold">Budget & Used</th>
              <th className="py-2.5 px-4 text-center font-semibold">Personas</th>
              <th className="py-2.5 px-4 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8DFE9]">
            {companies.map((company) => {
              const isOperational = company.status === "active";
              const enabledCount = entitlements.filter(
                (e) =>
                  e.companyId === company.id &&
                  e.enabled &&
                  registeredProductIds.has(e.productId)
              ).length;
              const personaCount = personas.filter(
                (p) => p.companyId === company.id
              ).length;

              return (
                <tr
                  key={company.id}
                  className="transition-colors duration-100 hover:bg-[#F8FAFC]"
                >
                  {/* Status Indicator */}
                  <td className="whitespace-nowrap py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold ${
                        isOperational ? "text-[#009A44]" : "text-red-700"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isOperational
                            ? "bg-[#009A44] animate-pulse"
                            : "bg-red-600"
                        }`}
                      />
                      {isOperational ? "Active" : "Suspended"}
                    </span>
                  </td>

                  {/* Organization Name (Separate from Code) */}
                  <td className="py-3 px-4">
                    <div
                      onClick={() => onManage(company.id)}
                      className="cursor-pointer font-sans font-semibold text-[#0C233C] transition-colors hover:text-[#00338D]"
                    >
                      {company.name}
                    </div>
                  </td>

                  {/* Dedicated Organization Code Column */}
                  <td className="whitespace-nowrap py-3 px-4 font-mono text-xs font-semibold text-[#00338D]">
                    {company.code}
                  </td>

                  {/* Entitlements Count */}
                  <td className="whitespace-nowrap py-3 px-4 font-mono text-[11px] text-[#526075]">
                    {enabledCount} / {availableProducts.length} Active
                  </td>

                  {/* AI Budget & Used */}
                  <td className="whitespace-nowrap py-3 px-4 font-mono text-[11px]">
                    {company.spendLimit?.enabled ? (
                      <div className="inline-flex items-center gap-1.5">
                        <span className="font-bold text-[#0C233C]">
                          ${(spendSummary?.[company.id]?.spendUsd ?? 0).toFixed(2)}
                        </span>
                        <span className="text-[#9CA3AF]">/</span>
                        <span className="font-semibold text-[#009A44]">
                          ${company.spendLimit.amountUsd.toFixed(2)}
                        </span>
                        <span className="rounded-xs bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] text-[#526075]">
                          {company.spendLimit.period === "custom_days"
                            ? `${company.spendLimit.customDays || 30}d`
                            : company.spendLimit.period}
                        </span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5">
                        <span className="font-bold text-[#0C233C]">
                          ${(spendSummary?.[company.id]?.spendUsd ?? 0).toFixed(2)}
                        </span>
                        <span className="text-[#9CA3AF]">/</span>
                        <span className="rounded-xs bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] text-[#6B7280]">
                          Uncapped
                        </span>
                      </div>
                    )}
                  </td>

                  {/* Dedicated Personas Column */}
                  <td className="whitespace-nowrap py-3 px-4 text-center font-mono text-[11px] text-[#526075]">
                    {personaCount}
                  </td>

                  {/* Actions */}
                  <td className="whitespace-nowrap py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => onManage(company.id)}
                      title={`Manage access and personas for ${company.name}`}
                      aria-label={`Manage access for ${company.name}`}
                      className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-sm bg-[#00338D] text-white shadow-xs transition-all duration-150 hover:bg-[#1E49E2] hover:scale-110 hover:shadow-md active:scale-[0.92]"
                    >
                      <SlidersHorizontal size={16} weight="bold" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
