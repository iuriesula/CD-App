import { NextRequest, NextResponse } from "next/server";
import { getSession, isAgencyAdmin } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/documents/:id - Get a specific document with full details
export async function GET(request: NextRequest, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      lead: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          primaryEmail: true,
          primaryPhone: true,
          city: true,
          state: true,
          zip: true,
          interestedVehicle: true,
          vehicle: {
            select: {
              id: true,
              year: true,
              make: true,
              model: true,
              trim: true,
              vin: true,
              askingPrice: true,
              mileage: true,
              exteriorColor: true,
              stockNumber: true,
            },
          },
        },
      },
      dealership: {
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          state: true,
          zip: true,
          phone: true,
          email: true,
          logoUrl: true,
          brandColor: true,
        },
      },
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Check access
  if (!isAgencyAdmin(session.role) && document.dealershipId !== session.dealershipId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ document });
}

// PUT /api/documents/:id - Update document status
export async function PUT(request: NextRequest, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const { status, filePath } = body;

  const document = await prisma.document.findUnique({
    where: { id },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Check access
  if (!isAgencyAdmin(session.role) && document.dealershipId !== session.dealershipId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updateData: any = {};

  if (status) {
    updateData.status = status;
    if (status === "sent") {
      updateData.sentAt = new Date();
    } else if (status === "viewed") {
      updateData.viewedAt = new Date();
    } else if (status === "signed") {
      updateData.signedAt = new Date();
    }
  }

  if (filePath) {
    updateData.filePath = filePath;
  }

  const updated = await prisma.document.update({
    where: { id },
    data: updateData,
    include: {
      lead: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          primaryEmail: true,
        },
      },
      dealership: {
        select: { id: true, name: true },
      },
    },
  });

  return NextResponse.json({ document: updated });
}

// DELETE /api/documents/:id
export async function DELETE(request: NextRequest, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const document = await prisma.document.findUnique({
    where: { id },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Check access
  if (!isAgencyAdmin(session.role) && document.dealershipId !== session.dealershipId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Only allow deleting drafts
  if (document.status !== "draft") {
    return NextResponse.json(
      { error: "Only draft documents can be deleted" },
      { status: 400 }
    );
  }

  await prisma.document.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
