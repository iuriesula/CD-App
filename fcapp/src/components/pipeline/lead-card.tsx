"use client";

import { useDraggable } from "@dnd-kit/core";
import { differenceInDays } from "date-fns";
import Link from "next/link";

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

interface LeadCardProps {
  lead: Lead;
  isDragging?: boolean;
}

const sourceLabels: Record<string, { icon: string; label: string }> = {
  meta_ad: { icon: "📱", label: "Meta Ad" },
  website_form: { icon: "🌐", label: "Website" },
  phone_call: { icon: "📞", label: "Phone" },
  walk_in: { icon: "🚶", label: "Walk-in" },
  referral: { icon: "👥", label: "Referral" },
  email: { icon: "✉️", label: "Email" },
};

export function LeadCard({ lead, isDragging }: LeadCardProps) {
  const name = lead.firstName || lead.lastName
    ? `${lead.firstName || ""} ${lead.lastName || ""}`.trim()
    : lead.primaryEmail || lead.primaryPhone || "Unknown";

  const daysInStage = differenceInDays(new Date(), new Date(lead.updatedAt));
  const source = lead.source ? sourceLabels[lead.source] : null;

  return (
    <div
      className={`
        bg-white rounded-lg border border-gray-200 p-3 shadow-sm
        ${isDragging ? "shadow-lg ring-2 ring-blue-500" : "hover:shadow-md hover:border-gray-300"}
        transition-all cursor-grab active:cursor-grabbing
      `}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <Link
          href={`/leads/${lead.id}`}
          className="font-semibold text-gray-900 hover:text-blue-600 line-clamp-1"
          onClick={(e) => e.stopPropagation()}
        >
          {name}
        </Link>
        {source && (
          <span
            className="flex-shrink-0 text-base"
            title={source.label}
            role="img"
            aria-label={source.label}
          >
            {source.icon}
          </span>
        )}
      </div>

      {lead.interestedVehicle && (
        <p className="text-sm text-gray-600 line-clamp-1 mb-2">
          {lead.interestedVehicle}
        </p>
      )}

      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500 font-medium">
          {daysInStage === 0 ? "Today" : `${daysInStage}d ago`}
        </span>
        {lead.assignedTo && (
          <span
            className="text-gray-500 truncate max-w-[80px] font-medium"
            title={lead.assignedTo.name}
          >
            {lead.assignedTo.name.split(" ")[0]}
          </span>
        )}
      </div>
    </div>
  );
}

export function LeadCardDraggable({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <LeadCard lead={lead} isDragging={isDragging} />
    </div>
  );
}
