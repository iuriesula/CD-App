import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import { RequestsListClient } from "./requests-list-client";

export default async function RequestsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Fetch requests based on user role
  const where: any = {};

  // If not agency_admin, filter by dealership
  if (session.role !== "agency_admin" && session.dealershipId) {
    where.dealershipId = session.dealershipId;
  }

  const requests = (await prisma.request.findMany({
    where,
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
      _count: {
        select: {
          messages: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })) as any;

  return <RequestsListClient requests={requests} userRole={session.role} />;
}
