import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import { ContractorDashboardClient } from "./contractor-dashboard-client";
import type { RequestWithRelations } from "@/types";

export default async function ContractorDashboardPage() {
  const session = await getSession();

  if (!session || session.role !== "contractor") {
    redirect("/");
  }

  if (!session.contractorDepartment) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-900 mb-2">Department Not Assigned</h2>
          <p className="text-sm text-yellow-800">
            Please contact your administrator to assign you to a department.
          </p>
        </div>
      </div>
    );
  }

  // Get contractor's assigned dealerships
  const dealershipAccesses = await prisma.contractorDealershipAccess.findMany({
    where: { contractorId: session.id },
    select: { dealershipId: true },
  });

  const dealershipIds = dealershipAccesses.map((a) => a.dealershipId);

  // Fetch requests assigned to this contractor
  const assignedRequests = await prisma.request.findMany({
    where: {
      assignedToId: session.id,
      status: {
        in: ["open", "in_progress"],
      },
    },
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
      _count: {
        select: {
          messages: true,
        },
      },
    },
    orderBy: {
      priority: "desc",
    },
  }) as unknown as RequestWithRelations[];

  // Fetch available requests in contractor's department
  const availableRequests = await prisma.request.findMany({
    where: {
      department: session.contractorDepartment,
      dealershipId: {
        in: dealershipIds,
      },
      assignedToId: null,
      status: "open",
    },
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
      _count: {
        select: {
          messages: true,
        },
      },
    },
    orderBy: {
      priority: "desc",
    },
  }) as unknown as RequestWithRelations[];

  // Calculate stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const resolvedToday = await prisma.request.count({
    where: {
      assignedToId: session.id,
      status: "resolved",
      updatedAt: {
        gte: today,
      },
    },
  });

  // Calculate avg response time
  const closedRequests = await prisma.request.findMany({
    where: {
      assignedToId: session.id,
      closedAt: { not: null },
    },
    select: {
      createdAt: true,
      closedAt: true,
    },
  });

  const avgResponseTimeMs =
    closedRequests.length > 0
      ? closedRequests.reduce((sum, r) => {
          const time = r.closedAt!.getTime() - r.createdAt.getTime();
          return sum + time;
        }, 0) / closedRequests.length
      : 0;

  const avgResponseTimeDays = Math.round(avgResponseTimeMs / (1000 * 60 * 60 * 24));

  return (
    <ContractorDashboardClient
      assignedRequests={assignedRequests}
      availableRequests={availableRequests}
      stats={{
        assignedCount: assignedRequests.length,
        availableCount: availableRequests.length,
        resolvedToday,
        avgResponseTimeDays,
      }}
    />
  );
}
