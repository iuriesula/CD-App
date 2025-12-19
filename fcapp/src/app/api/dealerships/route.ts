import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession, isAgencyAdmin } from "@/lib/auth";
import bcrypt from "bcryptjs";

// GET /api/dealerships - List all dealerships (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only agency admins can list all dealerships
    if (!isAgencyAdmin(session.role)) {
      // Non-admins get just their own dealership
      if (!session.dealershipId) {
        return NextResponse.json({ dealerships: [] });
      }
      const dealership = await prisma.dealership.findUnique({
        where: { id: session.dealershipId },
        select: { id: true, name: true, city: true, state: true, zip: true },
      });
      return NextResponse.json({ dealerships: dealership ? [dealership] : [] });
    }

    const dealerships = await prisma.dealership.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        phone: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            leads: true,
            vehicles: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ dealerships });
  } catch (error) {
    console.error("Failed to fetch dealerships:", error);
    return NextResponse.json(
      { error: "Failed to fetch dealerships" },
      { status: 500 }
    );
  }
}

// POST /api/dealerships - Create a new dealership with admin user (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAgencyAdmin(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, address, city, state, zip, phone, adminName, adminEmail, adminPassword } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Dealership name is required" },
        { status: 400 }
      );
    }

    if (!adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: "Admin name, email, and password are required" },
        { status: 400 }
      );
    }

    if (adminPassword.length < 6) {
      return NextResponse.json(
        { error: "Admin password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    // Create dealership and admin user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const dealership = await tx.dealership.create({
        data: {
          name,
          address,
          city,
          state,
          zip,
          phone,
          settings: {},
        },
      });

      const adminUser = await tx.user.create({
        data: {
          email: adminEmail,
          passwordHash,
          name: adminName,
          role: "manager",
          dealershipId: dealership.id,
        },
      });

      return { dealership, adminUser };
    });

    return NextResponse.json({
      dealership: result.dealership,
      adminUser: {
        id: result.adminUser.id,
        email: result.adminUser.email,
        name: result.adminUser.name,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to create dealership:", error);
    return NextResponse.json(
      { error: "Failed to create dealership" },
      { status: 500 }
    );
  }
}
