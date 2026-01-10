import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canViewRequest } from "@/lib/permissions";

// GET /api/requests/:id - Get request details with messages and attachments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch contractor department if user is a contractor
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { contractorDepartment: true },
    });

    // Check permission
    const hasPermission = await canViewRequest(
      session.id,
      session.role,
      session.dealershipId,
      user?.contractorDepartment || null,
      id
    );

    if (!hasPermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const requestData = await prisma.request.findUnique({
      where: { id },
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
        messages: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            attachments: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        attachments: {
          where: {
            messageId: null, // Only direct request attachments
          },
          orderBy: {
            uploadedAt: "desc",
          },
        },
      },
    });

    if (!requestData) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json({ request: requestData });
  } catch (error) {
    console.error("Failed to fetch request:", error);
    return NextResponse.json(
      { error: "Failed to fetch request" },
      { status: 500 }
    );
  }
}

// PUT /api/requests/:id - Update request
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
    const { title, description, priority } = body;

    // Check if request exists and get permissions
    const existingRequest = await prisma.request.findUnique({
      where: { id },
      select: {
        requestedById: true,
        dealershipId: true,
      },
    });

    if (!existingRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Only request creator or agency admin can update
    if (
      existingRequest.requestedById !== session.id &&
      session.role !== "agency_admin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;

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
    console.error("Failed to update request:", error);
    return NextResponse.json(
      { error: "Failed to update request" },
      { status: 500 }
    );
  }
}

// DELETE /api/requests/:id - Delete request
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if request exists
    const existingRequest = await prisma.request.findUnique({
      where: { id },
      select: {
        requestedById: true,
      },
    });

    if (!existingRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Only request creator or agency admin can delete
    if (
      existingRequest.requestedById !== session.id &&
      session.role !== "agency_admin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete request (cascade will handle messages and attachments)
    await prisma.request.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete request:", error);
    return NextResponse.json(
      { error: "Failed to delete request" },
      { status: 500 }
    );
  }
}
