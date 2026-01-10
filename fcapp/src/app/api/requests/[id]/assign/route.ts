import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAssignRequest, canContractorBeAssigned } from "@/lib/permissions";

// PUT /api/requests/:id/assign - Assign request to contractor
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { contractorId } = body;

    // Fetch the request to check ownership
    const requestData = await prisma.request.findUnique({
      where: { id },
      select: { requestedById: true },
    });

    if (!requestData) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Allow if:
    // 1. User has assign permission (manager/agency_admin), OR
    // 2. User is the request creator assigning to themselves (self-assignment)
    const isSelfAssignment = requestData.requestedById === session.id && contractorId === session.id;
    const hasAssignPermission = canAssignRequest(session.role);

    if (!hasAssignPermission && !isSelfAssignment) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Allow unassigning (contractorId = null)
    if (contractorId === null) {
      const updatedRequest = await prisma.request.update({
        where: { id },
        data: { assignedToId: null },
        include: {
          dealership: {
            select: {
              id: true,
              name: true,
            },
          },
          requestedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              contractorDepartment: true,
            },
          },
        },
      });

      return NextResponse.json({ request: updatedRequest });
    }

    // For self-assignment, skip contractor validation
    // (allows salespeople/managers to take ownership of their own requests)
    if (!isSelfAssignment) {
      // Validate contractor can be assigned (only for manager/admin assignments)
      const validation = await canContractorBeAssigned(contractorId, id);

      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
    }

    // Assign contractor
    const updatedRequest = await prisma.request.update({
      where: { id },
      data: {
        assignedToId: contractorId,
        status: "in_progress", // Automatically set to in_progress when assigned
      },
      include: {
        dealership: {
          select: {
            id: true,
            name: true,
          },
        },
        requestedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            contractorDepartment: true,
          },
        },
      },
    });

    return NextResponse.json({ request: updatedRequest });
  } catch (error) {
    console.error("Failed to assign request:", error);
    return NextResponse.json(
      { error: "Failed to assign request" },
      { status: 500 }
    );
  }
}
