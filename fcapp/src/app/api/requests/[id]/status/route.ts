import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canUpdateRequestStatus } from "@/lib/permissions";
import { RequestStatus } from "@prisma/client";

// PUT /api/requests/:id/status - Update request status
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
    const { status } = body;

    // Validate status
    const validStatuses: RequestStatus[] = ["open", "in_progress", "resolved", "closed"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Check permission
    const hasPermission = await canUpdateRequestStatus(session.id, session.role, id);

    if (!hasPermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updateData: any = { status };

    // Set closedAt when closing or resolving
    if (status === "closed" || status === "resolved") {
      updateData.closedAt = new Date();
    } else {
      updateData.closedAt = null;
    }

    const updatedRequest = await prisma.request.update({
      where: { id },
      data: updateData,
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
    console.error("Failed to update request status:", error);
    return NextResponse.json(
      { error: "Failed to update request status" },
      { status: 500 }
    );
  }
}
