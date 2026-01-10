import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canViewRequest } from "@/lib/permissions";

// GET /api/requests/:id/messages - Get all messages for a request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: requestId } = await params;

    // Get user's contractor department if applicable
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
      requestId
    );

    if (!hasPermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const messages = await prisma.requestMessage.findMany({
      where: { requestId },
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
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

// POST /api/requests/:id/messages - Add a message to the conversation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: requestId } = await params;
    const body = await request.json();
    const { message } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Get user's contractor department if applicable
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
      requestId
    );

    if (!hasPermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Create message
    const newMessage = await prisma.requestMessage.create({
      data: {
        requestId,
        userId: session.id,
        message: message.trim(),
      },
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
    });

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error) {
    console.error("Failed to create message:", error);
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}
