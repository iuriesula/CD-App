import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageContractors } from "@/lib/permissions";
import { ContractorDepartment } from "@prisma/client";

// GET /api/contractors/:id - Get contractor details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageContractors(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const contractor = await prisma.user.findUnique({
      where: { id, role: "contractor" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        contractorDepartment: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
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
          orderBy: {
            assignedAt: "desc",
          },
        },
        requestsAssigned: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
          },
          where: {
            status: {
              notIn: ["closed", "resolved"],
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        },
      },
    });

    if (!contractor) {
      return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
    }

    return NextResponse.json({ contractor });
  } catch (error) {
    console.error("Failed to fetch contractor:", error);
    return NextResponse.json(
      { error: "Failed to fetch contractor" },
      { status: 500 }
    );
  }
}

// PUT /api/contractors/:id - Update contractor
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageContractors(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, email, contractorDepartment, isActive } = body;

    // Verify contractor exists
    const existingContractor = await prisma.user.findUnique({
      where: { id, role: "contractor" },
    });

    if (!existingContractor) {
      return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
    }

    // Validate department if provided
    if (contractorDepartment) {
      const validDepartments: ContractorDepartment[] = ["it", "marketing", "content"];
      if (!validDepartments.includes(contractorDepartment)) {
        return NextResponse.json(
          { error: "Invalid contractor department" },
          { status: 400 }
        );
      }
    }

    // Check email uniqueness if changing email
    if (email && email !== existingContractor.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        return NextResponse.json(
          { error: "A user with this email already exists" },
          { status: 409 }
        );
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (contractorDepartment !== undefined) updateData.contractorDepartment = contractorDepartment;
    if (isActive !== undefined) updateData.isActive = isActive;

    const contractor = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        contractorDepartment: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
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

    return NextResponse.json({ contractor });
  } catch (error) {
    console.error("Failed to update contractor:", error);
    return NextResponse.json(
      { error: "Failed to update contractor" },
      { status: 500 }
    );
  }
}

// DELETE /api/contractors/:id - Delete contractor
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageContractors(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Verify contractor exists
    const existingContractor = await prisma.user.findUnique({
      where: { id, role: "contractor" },
    });

    if (!existingContractor) {
      return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
    }

    // Delete contractor (cascade will handle dealership access and requests)
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete contractor:", error);
    return NextResponse.json(
      { error: "Failed to delete contractor" },
      { status: 500 }
    );
  }
}
