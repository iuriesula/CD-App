import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession, canAccessDealership } from "@/lib/auth";
import {
  canCreateRequests,
  getContractorDealerships,
} from "@/lib/permissions";
import { ContractorDepartment, RequestPriority, RequestStatus } from "@prisma/client";

// GET /api/requests - List requests
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dealershipId = searchParams.get("dealershipId");
    const status = searchParams.get("status") as RequestStatus | null;
    const department = searchParams.get("department") as ContractorDepartment | null;
    const assignedToMe = searchParams.get("assignedToMe") === "true";

    const where: any = {};

    // Filter based on user role
    if (session.role === "contractor") {
      // Contractors see requests in their department for dealerships they have access to
      const contractorDealerships = await getContractorDealerships(session.id);

      where.dealershipId = {
        in: contractorDealerships,
      };

      // Get contractor's department
      const contractor = await prisma.user.findUnique({
        where: { id: session.id },
        select: { contractorDepartment: true },
      });

      if (contractor?.contractorDepartment) {
        where.department = contractor.contractorDepartment;
      }

      // Filter by assigned to me
      if (assignedToMe) {
        where.assignedToId = session.id;
      }
    } else if (session.role === "agency_admin") {
      // Agency admins can see all requests or filter by dealership
      if (dealershipId) {
        where.dealershipId = dealershipId;
      }
    } else {
      // Dealership users see only their dealership's requests
      if (!session.dealershipId) {
        return NextResponse.json({ requests: [] });
      }
      where.dealershipId = session.dealershipId;
    }

    // Apply additional filters
    if (status) {
      where.status = status;
    }

    if (department) {
      where.department = department;
    }

    const requests = await prisma.request.findMany({
      where,
      select: {
        id: true,
        dealershipId: true,
        department: true,
        title: true,
        description: true,
        priority: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        closedAt: true,
        dealership: {
          select: {
            id: true,
            name: true,
          },
        },
        requestedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            contractorDepartment: true,
          },
        },
        _count: {
          select: {
            messages: true,
            attachments: true,
          },
        },
      },
      orderBy: [
        { status: "asc" },
        { priority: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Failed to fetch requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch requests" },
      { status: 500 }
    );
  }
}

// POST /api/requests - Create a new request
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only dealership users can create requests
    if (!canCreateRequests(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { dealershipId: bodyDealershipId, department, title, description, priority } = body;

    // For non-agency_admin users, use their dealershipId automatically
    let dealershipId = bodyDealershipId;
    if (session.role !== "agency_admin") {
      if (!session.dealershipId) {
        return NextResponse.json(
          { error: "User is not associated with a dealership" },
          { status: 400 }
        );
      }
      dealershipId = session.dealershipId;
    }

    // Validate required fields
    if (!dealershipId || !department || !title || !description) {
      return NextResponse.json(
        { error: "dealershipId, department, title, and description are required" },
        { status: 400 }
      );
    }

    // Validate dealership access
    if (!canAccessDealership(session.role, session.dealershipId, dealershipId)) {
      return NextResponse.json(
        { error: "You don't have access to this dealership" },
        { status: 403 }
      );
    }

    // Validate department
    const validDepartments: ContractorDepartment[] = ["it", "marketing", "content"];
    if (!validDepartments.includes(department)) {
      return NextResponse.json(
        { error: "Invalid department" },
        { status: 400 }
      );
    }

    // Validate priority
    const validPriorities: RequestPriority[] = ["low", "normal", "high", "urgent"];
    const requestPriority: RequestPriority = priority || "normal";
    if (!validPriorities.includes(requestPriority)) {
      return NextResponse.json(
        { error: "Invalid priority" },
        { status: 400 }
      );
    }

    // Create request
    const newRequest = await prisma.request.create({
      data: {
        dealershipId,
        department,
        title,
        description,
        priority: requestPriority,
        requestedById: session.id,
      },
      include: {
        dealership: {
          select: {
            id: true,
            name: true,
          },
        },
        requestedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            contractorDepartment: true,
          },
        },
      },
    });

    return NextResponse.json({ request: newRequest }, { status: 201 });
  } catch (error) {
    console.error("Failed to create request:", error);
    return NextResponse.json(
      { error: "Failed to create request" },
      { status: 500 }
    );
  }
}
