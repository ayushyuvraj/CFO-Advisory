"use client";

import { useState, useRef, useEffect, useMemo, ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
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

export interface FilterCategoryGroup {
  id: string;
  label: string;
  icon?: ReactNode;
  options: FilterOptionItem[];
  activeValue: string;
  onChange: (value: string) => void;
  defaultId?: string;
  searchable?: boolean;
}

export interface UnifiedWorkflowsBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;

  // Multi-Category Filter Groups (Primary pattern)
  filterGroups?: FilterCategoryGroup[];

  // Single Filter (Backward compatibility for simpler views)
  filterOptions?: FilterOptionItem[];
  activeFilter?: string;
  onFilterChange?: (filterId: string) => void;
  filterLabel?: string;
  filterIcon?: ReactNode;

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
  filterGroups,
  filterOptions,
  activeFilter,
  onFilterChange,
  filterLabel = "Filter",
  filterIcon,
  sortOptions,
  activeSort,
  onSortChange,
  sortLabel = "Sort",
  countLabel,
  children,
}: UnifiedWorkflowsBarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");

  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalize single vs multi-category filter groups
  const effectiveFilterGroups = useMemo<FilterCategoryGroup[]>(() => {
    if (filterGroups && filterGroups.length > 0) {
      return filterGroups;
    }
    if (filterOptions && filterOptions.length > 0 && onFilterChange) {
      return [
        {
          id: "default",
          label: filterLabel,
          options: filterOptions,
          activeValue: activeFilter || "all",
          onChange: onFilterChange,
          defaultId: "all",
        },
      ];
    }
    return [];
  }, [filterGroups, filterOptions, onFilterChange, filterLabel, activeFilter]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const activeCategoryId = useMemo(() => {
    if (effectiveFilterGroups.length === 0) return "";
    if (
      selectedCategoryId &&
      effectiveFilterGroups.some((g) => g.id === selectedCategoryId)
    ) {
      return selectedCategoryId;
    }
    return effectiveFilterGroups[0].id;
  }, [effectiveFilterGroups, selectedCategoryId]);

  const activeGroup = useMemo(() => {
    return (
      effectiveFilterGroups.find((g) => g.id === activeCategoryId) ||
      effectiveFilterGroups[0] ||
      null
    );
  }, [effectiveFilterGroups, activeCategoryId]);

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

  const isGroupActive = (group: FilterCategoryGroup) => {
    const def = group.defaultId ?? "all";
    return Boolean(
      group.activeValue &&
        group.activeValue !== def &&
        group.activeValue !== "ALL" &&
        group.activeValue !== "all"
    );
  };

  const activeGroupsCount = effectiveFilterGroups.filter(isGroupActive).length;
  const hasActiveFilter = activeGroupsCount > 0;

  const visibleOptions = useMemo(() => {
    if (!activeGroup) return [];
    if (!categorySearchQuery.trim()) return activeGroup.options;
    const q = categorySearchQuery.toLowerCase().trim();
    return activeGroup.options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [activeGroup, categorySearchQuery]);

  return (
    <div className="flex flex-col gap-3 rounded-sm border border-[#D8DFE9] bg-white px-2.5 py-2.5 shadow-xs lg:h-[52px] lg:flex-row lg:items-center lg:justify-between lg:py-0 box-border">
      {/* Left: Clean Search Input + Single Filter & Sort Buttons */}
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

        {/* Primary Single Filter Popover Button */}
        {effectiveFilterGroups.length > 0 && (
          <div ref={filterRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setIsFilterOpen((prev) => !prev);
                setIsSortOpen(false);
                setCategorySearchQuery("");
              }}
              aria-expanded={isFilterOpen}
              aria-label="Filter records"
              className={`inline-flex h-[30px] items-center gap-1.5 rounded-sm border px-2.5 py-0 text-xs font-medium transition-all duration-150 active:scale-[0.98] box-border ${
                hasActiveFilter || isFilterOpen
                  ? "border-[#00338D] bg-[#F1F5F9] text-[#00338D] font-semibold"
                  : "border-[#D8DFE9] bg-[#F8FAFC] text-[#333940] hover:bg-[#F1F5F9] hover:text-[#0C233C]"
              }`}
            >
              {filterIcon || <FunnelSimple size={14} weight="bold" />}
              <span>{filterLabel}</span>
              {hasActiveFilter && (
                <span
                  className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#00338D] px-1 text-[10px] font-bold text-white"
                  title={`${activeGroupsCount} active filter criteria`}
                >
                  {activeGroupsCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {isFilterOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -4 }}
                  transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                  className={`absolute left-0 top-full z-30 mt-1.5 overflow-hidden rounded-sm border border-[#D8DFE9] bg-white shadow-lg ${
                    effectiveFilterGroups.length > 1 ? "w-64 sm:w-72" : "w-52"
                  }`}
                >
                  {/* Category Switcher Tabs (Rendered when multiple categories exist) */}
                  {effectiveFilterGroups.length > 1 && (
                    <div className="border-b border-[#D8DFE9] bg-[#F8FAFC] p-1.5">
                      <div className="flex items-center gap-1 rounded-sm border border-[#D8DFE9] bg-[#EEF2F6] p-0.5">
                        {effectiveFilterGroups.map((group) => {
                          const isSelected = group.id === activeGroup?.id;
                          const active = isGroupActive(group);
                          const activeOption = group.options.find(
                            (o) => o.id === group.activeValue
                          );
                          return (
                            <button
                              key={group.id}
                              type="button"
                              onClick={() => {
                                setSelectedCategoryId(group.id);
                                setCategorySearchQuery("");
                              }}
                              className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-xs px-2 py-1 text-[11px] font-semibold transition-all ${
                                isSelected
                                  ? "bg-white text-[#00338D] shadow-xs"
                                  : "text-[#526075] hover:text-[#0C233C]"
                              }`}
                            >
                              {group.icon}
                              <span className="truncate">{group.label}</span>
                              {active && (
                                <span
                                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#00338D]"
                                  title={`Filtered: ${activeOption?.label || group.activeValue}`}
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Single Group Header (When only 1 category exists) */}
                  {effectiveFilterGroups.length === 1 && (
                    <div className="border-b border-[#D8DFE9] bg-[#F8FAFC] px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#526075]">
                      Filter by {effectiveFilterGroups[0].label}
                    </div>
                  )}

                  {/* In-category Search Input (Enabled if searchable or >6 options) */}
                  {activeGroup &&
                    (activeGroup.searchable || activeGroup.options.length > 6) && (
                      <div className="border-b border-[#D8DFE9] bg-white px-2 py-1.5">
                        <div className="relative">
                          <MagnifyingGlass
                            size={12}
                            weight="bold"
                            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[#526075]"
                          />
                          <input
                            type="text"
                            value={categorySearchQuery}
                            onChange={(e) => setCategorySearchQuery(e.target.value)}
                            placeholder={`Filter ${activeGroup.label.toLowerCase()}...`}
                            className="h-[24px] w-full rounded-xs border border-[#D8DFE9] bg-[#F8FAFC] py-0 pl-6 pr-6 text-[11px] text-[#0C233C] placeholder-[#526075] focus:border-[#00338D] focus:bg-white focus:outline-none"
                          />
                          {categorySearchQuery && (
                            <button
                              type="button"
                              onClick={() => setCategorySearchQuery("")}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#526075] hover:text-[#0C233C]"
                            >
                              <XCircle size={12} weight="fill" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                  {/* Options List */}
                  <div className="max-h-[220px] space-y-0.5 overflow-y-auto p-1">
                    {visibleOptions.length === 0 ? (
                      <div className="px-2 py-3 text-center text-[11px] text-[#526075]">
                        No matching {activeGroup?.label.toLowerCase() || "options"}
                      </div>
                    ) : (
                      visibleOptions.map((opt) => {
                        const isSelected = activeGroup?.activeValue === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              activeGroup?.onChange(opt.id);
                            }}
                            className={`flex w-full items-center justify-between rounded-xs px-2.5 py-1.5 text-xs transition-colors duration-100 ${
                              isSelected
                                ? "bg-[#F1F5F9] font-semibold text-[#00338D]"
                                : "text-[#333940] hover:bg-[#F8FAFC] hover:text-[#0C233C]"
                            }`}
                          >
                            <span className="truncate pr-2">{opt.label}</span>
                            {isSelected ? (
                              <Check
                                size={13}
                                weight="bold"
                                className="shrink-0 text-[#00338D]"
                              />
                            ) : opt.count !== undefined ? (
                              <span className="font-mono text-[10px] text-[#526075]">
                                {opt.count}
                              </span>
                            ) : null}
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Popover Footer: Reset & Done Actions */}
                  <div className="flex items-center justify-between border-t border-[#D8DFE9] bg-[#F8FAFC] px-2.5 py-1.5 text-[11px]">
                    {hasActiveFilter ? (
                      <button
                        type="button"
                        onClick={() => {
                          effectiveFilterGroups.forEach((g) => {
                            g.onChange(g.defaultId ?? "all");
                          });
                        }}
                        className="font-medium text-[#00338D] hover:underline"
                      >
                        Reset all filters
                      </button>
                    ) : (
                      <span className="text-[#526075]">No filters applied</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsFilterOpen(false)}
                      className="rounded-xs border border-[#D8DFE9] bg-white px-2 py-0.5 font-medium text-[#333940] hover:bg-[#F1F5F9] hover:text-[#0C233C]"
                    >
                      Done
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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

            <AnimatePresence>
              {isSortOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -4 }}
                  transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                  className="absolute left-0 top-full z-30 mt-1.5 w-52 rounded-sm border border-[#D8DFE9] bg-white p-1.5 shadow-lg"
                >
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
                            <Check
                              size={13}
                              weight="bold"
                              className="shrink-0 text-[#0C233C]"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Right: Live Count Badge + Custom Actions */}
      <div className="flex items-center justify-between gap-3 lg:justify-end">
        {/* Count Badge */}
        <span className="font-mono text-xs text-[#526075] whitespace-nowrap">
          {countLabel}
        </span>

        {/* Optional Right Action Controls (View Mode, CTA buttons, etc.) */}
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}
