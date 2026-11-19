"use client";

import { SlidersHorizontal } from "@phosphor-icons/react";
import { ConnectedPlatform } from "@/data/platforms";
import { CompanyEntitlement, CompanyProfile } from "@/lib/governance/types";

interface ProductGovernanceTableViewProps {
  products: ConnectedPlatform[];
  companies: CompanyProfile[];
  entitlements: CompanyEntitlement[];
  onManage: (productId: string) => void;
}

export function ProductGovernanceTableView({
  products,
  companies,
  entitlements,
  onManage,
}: ProductGovernanceTableViewProps) {
  const activeCompanyIds = new Set(
    companies.filter((c) => c.status === "active").map((c) => c.id)
  );

  return (
    <div className="overflow-hidden rounded-sm border border-[#D8DFE9] bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[#D8DFE9] bg-[#F8FAFC] font-mono text-[11px] font-semibold uppercase text-[#526075]">
              <th className="py-2.5 px-4 font-semibold">Status</th>
              <th className="py-2.5 px-4 font-semibold">Product Name</th>
              <th className="py-2.5 px-4 font-semibold">Product ID</th>
              <th className="py-2.5 px-4 font-semibold">Entitled Organizations</th>
              <th className="py-2.5 px-4 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8DFE9]">
            {products.map((platform) => {
              const entitledCompaniesCount = entitlements.filter(
                (e) =>
                  e.productId === platform.id &&
                  e.enabled &&
                  activeCompanyIds.has(e.companyId)
              ).length;

              return (
                <tr
                  key={platform.id}
                  className="transition-colors duration-100 hover:bg-[#F8FAFC]"
                >
                  {/* Status Indicator */}
                  <td className="whitespace-nowrap py-3 px-4">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-[#009A44]">
                      <span className="h-2 w-2 rounded-full bg-[#009A44] animate-pulse" />
                      Operational
                    </span>
                  </td>

                  {/* Product Name */}
                  <td className="py-3 px-4">
                    <div
                      onClick={() => onManage(platform.id)}
                      className="cursor-pointer font-sans font-semibold text-[#0C233C] transition-colors hover:text-[#00338D]"
                    >
                      {platform.title}
                    </div>
                  </td>

                  {/* Dedicated Product ID Column */}
                  <td className="whitespace-nowrap py-3 px-4 font-mono text-xs font-semibold text-[#00338D]">
                    {platform.id}
                  </td>

                  {/* Entitled Count */}
                  <td className="whitespace-nowrap py-3 px-4 font-mono text-[11px] text-[#526075]">
                    {entitledCompaniesCount} of {activeCompanyIds.size} Active
                  </td>

                  {/* Actions */}
                  <td className="whitespace-nowrap py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => onManage(platform.id)}
                      title={`Manage client entitlements for ${platform.title}`}
                      aria-label={`Manage client entitlements for ${platform.title}`}
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
