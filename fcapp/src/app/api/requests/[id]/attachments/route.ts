import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canViewRequest } from "@/lib/permissions";

// POST /api/requests/:id/attachments - Upload file attachment
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
    const { messageId, fileName, fileUrl, mimeType, size } = body;

    if (!fileName || !fileUrl || !mimeType || !size) {
      return NextResponse.json(
        { error: "fileName, fileUrl, mimeType, and size are required" },
        { status: 400 }
      );
    }

    // Validate MIME type (whitelist)
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ];

    if (!allowedMimeTypes.includes(mimeType)) {
      return NextResponse.json(
        { error: `File type '${mimeType}' is not allowed` },
        { status: 400 }
      );
    }

    // Validate file size (max 25MB)
    const maxSizeBytes = 25 * 1024 * 1024; // 25MB
    if (size > maxSizeBytes) {
      return NextResponse.json(
        { error: `File size exceeds maximum of 25MB` },
        { status: 400 }
      );
    }

    // Sanitize fileName (prevent path traversal)
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return NextResponse.json(
        { error: 'Invalid file name' },
        { status: 400 }
      );
    }

    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

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

    // If messageId provided, verify it belongs to this request
    if (messageId) {
      const message = await prisma.requestMessage.findUnique({
        where: { id: messageId },
        select: { requestId: true },
      });

      if (!message || message.requestId !== requestId) {
        return NextResponse.json(
          { error: "Message not found or does not belong to this request" },
          { status: 404 }
        );
      }
    }

    // Create attachment
    const attachment = await prisma.requestAttachment.create({
      data: {
        requestId,
        messageId: messageId || null,
        fileName: sanitizedFileName,
        fileUrl,
        mimeType,
        size,
      },
    });

    return NextResponse.json({ attachment }, { status: 201 });
  } catch (error) {
    console.error("Failed to create attachment:", error);
    return NextResponse.json(
      { error: "Failed to create attachment" },
      { status: 500 }
    );
  }
}

// GET /api/requests/:id/attachments - Get all attachments for a request
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

    const attachments = await prisma.requestAttachment.findMany({
      where: { requestId },
      include: {
        message: {
          select: {
            id: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        uploadedAt: "desc",
      },
    });

    return NextResponse.json({ attachments });
  } catch (error) {
    console.error("Failed to fetch attachments:", error);
    return NextResponse.json(
      { error: "Failed to fetch attachments" },
      { status: 500 }
    );
  }
}
