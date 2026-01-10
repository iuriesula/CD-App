import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/db";
import { canViewRequest } from "@/lib/permissions";
import { RequestDetailClient } from "./request-detail-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RequestDetailPage({ params }: PageProps) {
  const session = await getSession();
  const { id } = await params;

  if (!session) {
    redirect("/login");
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

  const request = (await prisma.request.findUnique({
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
  })) as any;

  if (!request) {
    notFound();
  }

  // Fetch contractors for assignment dropdown (if user is manager or admin)
  let contractors: any[] = [];
  if (session.role === "manager" || session.role === "agency_admin") {
    contractors = await prisma.user.findMany({
      where: {
        role: "contractor",
        contractorDepartment: request.department,
        isActive: true,
        contractorDealerships: {
          some: {
            dealershipId: request.dealershipId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
  }

  return (
    <RequestDetailClient
      request={request}
      currentUser={session}
      contractors={contractors}
    />
  );
}
