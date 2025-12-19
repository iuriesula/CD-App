import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession, isAgencyAdmin } from "@/lib/auth";

// GET /api/dealerships/[id] - Get dealership details
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

    // Check access: agency admins can view any, others only their own
    if (!isAgencyAdmin(session.role) && session.dealershipId !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const dealership = await prisma.dealership.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        phone: true,
        phones: true,
        email: true,
        contactEmails: true,
        website: true,
        settings: true,
        logoUrl: true,
        brandColor: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!dealership) {
      return NextResponse.json({ error: "Dealership not found" }, { status: 404 });
    }

    return NextResponse.json({ dealership });
  } catch (error) {
    console.error("Failed to fetch dealership:", error);
    return NextResponse.json(
      { error: "Failed to fetch dealership" },
      { status: 500 }
    );
  }
}

// PUT /api/dealerships/[id] - Update dealership details
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

    // Check access: agency admins can update any, managers only their own
    if (!isAgencyAdmin(session.role)) {
      if (session.role !== "manager" || session.dealershipId !== id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await request.json();
    const {
      name,
      address,
      city,
      state,
      zip,
      phone,
      phones,
      email,
      contactEmails,
      website,
      settings,
    } = body;

    const dealership = await prisma.dealership.update({
      where: { id },
      data: {
        name,
        address,
        city,
        state,
        zip,
        phone,
        phones: phones || [],
        email,
        contactEmails: contactEmails || [],
        website,
        ...(settings !== undefined && { settings }),
      },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        phone: true,
        phones: true,
        email: true,
        contactEmails: true,
        website: true,
        settings: true,
        logoUrl: true,
        brandColor: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ dealership });
  } catch (error) {
    console.error("Failed to update dealership:", error);
    return NextResponse.json(
      { error: "Failed to update dealership" },
      { status: 500 }
    );
  }
}
