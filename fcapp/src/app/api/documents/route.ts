import { NextRequest, NextResponse } from "next/server";
import { getSession, isAgencyAdmin } from "@/lib/auth";
import prisma from "@/lib/db";
import crypto from "crypto";

// GET /api/documents - List documents
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("leadId");
  const type = searchParams.get("type");

  const where: any = {};

  // Restrict to dealership unless agency admin
  if (!isAgencyAdmin(session.role)) {
    if (!session.dealershipId) {
      return NextResponse.json({ error: "No dealership assigned" }, { status: 403 });
    }
    where.dealershipId = session.dealershipId;
  }

  if (leadId) {
    where.leadId = leadId;
  }

  if (type) {
    where.documentType = type;
  }

  const documents = await prisma.document.findMany({
    where,
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
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ documents });
}

// POST /api/documents - Create a document (buyer's order or invoice)
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { leadId, documentType, vehicleId, lineItems, notes, dueDate } = body;

    if (!leadId || !documentType) {
      return NextResponse.json(
        { error: "Lead ID and document type are required" },
        { status: 400 }
      );
    }

    // Validate document type
    if (!["buyers_order", "invoice", "loan_agreement"].includes(documentType)) {
      return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
    }

    // Get the lead with vehicle info
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        dealership: true,
        vehicle: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Check access
    if (!isAgencyAdmin(session.role) && lead.dealershipId !== session.dealershipId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get vehicle if specified
    let vehicle = lead.vehicle;
    if (vehicleId && vehicleId !== lead.vehicleId) {
      vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    }

    // Generate a unique signature request ID for tracking
    const signatureRequestId = crypto.randomUUID();

    // Create the document
    const document = await prisma.document.create({
      data: {
        leadId,
        dealershipId: lead.dealershipId,
        documentType,
        status: "draft",
        signatureRequestId,
      },
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
          },
        },
      },
    });

    return NextResponse.json({
      document,
      vehicle,
      signatureUrl: `/documents/${document.id}/sign?token=${signatureRequestId}`,
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to create document:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create document" },
      { status: 500 }
    );
  }
}
