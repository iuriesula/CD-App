import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession, isAgencyAdmin } from "@/lib/auth";
import bcrypt from "bcryptjs";

// GET /api/users - List users
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and agency admins can list users
    if (session.role !== "manager" && !isAgencyAdmin(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dealershipId = searchParams.get("dealershipId");

    const where: any = {};

    if (isAgencyAdmin(session.role)) {
      // Agency admins can see all users or filter by dealership
      if (dealershipId) {
        where.dealershipId = dealershipId;
      }
    } else {
      // Managers can only see users in their dealership
      if (!session.dealershipId) {
        return NextResponse.json({ users: [] });
      }
      where.dealershipId = session.dealershipId;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        voipExtension: true,
        createdAt: true,
        dealership: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and agency admins can create users
    if (session.role !== "manager" && !isAgencyAdmin(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, role, voipExtension, dealershipId: requestDealershipId } = body;

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Determine dealership
    let dealershipId = session.dealershipId;
    if (isAgencyAdmin(session.role) && requestDealershipId) {
      dealershipId = requestDealershipId;
    }

    // Managers can only create users in their dealership
    if (!isAgencyAdmin(session.role) && !dealershipId) {
      return NextResponse.json(
        { error: "No dealership assigned" },
        { status: 400 }
      );
    }

    // Validate role - managers can't create agency admins
    const validRoles = ["salesperson", "manager", "tech", "content_creator"];
    if (isAgencyAdmin(session.role)) {
      validRoles.push("agency_admin");
    }

    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: role || "salesperson",
        voipExtension,
        dealershipId,
        mustChangePassword: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        voipExtension: true,
        createdAt: true,
        dealership: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Failed to create user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
