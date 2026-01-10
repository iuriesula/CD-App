import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/db";
import { canViewRequest } from "@/lib/permissions";
import { ContractorRequestDetailClient } from "./contractor-request-detail-client";
import type { RequestWithRelations } from "@/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ContractorRequestDetailPage({ params }: PageProps) {
  const session = await getSession();
  const { id } = await params;

  if (!session || session.role !== "contractor") {
    redirect("/");
  }

  // Check if user can view this request
  const canView = await canViewRequest(
    session.id,
    session.role,
    session.dealershipId,
    session.contractorDepartment || null,
    id
  );

  if (!canView) {
    notFound();
  }

  const request = await prisma.request.findUnique({
    where: { id },
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
      assignedTo: true,
      messages: {
        include: {
          user: true,
          attachments: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      attachments: true,
    },
  }) as unknown as RequestWithRelations | null;

  if (!request) {
    notFound();
  }

  return (
    <ContractorRequestDetailClient
      request={request}
      currentUser={session}
    />
  );
}
