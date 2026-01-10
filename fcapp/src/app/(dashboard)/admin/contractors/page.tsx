import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ContractorsListClient } from "./contractors-list-client";
import prisma from "@/lib/db";

export default async function ContractorsPage() {
  const session = await getSession();

  if (!session || session.role !== "agency_admin") {
    redirect("/");
  }

  // Fetch all contractors with their dealership assignments
  const contractors = await prisma.user.findMany({
    where: {
      role: "contractor",
    },
    include: {
      contractorDealerships: {
        include: {
          dealership: true,
        },
      },
      requestsAssigned: {
        select: {
          id: true,
          status: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  // Fetch all dealerships for the modal
  const dealerships = await prisma.dealership.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return <ContractorsListClient contractors={contractors} dealerships={dealerships} />;
}
