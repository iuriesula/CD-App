import { Badge } from "@/components/ui/badge";
import type { ContractorDepartment } from "@prisma/client";

interface DepartmentBadgeProps {
  department: ContractorDepartment;
}

const departmentConfig: Record<ContractorDepartment, { label: string; variant: "purple" | "pink" | "blue" }> = {
  it: { label: "IT", variant: "purple" },
  marketing: { label: "Marketing", variant: "pink" },
  content: { label: "Content", variant: "blue" },
};

export function DepartmentBadge({ department }: DepartmentBadgeProps) {
  const config = departmentConfig[department];

  return (
    <Badge variant={config.variant} size="sm">
      {config.label}
    </Badge>
  );
}
