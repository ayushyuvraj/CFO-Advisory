"use client";

import {
  Copy,
  Eye,
  PencilSimple,
  PresentationChart,
  ShareNetwork,
  Trash,
} from "@phosphor-icons/react";
import { DashboardDocument } from "@/lib/dashboards/types";

interface DashboardTableViewProps {
  dashboards: DashboardDocument[];
  canEditDoc: (doc: DashboardDocument) => boolean;
  canManage: boolean;
  isKpmgAdmin: boolean;
  isPreviewMode: boolean;
  onOpen: (docId: string, present?: boolean) => void;
  onShare: (doc: DashboardDocument) => void;
  onDuplicate: (docId: string) => void;
  onDelete: (doc: DashboardDocument) => void;
  renderVisibilityBadge: (doc: DashboardDocument) => React.ReactNode;
}

export function DashboardTableView({
  dashboards,
  canEditDoc,
  canManage,
  isKpmgAdmin,
  isPreviewMode,
  onOpen,
  onShare,
  onDuplicate,
  onDelete,
  renderVisibilityBadge,
}: DashboardTableViewProps) {
  return (
    <div className="overflow-hidden rounded-sm border border-[#D8DFE9] bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[#D8DFE9] bg-[#F8FAFC] font-mono text-[11px] font-semibold uppercase text-[#526075]">
              <th className="py-2.5 px-4">Visibility</th>
              <th className="py-2.5 px-4">Dashboard Name</th>
              <th className="py-2.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8DFE9]">
            {dashboards.map((doc) => {
              const editable = canEditDoc(doc);
              return (
                <tr
                  key={doc.id}
                  className="transition-colors duration-100 hover:bg-[#F8FAFC]"
                >
                  {/* Visibility Badge */}
                  <td className="whitespace-nowrap py-3 px-4">
                    {renderVisibilityBadge(doc)}
                  </td>

                  {/* Title */}
                  <td className="py-3 px-4">
                    <div
                      onClick={() => onOpen(doc.id, false)}
                      className="cursor-pointer font-sans font-semibold text-[#0C233C] transition-colors hover:text-[#00338D]"
                    >
                      {doc.title}
                    </div>
                  </td>

                  {/* Smile Actions */}
                  <td className="whitespace-nowrap py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      {/* Present Fullscreen */}
                      <button
                        type="button"
                        onClick={() => onOpen(doc.id, true)}
                        title={`Present ${doc.title}`}
                        aria-label={`Present ${doc.title}`}
                        className="flex h-7.5 w-7.5 items-center justify-center rounded-sm text-[#526075] transition-all duration-150 hover:bg-[#F4F6FA] hover:text-[#00338D] hover:scale-110 active:scale-[0.92]"
                      >
                        <PresentationChart size={16} weight="bold" />
                      </button>

                      {/* Share Network (KPMG Admin only) */}
                      {isKpmgAdmin && !isPreviewMode && doc.ownerType === "kpmg" && (
                        <button
                          type="button"
                          onClick={() => onShare(doc)}
                          title={`Publish ${doc.title}`}
                          aria-label={`Publish ${doc.title}`}
                          className="flex h-7.5 w-7.5 items-center justify-center rounded-sm text-[#526075] transition-all duration-150 hover:bg-[#F4F6FA] hover:text-[#00338D] hover:scale-110 active:scale-[0.92]"
                        >
                          <ShareNetwork size={16} weight="bold" />
                        </button>
                      )}

                      {/* Duplicate */}
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => onDuplicate(doc.id)}
                          title={`Duplicate ${doc.title}`}
                          aria-label={`Duplicate ${doc.title}`}
                          className="flex h-7.5 w-7.5 items-center justify-center rounded-sm text-[#526075] transition-all duration-150 hover:bg-[#F4F6FA] hover:text-[#00338D] hover:scale-110 active:scale-[0.92]"
                        >
                          <Copy size={16} weight="bold" />
                        </button>
                      )}

                      {/* Delete */}
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => onDelete(doc)}
                          title={`Delete ${doc.title}`}
                          aria-label={`Delete ${doc.title}`}
                          className="flex h-7.5 w-7.5 items-center justify-center rounded-sm text-[#526075] transition-all duration-150 hover:bg-red-50 hover:text-red-700 hover:scale-110 active:scale-[0.92]"
                        >
                          <Trash size={16} weight="bold" />
                        </button>
                      )}

                      {/* Primary Studio/Viewer Open Button */}
                      <button
                        type="button"
                        onClick={() => onOpen(doc.id, false)}
                        title={editable ? "Open Studio" : "Open Viewer"}
                        aria-label={editable ? "Open Studio" : "Open Viewer"}
                        className="flex h-7.5 w-7.5 items-center justify-center rounded-sm bg-[#00338D] text-white shadow-xs transition-all duration-150 hover:bg-[#1E49E2] hover:scale-110 hover:shadow-md active:scale-[0.92]"
                      >
                        {editable ? (
                          <PencilSimple size={16} weight="bold" />
                        ) : (
                          <Eye size={16} weight="bold" />
                        )}
                      </button>
                    </div>
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
