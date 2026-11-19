"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import {
  MagnifyingGlass,
  XCircle,
  FunnelSimple,
  ArrowsDownUp,
  Check,
} from "@phosphor-icons/react";

export interface FilterOptionItem {
  id: string;
  label: string;
  count?: number;
}

export interface SortOptionItem {
  id: string;
  label: string;
}

interface UnifiedWorkflowsBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;

  // Filter
  filterOptions?: FilterOptionItem[];
  activeFilter?: string;
  onFilterChange?: (filterId: string) => void;
  filterLabel?: string;

  // Sort
  sortOptions?: SortOptionItem[];
  activeSort?: string;
  onSortChange?: (sortId: string) => void;
  sortLabel?: string;

  // Counter
  countLabel: string;

  // Contextual controls (view mode toggles, CTA buttons, etc.)
  children?: ReactNode;
}

export function UnifiedWorkflowsBar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search...",
  filterOptions,
  activeFilter,
  onFilterChange,
  filterLabel = "Filter",
  sortOptions,
  activeSort,
  onSortChange,
  sortLabel = "Sort",
  countLabel,
  children,
}: UnifiedWorkflowsBarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close popovers on click outside or Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsFilterOpen(false);
        setIsSortOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const hasActiveFilter = Boolean(
    activeFilter &&
    activeFilter !== "all" &&
    activeFilter !== "ALL"
  );

  return (
    <div className="flex flex-col gap-3 rounded-sm border border-[#D8DFE9] bg-white px-2.5 py-2.5 shadow-xs lg:h-[52px] lg:flex-row lg:items-center lg:justify-between lg:py-0 box-border">
      {/* Left: Clean Search Input + Filter & Sort Buttons */}
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {/* Minimalist Search Input */}
        <div className="relative min-w-[220px] max-w-[280px] w-full">
          <MagnifyingGlass
            size={14}
            weight="bold"
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#526075]"
          />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-[30px] w-full rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] py-0 pl-8 pr-8 text-xs text-[#0C233C] placeholder-[#526075] transition-all duration-150 focus:border-[#0C233C] focus:bg-white focus:outline-none box-border"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                onSearchChange("");
                searchInputRef.current?.focus();
              }}
              title="Clear search"
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#526075] hover:text-[#0C233C]"
            >
              <XCircle size={14} weight="fill" />
            </button>
          )}
        </div>

        {/* Filter Popover Button */}
        {filterOptions && filterOptions.length > 0 && onFilterChange && (
          <div ref={filterRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setIsFilterOpen((prev) => !prev);
                setIsSortOpen(false);
              }}
              aria-expanded={isFilterOpen}
              aria-label="Filter records"
              className={`inline-flex h-[30px] items-center gap-1.5 rounded-sm border px-2.5 py-0 text-xs font-medium transition-all duration-150 active:scale-[0.98] box-border ${
                hasActiveFilter || isFilterOpen
                  ? "border-[#0C233C] bg-[#F1F5F9] text-[#0C233C] font-semibold"
                  : "border-[#D8DFE9] bg-[#F8FAFC] text-[#333940] hover:bg-[#F1F5F9] hover:text-[#0C233C]"
              }`}
            >
              <FunnelSimple size={14} weight="bold" />
              <span>{filterLabel}</span>
              {hasActiveFilter && (
                <span className="h-1.5 w-1.5 rounded-full bg-[#0C233C]" />
              )}
            </button>

            {isFilterOpen && (
              <div className="absolute left-0 top-full z-30 mt-1.5 w-52 rounded-sm border border-[#D8DFE9] bg-white p-1.5 shadow-lg">
                <div className="px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#526075]">
                  Filter by
                </div>
                <div className="space-y-0.5">
                  {filterOptions.map((opt) => {
                    const isSelected = activeFilter === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          onFilterChange(opt.id);
                          setIsFilterOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-xs px-2 py-1.5 text-xs transition-colors duration-100 ${
                          isSelected
                            ? "bg-[#F1F5F9] font-semibold text-[#0C233C]"
                            : "text-[#333940] hover:bg-[#F8FAFC] hover:text-[#0C233C]"
                        }`}
                      >
                        <span className="truncate">{opt.label}</span>
                        {isSelected && (
                          <Check size={13} weight="bold" className="shrink-0 text-[#0C233C]" />
                        )}
                        {opt.count !== undefined && !isSelected && (
                          <span className="font-mono text-[10px] text-[#526075]">
                            {opt.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sort Popover Button */}
        {sortOptions && sortOptions.length > 0 && onSortChange && (
          <div ref={sortRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setIsSortOpen((prev) => !prev);
                setIsFilterOpen(false);
              }}
              aria-expanded={isSortOpen}
              aria-label="Sort records"
              className={`inline-flex h-[30px] items-center gap-1.5 rounded-sm border px-2.5 py-0 text-xs font-medium transition-all duration-150 active:scale-[0.98] box-border ${
                isSortOpen
                  ? "border-[#0C233C] bg-[#F1F5F9] text-[#0C233C] font-semibold"
                  : "border-[#D8DFE9] bg-[#F8FAFC] text-[#333940] hover:bg-[#F1F5F9] hover:text-[#0C233C]"
              }`}
            >
              <ArrowsDownUp size={14} weight="bold" />
              <span>{sortLabel}</span>
            </button>

            {isSortOpen && (
              <div className="absolute left-0 top-full z-30 mt-1.5 w-52 rounded-sm border border-[#D8DFE9] bg-white p-1.5 shadow-lg">
                <div className="px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#526075]">
                  Sort by
                </div>
                <div className="space-y-0.5">
                  {sortOptions.map((opt) => {
                    const isSelected = activeSort === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          onSortChange(opt.id);
                          setIsSortOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-xs px-2 py-1.5 text-xs transition-colors duration-100 ${
                          isSelected
                            ? "bg-[#F1F5F9] font-semibold text-[#0C233C]"
                            : "text-[#333940] hover:bg-[#F8FAFC] hover:text-[#0C233C]"
                        }`}
                      >
                        <span className="truncate">{opt.label}</span>
                        {isSelected && (
                          <Check size={13} weight="bold" className="shrink-0 text-[#0C233C]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Live Count Badge + Custom Actions */}
      <div className="flex items-center justify-between gap-3 lg:justify-end">
        {/* Count Badge */}
        <span className="font-mono text-xs text-[#526075]">
          {countLabel}
        </span>

        {/* Optional Right Action Controls (View Mode, CTA buttons, etc.) */}
        {children && (
          <div className="flex items-center gap-2">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
