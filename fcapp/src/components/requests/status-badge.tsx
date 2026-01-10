import { Badge } from "@/components/ui/badge";
import type { RequestStatus } from "@prisma/client";

interface StatusBadgeProps {
  status: RequestStatus;
}

const statusConfig: Record<RequestStatus, { label: string; variant: "blue" | "yellow" | "green" | "gray" }> = {
  open: { label: "Open", variant: "blue" },
  in_progress: { label: "In Progress", variant: "yellow" },
  resolved: { label: "Resolved", variant: "green" },
  closed: { label: "Closed", variant: "gray" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} size="sm">
      {config.label}
    </Badge>
  );
}
