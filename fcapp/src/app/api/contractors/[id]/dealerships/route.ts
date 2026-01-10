import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageContractors } from "@/lib/permissions";

// POST /api/contractors/:id/dealerships - Assign contractor to dealerships
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageContractors(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: contractorId } = await params;
    const body = await request.json();
    const { dealershipIds } = body;

    if (!dealershipIds || !Array.isArray(dealershipIds) || dealershipIds.length === 0) {
      return NextResponse.json(
        { error: "dealershipIds array is required" },
        { status: 400 }
      );
    }

    // Verify contractor exists and is a contractor
    const contractor = await prisma.user.findUnique({
      where: { id: contractorId, role: "contractor" },
    });

    if (!contractor) {
      return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
    }

    // Verify all dealerships exist
    const dealerships = await prisma.dealership.findMany({
      where: {
        id: {
          in: dealershipIds,
        },
      },
    });

    if (dealerships.length !== dealershipIds.length) {
      return NextResponse.json(
        { error: "One or more dealerships not found" },
        { status: 404 }
      );
    }

    // Create dealership access records (skip duplicates)
    const accesses = await Promise.all(
      dealershipIds.map(async (dealershipId: string) => {
        try {
          return await prisma.contractorDealershipAccess.create({
            data: {
              contractorId,
              dealershipId,
              assignedBy: session.id,
            },
            include: {
              dealership: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          });
        } catch (error: any) {
          // If duplicate, fetch existing
          if (error.code === "P2002") {
            return await prisma.contractorDealershipAccess.findUnique({
              where: {
                contractorId_dealershipId: {
                  contractorId,
                  dealershipId,
                },
              },
              include: {
                dealership: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            });
          }
          throw error;
        }
      })
    );

    return NextResponse.json({ accesses: accesses.filter(Boolean) }, { status: 201 });
  } catch (error) {
    console.error("Failed to assign dealerships:", error);
    return NextResponse.json(
      { error: "Failed to assign dealerships" },
      { status: 500 }
    );
  }
}

// GET /api/contractors/:id/dealerships - Get contractor's dealerships
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageContractors(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: contractorId } = await params;

    const accesses = await prisma.contractorDealershipAccess.findMany({
      where: { contractorId },
      include: {
        dealership: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
          },
        },
      },
      orderBy: {
        assignedAt: "desc",
      },
    });

    return NextResponse.json({ accesses });
  } catch (error) {
    console.error("Failed to fetch dealerships:", error);
    return NextResponse.json(
      { error: "Failed to fetch dealerships" },
      { status: 500 }
    );
  }
}
