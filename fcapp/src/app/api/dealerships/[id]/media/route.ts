import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET - List media for a dealership (optionally filtered by folder)
export async function GET(request: NextRequest, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: dealershipId } = await context.params;

  // Verify user belongs to this dealership
  if (session.dealershipId !== dealershipId && session.role !== "agency_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const folder = searchParams.get("folder"); // null = root, or folder path

  // Build query - filter by folder
  const whereClause: any = { dealershipId };
  if (folder === null || folder === "") {
    // Root level - get items where folder is null
    whereClause.folder = null;
  } else {
    // Specific folder - get items in that folder
    whereClause.folder = folder;
  }

  const media = await prisma.dealershipMedia.findMany({
    where: whereClause,
    orderBy: [
      { type: "asc" }, // Folders first (type="folder" comes before "general" etc alphabetically)
      { name: "asc" },
    ],
  });

  // Sort so folders appear first
  const sorted = media.sort((a, b) => {
    if (a.type === "folder" && b.type !== "folder") return -1;
    if (a.type !== "folder" && b.type === "folder") return 1;
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json({ media: sorted });
}

// POST - Upload new media or create folder
export async function POST(request: NextRequest, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: dealershipId } = await context.params;

  // Verify user belongs to this dealership
  if (session.dealershipId !== dealershipId && session.role !== "agency_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // All authenticated users can upload media (salespeople, tech, content creators, managers, admins)
  // This allows salespeople to upload car photos and other media

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string) || "general";
    const name = formData.get("name") as string | null;
    const folder = formData.get("folder") as string | null; // Folder path

    // Handle folder creation
    if (type === "folder") {
      const folderName = name?.trim();
      if (!folderName) {
        return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
      }

      // Check if folder already exists at this level
      const existingFolder = await prisma.dealershipMedia.findFirst({
        where: {
          dealershipId,
          name: folderName,
          type: "folder",
          folder: folder || null,
        },
      });

      if (existingFolder) {
        return NextResponse.json({ error: "A folder with this name already exists" }, { status: 400 });
      }

      const newFolder = await prisma.dealershipMedia.create({
        data: {
          dealershipId,
          name: folderName,
          type: "folder",
          url: "", // Folders don't have a URL
          folder: folder || null, // Parent folder
        },
      });

      return NextResponse.json({ media: newFolder });
    }

    // Handle file upload
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type (images only for now)
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only images are allowed." },
        { status: 400 }
      );
    }

    // Max file size: 5MB
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), "public", "uploads", "dealerships", dealershipId);
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

    // Save to database
    const relativeUrl = `/uploads/dealerships/${dealershipId}/${filename}`;
    const media = await prisma.dealershipMedia.create({
      data: {
        dealershipId,
        name: name || file.name,
        type,
        url: relativeUrl,
        mimeType: file.type,
        size: file.size,
        folder: folder || null,
      },
    });

    // If this is a logo upload, update the dealership's logoUrl
    if (type === "logo") {
      await prisma.dealership.update({
        where: { id: dealershipId },
        data: { logoUrl: relativeUrl },
      });
    }

    return NextResponse.json({ media });
  } catch (error) {
    console.error("Media upload failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}

// PUT - Move media to a different folder or rename
export async function PUT(request: NextRequest, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: dealershipId } = await context.params;

  if (session.dealershipId !== dealershipId && session.role !== "agency_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // All authenticated users can rename/move media

  try {
    const body = await request.json();
    const { mediaId, folder, name } = body;

    if (!mediaId) {
      return NextResponse.json({ error: "Media ID required" }, { status: 400 });
    }

    const media = await prisma.dealershipMedia.findFirst({
      where: { id: mediaId, dealershipId },
    });

    if (!media) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    // Build update data
    const updateData: any = {};
    if (folder !== undefined) {
      updateData.folder = folder || null; // Empty string becomes null (root)
    }
    if (name !== undefined && name.trim()) {
      updateData.name = name.trim();
    }

    const updated = await prisma.dealershipMedia.update({
      where: { id: mediaId },
      data: updateData,
    });

    return NextResponse.json({ media: updated });
  } catch (error) {
    console.error("Media update failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 500 }
    );
  }
}

// DELETE - Remove media
export async function DELETE(request: NextRequest, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: dealershipId } = await context.params;

  if (session.dealershipId !== dealershipId && session.role !== "agency_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // All authenticated users can delete media

  const { searchParams } = new URL(request.url);
  const mediaId = searchParams.get("mediaId");

  if (!mediaId) {
    return NextResponse.json({ error: "Media ID required" }, { status: 400 });
  }

  const media = await prisma.dealershipMedia.findFirst({
    where: { id: mediaId, dealershipId },
  });

  if (!media) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  // If deleting a folder, recursively delete all contents
  if (media.type === "folder") {
    // Build the folder path for items inside this folder
    const folderPath = media.folder ? `${media.folder}/${media.name}` : media.name;

    // Delete all items in this folder and nested subfolders
    // This includes both direct children (folder = folderPath)
    // and nested children (folder starts with folderPath/)
    await prisma.dealershipMedia.deleteMany({
      where: {
        dealershipId,
        OR: [
          { folder: folderPath },
          { folder: { startsWith: `${folderPath}/` } },
        ],
      },
    });
  }

  // Delete the item (file or folder) from database
  await prisma.dealershipMedia.delete({
    where: { id: mediaId },
  });

  // Note: We don't delete the file from disk to avoid broken references
  // A cleanup job could be added later to remove orphaned files

  return NextResponse.json({ success: true });
}
