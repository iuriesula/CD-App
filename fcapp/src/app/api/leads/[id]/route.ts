import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession, canAccessDealership } from "@/lib/auth";
import { changeLeadStage, getWinProbability } from "@/lib/leads";

// GET /api/leads/[id]
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

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
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
        activities: {
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
        tasks: {
          where: { completed: false },
          orderBy: { dueDate: "asc" },
        },
        documents: {
          orderBy: { createdAt: "desc" },
        },
        vehicle: {
          select: {
            id: true,
            year: true,
            make: true,
            model: true,
            trim: true,
            vin: true,
            exteriorColor: true,
            askingPrice: true,
            mileage: true,
            stockNumber: true,
            status: true,
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (!canAccessDealership(session.role, session.dealershipId, lead.dealershipId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error("Get lead error:", error);
    return NextResponse.json({ error: "Failed to fetch lead" }, { status: 500 });
  }
}

// PUT /api/leads/[id]
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
    const data = await request.json();

    const existing = await prisma.lead.findUnique({
      where: { id },
      select: { dealershipId: true, stage: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (!canAccessDealership(session.role, session.dealershipId, existing.dealershipId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Handle stage change separately with business logic
    if (data.stage && data.stage !== existing.stage) {
      await changeLeadStage(id, session.id, data.stage);
      delete data.stage;
    }

    // Update other fields
    const updateData: any = {};
    const allowedFields = [
      "firstName", "lastName", "primaryEmail", "primaryPhone",
      "alternateEmails", "alternatePhones", "city", "state", "zip",
      "interestedVehicle", "vehicleId", "notes", "assignedToId", "source",
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ lead });
  } catch (error) {
    console.error("Update lead error:", error);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}

// DELETE /api/leads/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and admins can delete
    if (session.role === "salesperson") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.lead.findUnique({
      where: { id },
      select: { dealershipId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (!canAccessDealership(session.role, session.dealershipId, existing.dealershipId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.lead.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete lead error:", error);
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}
