import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession, canAccessDealership, isAgencyAdmin } from "@/lib/auth";
import { createLead, findDuplicates } from "@/lib/leads";

// GET /api/leads - List leads
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const stage = searchParams.get("stage");
    const assignedTo = searchParams.get("assignedTo");
    const dealershipId = searchParams.get("dealershipId");

    const where: any = {};

    // Agency admins can see all, others only their dealership
    if (!isAgencyAdmin(session.role)) {
      if (!session.dealershipId) {
        return NextResponse.json({ error: "No dealership assigned" }, { status: 403 });
      }
      where.dealershipId = session.dealershipId;
    } else if (dealershipId) {
      where.dealershipId = dealershipId;
    }

    if (stage) {
      where.stage = stage;
    }

    if (assignedTo) {
      where.assignedToId = assignedTo;
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        dealership: {
          select: { id: true, name: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ leads });
  } catch (error) {
    console.error("Get leads error:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

// POST /api/leads - Create lead
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const dealershipId = data.dealershipId || session.dealershipId;

    if (!dealershipId) {
      return NextResponse.json({ error: "Dealership ID required" }, { status: 400 });
    }

    if (!canAccessDealership(session.role, session.dealershipId, dealershipId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate at least email or phone is provided
    if (!data.primaryEmail && !data.primaryPhone) {
      return NextResponse.json(
        { error: "At least an email or phone number is required" },
        { status: 400 }
      );
    }

    // Check for duplicates
    if (data.checkDuplicates !== false) {
      const duplicates = await findDuplicates(
        dealershipId,
        data.primaryEmail,
        data.primaryPhone
      );

      if (duplicates.length > 0) {
        return NextResponse.json({
          duplicates,
          message: "Potential duplicates found",
        }, { status: 409 });
      }
    }

    const lead = await createLead({
      dealershipId,
      assignedToId: data.assignedToId || session.id,
      firstName: data.firstName,
      lastName: data.lastName,
      primaryEmail: data.primaryEmail,
      primaryPhone: data.primaryPhone,
      source: data.source,
      interestedVehicle: data.interestedVehicle,
      notes: data.notes,
      city: data.city,
      state: data.state,
      zip: data.zip,
      metaCampaignId: data.metaCampaignId,
      metaAdsetId: data.metaAdsetId,
      metaAdId: data.metaAdId,
    });

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    console.error("Create lead error:", error);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
