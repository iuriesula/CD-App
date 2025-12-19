"use client";

import { useDroppable } from "@dnd-kit/core";
import { LeadCardDraggable } from "./lead-card";
import { StageConfig } from "@/types";

interface Lead {
  id: string;
  firstName: string | null;
  lastName: string | null;
  primaryEmail: string | null;
  primaryPhone: string | null;
  interestedVehicle: string | null;
  stage: string;
  source: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo?: {
    id: string;
    name: string;
  } | null;
}

interface PipelineColumnProps {
  stage: StageConfig;
  leads: Lead[];
  isOver: boolean;
}

const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: "bg-blue-100", text: "text-blue-900", border: "border-blue-300" },
  cyan: { bg: "bg-teal-100", text: "text-teal-900", border: "border-teal-300" },
  yellow: { bg: "bg-amber-100", text: "text-amber-900", border: "border-amber-300" },
  orange: { bg: "bg-orange-100", text: "text-orange-900", border: "border-orange-300" },
  purple: { bg: "bg-purple-100", text: "text-purple-900", border: "border-purple-300" },
  pink: { bg: "bg-pink-100", text: "text-pink-900", border: "border-pink-300" },
  green: { bg: "bg-emerald-100", text: "text-emerald-900", border: "border-emerald-300" },
  red: { bg: "bg-red-100", text: "text-red-900", border: "border-red-300" },
  gray: { bg: "bg-slate-100", text: "text-slate-900", border: "border-slate-300" },
};

export function PipelineColumn({ stage, leads }: PipelineColumnProps) {
  const { setNodeRef, isOver: isOverDroppable } = useDroppable({
    id: stage.id,
  });

  const colors = colorClasses[stage.color] || colorClasses.gray;

  return (
    <div
      ref={setNodeRef}
      className={`
        flex-shrink-0 w-72 rounded-lg border-2 transition-colors
        ${isOverDroppable ? "border-blue-500 bg-blue-50" : `${colors.border} bg-white`}
      `}
    >
      <div className={`px-3 py-2.5 rounded-t-md ${colors.bg}`}>
        <div className="flex items-center justify-between">
          <h3 className={`font-semibold ${colors.text}`}>{stage.label}</h3>
          <span className={`text-sm font-medium ${colors.text} bg-white/50 px-2 py-0.5 rounded-full`}>
            {leads.length}
          </span>
        </div>
        <div className="text-xs text-gray-600 mt-1 font-medium">
          {Math.round(stage.winProbability * 100)}% win probability
        </div>
      </div>

      <div className="p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-320px)] overflow-y-auto bg-gray-50/50">
        {leads.map((lead) => (
          <LeadCardDraggable key={lead.id} lead={lead} />
        ))}
        {leads.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            No leads
          </div>
        )}
      </div>
    </div>
  );
}
