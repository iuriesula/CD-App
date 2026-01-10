import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canViewRequest } from "@/lib/permissions";
import prisma from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// POST /api/requests/:id/upload - Upload file for request
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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
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

    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `File type '${file.type}' is not allowed` },
        { status: 400 }
      );
    }

    // Validate file size (max 25MB)
    const maxSizeBytes = 25 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        { error: `File size exceeds maximum of 25MB` },
        { status: 400 }
      );
    }

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), "public", "uploads", "requests", requestId);
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const ext = path.extname(file.name);
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const filename = `${timestamp}-${randomStr}${ext}`;
    const filepath = path.join(uploadDir, filename);

    // Write file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Generate relative URL
    const relativeUrl = `/uploads/requests/${requestId}/${filename}`;

    // Sanitize fileName (prevent path traversal)
    const originalName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

    return NextResponse.json({
      file: {
        fileName: originalName,
        fileUrl: relativeUrl,
        mimeType: file.type,
        size: file.size,
      },
    });
  } catch (error) {
    console.error("Failed to upload file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
