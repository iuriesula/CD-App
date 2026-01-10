import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canViewRequest } from "@/lib/permissions";

// PUT /api/requests/:id/messages/:messageId/read - Mark message as read
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: requestId, messageId } = await params;

    // Fetch message with request ID
    const message = await prisma.requestMessage.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        requestId: true,
        userId: true,
      },
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Verify message belongs to this request
    if (message.requestId !== requestId) {
      return NextResponse.json(
        { error: "Message does not belong to this request" },
        { status: 400 }
      );
    }

    // Get user's contractor department if applicable
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { contractorDepartment: true },
    });

    // Check permission to view the request
    const hasPermission = await canViewRequest(
      session.id,
      session.role,
      session.dealershipId,
      user?.contractorDepartment || null,
      requestId
    );

    if (!hasPermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update message to mark as read
    const updatedMessage = await prisma.requestMessage.update({
      where: { id: messageId },
      data: { isRead: true },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ message: updatedMessage });
  } catch (error) {
    console.error("Failed to mark message as read:", error);
    return NextResponse.json(
      { error: "Failed to mark message as read" },
      { status: 500 }
    );
  }
}
