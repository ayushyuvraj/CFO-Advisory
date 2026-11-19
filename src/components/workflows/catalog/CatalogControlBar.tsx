"use client";

import {
  GridFour,
  List,
} from "@phosphor-icons/react";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import {
  UnifiedWorkflowsBar,
  FilterOptionItem,
  SortOptionItem,
} from "../UnifiedWorkflowsBar";

export type StatusFilterOption = "all" | "active" | "maintenance" | "offline";
export type SortOption = "name-asc" | "name-desc" | "status";

const CATALOG_FILTER_OPTIONS: FilterOptionItem[] = [
  { id: "all", label: "All Statuses" },
  { id: "active", label: "Operational" },
  { id: "maintenance", label: "Maintenance" },
  { id: "offline", label: "Offline" },
];

const CATALOG_SORT_OPTIONS: SortOptionItem[] = [
  { id: "name-asc", label: "Name (A → Z)" },
  { id: "name-desc", label: "Name (Z → A)" },
  { id: "status", label: "Operational Status" },
];

interface CatalogControlBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: StatusFilterOption;
  onStatusFilterChange: (status: StatusFilterOption) => void;
  sortBy: SortOption;
  onSortByChange: (sort: SortOption) => void;
  viewMode: "grid" | "table";
  onViewModeChange: (mode: "grid" | "table") => void;
  filteredCount: number;
  totalCount: number;
  isKpmgAdmin: boolean;
  onOpenAddModal: () => void;
}

export function CatalogControlBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  viewMode,
  onViewModeChange,
  filteredCount,
  isKpmgAdmin,
  onOpenAddModal,
}: CatalogControlBarProps) {
  return (
    <UnifiedWorkflowsBar
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search platforms, integrations, tags..."
      filterOptions={CATALOG_FILTER_OPTIONS}
      activeFilter={statusFilter}
      onFilterChange={(id) => onStatusFilterChange(id as StatusFilterOption)}
      filterLabel="Filter"
      sortOptions={CATALOG_SORT_OPTIONS}
      activeSort={sortBy}
      onSortChange={(id) => onSortByChange(id as SortOption)}
      sortLabel="Sort"
      countLabel={`${filteredCount} ${filteredCount === 1 ? "platform" : "platforms"}`}
    >
      {/* View Switcher: Grid vs Table */}
      <div className="flex items-center rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] p-0.5">
        <button
          type="button"
          onClick={() => onViewModeChange("grid")}
          title="Grid view"
          aria-label="Grid view"
          aria-pressed={viewMode === "grid"}
          className={`flex h-7 w-7 items-center justify-center rounded-xs transition-colors duration-100 ${
            viewMode === "grid"
              ? "bg-white text-[#0C233C] shadow-xs font-bold"
              : "text-[#526075] hover:text-[#0C233C]"
          }`}
        >
          <GridFour size={15} weight={viewMode === "grid" ? "bold" : "regular"} />
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange("table")}
          title="Table view"
          aria-label="Table view"
          aria-pressed={viewMode === "table"}
          className={`flex h-7 w-7 items-center justify-center rounded-xs transition-colors duration-100 ${
            viewMode === "table"
              ? "bg-white text-[#0C233C] shadow-xs font-bold"
              : "text-[#526075] hover:text-[#0C233C]"
          }`}
        >
          <List size={15} weight={viewMode === "table" ? "bold" : "regular"} />
        </button>
      </div>

      {/* Primary CTA: Add Product (Preserved Animation) */}
      {isKpmgAdmin && (
        <InteractiveHoverButton
          onClick={onOpenAddModal}
          text="Add Product"
          className="h-8 min-w-[125px] text-xs font-medium"
        />
      )}
    </UnifiedWorkflowsBar>
  );
}
