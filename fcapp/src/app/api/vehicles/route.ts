import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession, isAgencyAdmin } from "@/lib/auth";

// GET /api/vehicles - List vehicles
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const dealershipId = searchParams.get("dealershipId");
    const search = searchParams.get("search");
    const limit = searchParams.get("limit");

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

    if (status) {
      where.status = status;
    }

    // Search by year, make, model, trim, VIN, or stock number
    if (search) {
      const searchTerm = search.trim();
      const yearSearch = parseInt(searchTerm);

      where.OR = [
        { make: { contains: searchTerm, mode: "insensitive" } },
        { model: { contains: searchTerm, mode: "insensitive" } },
        { trim: { contains: searchTerm, mode: "insensitive" } },
        { vin: { contains: searchTerm, mode: "insensitive" } },
        { stockNumber: { contains: searchTerm, mode: "insensitive" } },
      ];

      // Add year search if it's a valid number
      if (!isNaN(yearSearch) && yearSearch > 1900 && yearSearch < 2100) {
        where.OR.push({ year: yearSearch });
      }
    }

    const vehicles = await prisma.vehicle.findMany({
      where,
      include: {
        dealership: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit ? parseInt(limit) : undefined,
    });

    return NextResponse.json({ vehicles });
  } catch (error) {
    console.error("Failed to fetch vehicles:", error);
    return NextResponse.json(
      { error: "Failed to fetch vehicles" },
      { status: 500 }
    );
  }
}

// POST /api/vehicles - Create a vehicle
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and agency admins can add vehicles
    if (session.role === "salesperson") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      year,
      make,
      model,
      trim,
      vin,
      askingPrice,
      mileage,
      exteriorColor,
      interiorColor,
      transmission,
      engine,
      description,
      photos,
      locationCity,
      locationState,
      locationZip,
      stockNumber,
      dealershipId: requestDealershipId,
    } = body;

    // Validate required fields
    if (!year || !make || !model) {
      return NextResponse.json(
        { error: "Year, make, and model are required" },
        { status: 400 }
      );
    }

    // Determine dealership
    let dealershipId = session.dealershipId;
    if (isAgencyAdmin(session.role) && requestDealershipId) {
      dealershipId = requestDealershipId;
    }

    if (!dealershipId) {
      return NextResponse.json(
        { error: "No dealership specified" },
        { status: 400 }
      );
    }

    // Check for duplicate VIN if provided
    if (vin) {
      const existing = await prisma.vehicle.findUnique({ where: { vin } });
      if (existing) {
        return NextResponse.json(
          { error: "A vehicle with this VIN already exists" },
          { status: 409 }
        );
      }
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        dealershipId,
        year: parseInt(year),
        make,
        model,
        trim,
        vin,
        askingPrice: askingPrice ? parseFloat(askingPrice) : null,
        mileage: mileage ? parseInt(mileage) : null,
        exteriorColor,
        interiorColor,
        transmission,
        engine,
        description,
        photos: photos || [],
        locationCity,
        locationState,
        locationZip,
        stockNumber,
      },
      include: {
        dealership: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (error) {
    console.error("Failed to create vehicle:", error);
    return NextResponse.json(
      { error: "Failed to create vehicle" },
      { status: 500 }
    );
  }
}
