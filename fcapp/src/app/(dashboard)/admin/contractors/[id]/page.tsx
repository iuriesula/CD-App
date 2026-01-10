import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/db";
import { ContractorDetailClient } from "./contractor-detail-client";
import type { ContractorWithRelations } from "@/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ContractorDetailPage({ params }: PageProps) {
  const session = await getSession();
  const { id } = await params;

  if (!session || session.role !== "agency_admin") {
    redirect("/");
  }

  const contractor = await prisma.user.findUnique({
    where: { id },
    include: {
      contractorDealerships: {
        include: {
          dealership: true,
        },
      },
      requestsAssigned: {
        include: {
          dealership: true,
          requestedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      },
    },
  }) as unknown as ContractorWithRelations | null;

  if (!contractor || contractor.role !== "contractor") {
    notFound();
  }

  // Calculate performance metrics
  const allRequests = await prisma.request.findMany({
    where: {
      assignedToId: id,
    },
    select: {
      status: true,
      createdAt: true,
      closedAt: true,
    },
  });

  const resolvedCount = allRequests.filter((r) => r.status === "resolved" || r.status === "closed").length;
  const avgResponseTimeMs =
    allRequests
      .filter((r) => r.closedAt)
      .reduce((sum, r) => {
        const time = r.closedAt!.getTime() - r.createdAt.getTime();
        return sum + time;
      }, 0) / (allRequests.filter((r) => r.closedAt).length || 1);

  const avgResponseTimeDays = Math.round(avgResponseTimeMs / (1000 * 60 * 60 * 24));

  return (
    <ContractorDetailClient
      contractor={contractor}
      metrics={{
        totalRequests: allRequests.length,
        resolvedCount,
        avgResponseTimeDays,
      }}
    />
  );
}
