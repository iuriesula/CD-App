import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession, isAgencyAdmin } from "@/lib/auth";

// GET /api/vehicles/[id] - Get single vehicle
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

    const where: any = { id };
    if (!isAgencyAdmin(session.role)) {
      where.dealershipId = session.dealershipId;
    }

    const vehicle = await prisma.vehicle.findFirst({
      where,
      include: {
        dealership: {
          select: { id: true, name: true, city: true, state: true, zip: true },
        },
      },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    return NextResponse.json({ vehicle });
  } catch (error) {
    console.error("Failed to fetch vehicle:", error);
    return NextResponse.json(
      { error: "Failed to fetch vehicle" },
      { status: 500 }
    );
  }
}

// PUT /api/vehicles/[id] - Update a vehicle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Salespeople, managers, and agency admins can update vehicles
    // Contractors cannot update vehicles
    if (session.role === "contractor") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Check vehicle exists and user can access it
    const where: any = { id };
    if (!isAgencyAdmin(session.role)) {
      where.dealershipId = session.dealershipId;
    }

    const existing = await prisma.vehicle.findFirst({ where });
    if (!existing) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    // Build update data
    const updateData: any = {};
    const allowedFields = [
      "year", "make", "model", "trim", "vin", "askingPrice", "soldPrice",
      "status", "mileage", "exteriorColor", "interiorColor", "transmission",
      "engine", "description", "photos", "locationCity", "locationState",
      "locationZip", "stockNumber", "websiteDescription", "technicalBulletpoints",
      "callScript"
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === "year" || field === "mileage") {
          updateData[field] = body[field] ? parseInt(body[field]) : null;
        } else if (field === "askingPrice" || field === "soldPrice") {
          updateData[field] = body[field] ? parseFloat(body[field]) : null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    // If status changed to sold, set soldAt
    if (body.status === "sold" && existing.status !== "sold") {
      updateData.soldAt = new Date();
    }

    // Check VIN uniqueness if changing
    if (body.vin && body.vin !== existing.vin) {
      const vinExists = await prisma.vehicle.findUnique({
        where: { vin: body.vin },
      });
      if (vinExists) {
        return NextResponse.json(
          { error: "A vehicle with this VIN already exists" },
          { status: 409 }
        );
      }
    }

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: updateData,
      include: {
        dealership: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ vehicle });
  } catch (error) {
    console.error("Failed to update vehicle:", error);
    return NextResponse.json(
      { error: "Failed to update vehicle" },
      { status: 500 }
    );
  }
}

// DELETE /api/vehicles/[id] - Delete a vehicle
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Salespeople, managers, and agency admins can delete vehicles
    // Contractors cannot delete vehicles
    if (session.role === "contractor") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check vehicle exists and user can access it
    const where: any = { id };
    if (!isAgencyAdmin(session.role)) {
      where.dealershipId = session.dealershipId;
    }

    const existing = await prisma.vehicle.findFirst({ where });
    if (!existing) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    await prisma.vehicle.delete({ where: { id } });

    return NextResponse.json({ message: "Vehicle deleted" });
  } catch (error) {
    console.error("Failed to delete vehicle:", error);
    return NextResponse.json(
      { error: "Failed to delete vehicle" },
      { status: 500 }
    );
  }
}
