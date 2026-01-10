import { Badge } from "@/components/ui/badge";
import type { RequestPriority } from "@prisma/client";

interface PriorityBadgeProps {
  priority: RequestPriority;
}

const priorityConfig: Record<RequestPriority, { label: string; variant: "gray" | "blue" | "orange" | "red" }> = {
  low: { label: "Low", variant: "gray" },
  normal: { label: "Normal", variant: "blue" },
  high: { label: "High", variant: "orange" },
  urgent: { label: "Urgent", variant: "red" },
};

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config = priorityConfig[priority];

  return (
    <Badge variant={config.variant} size="sm">
      {config.label}
    </Badge>
  );
}
