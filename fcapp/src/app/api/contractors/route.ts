import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageContractors } from "@/lib/permissions";
import bcrypt from "bcryptjs";
import { ContractorDepartment } from "@prisma/client";

// GET /api/contractors - List all contractors
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only agency admins can manage contractors
    if (!canManageContractors(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const department = searchParams.get("department") as ContractorDepartment | null;
    const dealershipId = searchParams.get("dealershipId");

    const where: any = {
      role: "contractor",
    };

    if (department) {
      where.contractorDepartment = department;
    }

    const contractors = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        contractorDepartment: true,
        isActive: true,
        createdAt: true,
        contractorDealerships: {
          select: {
            dealershipId: true,
            assignedAt: true,
            dealership: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Filter by dealership if specified
    let filteredContractors = contractors;
    if (dealershipId) {
      filteredContractors = contractors.filter((c) =>
        c.contractorDealerships.some((d) => d.dealershipId === dealershipId)
      );
    }

    return NextResponse.json({ contractors: filteredContractors });
  } catch (error) {
    console.error("Failed to fetch contractors:", error);
    return NextResponse.json(
      { error: "Failed to fetch contractors" },
      { status: 500 }
    );
  }
}

// POST /api/contractors - Create a new contractor
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageContractors(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, contractorDepartment, dealershipIds } = body;

    // Validate required fields
    if (!name || !email || !password || !contractorDepartment) {
      return NextResponse.json(
        { error: "Name, email, password, and department are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Validate department
    const validDepartments: ContractorDepartment[] = ["it", "marketing", "content"];
    if (!validDepartments.includes(contractorDepartment)) {
      return NextResponse.json(
        { error: "Invalid contractor department" },
        { status: 400 }
      );
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create contractor user
    const contractor = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        role: "contractor",
        contractorDepartment,
        mustChangePassword: true,
        dealershipId: null, // Contractors don't have a single dealership
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        contractorDepartment: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Assign to dealerships if provided
    if (dealershipIds && Array.isArray(dealershipIds) && dealershipIds.length > 0) {
      await prisma.contractorDealershipAccess.createMany({
        data: dealershipIds.map((dealershipId: string) => ({
          contractorId: contractor.id,
          dealershipId,
          assignedBy: session.id,
        })),
      });
    }

    // Fetch contractor with dealership assignments
    const contractorWithDealerships = await prisma.user.findUnique({
      where: { id: contractor.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        contractorDepartment: true,
        isActive: true,
        createdAt: true,
        contractorDealerships: {
          select: {
            dealershipId: true,
            assignedAt: true,
            dealership: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ contractor: contractorWithDealerships }, { status: 201 });
  } catch (error) {
    console.error("Failed to create contractor:", error);
    return NextResponse.json(
      { error: "Failed to create contractor" },
      { status: 500 }
    );
  }
}
