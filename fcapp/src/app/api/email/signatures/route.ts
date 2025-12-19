import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession, isAgencyAdmin } from "@/lib/auth";

// GET /api/email/signatures - List all signatures for the dealership
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.dealershipId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includePersonal = searchParams.get("includePersonal") !== "false";

    const where: any = {
      dealershipId: session.dealershipId,
    };

    // By default, show dealership signatures and user's personal signatures
    if (includePersonal) {
      where.OR = [
        { userId: null }, // Dealership-wide signatures
        { userId: session.userId }, // User's personal signatures
      ];
    } else {
      where.userId = null; // Only dealership-wide signatures
    }

    const signatures = await prisma.emailSignature.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });

    return NextResponse.json({ signatures });
  } catch (error) {
    console.error("Failed to fetch email signatures:", error);
    return NextResponse.json(
      { error: "Failed to fetch email signatures" },
      { status: 500 }
    );
  }
}

// POST /api/email/signatures - Create a new signature
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.dealershipId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, content, isDefault, isPersonal } = body;

    if (!name || !content) {
      return NextResponse.json(
        { error: "Name and content are required" },
        { status: 400 }
      );
    }

    // Check permissions for dealership-wide signatures
    if (!isPersonal) {
      if (session.role !== "manager" && !isAgencyAdmin(session.role)) {
        return NextResponse.json(
          { error: "Only managers can create dealership-wide signatures" },
          { status: 403 }
        );
      }
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      const defaultWhere: any = {
        dealershipId: session.dealershipId,
        isDefault: true,
      };

      if (isPersonal) {
        defaultWhere.userId = session.userId;
      } else {
        defaultWhere.userId = null;
      }

      await prisma.emailSignature.updateMany({
        where: defaultWhere,
        data: { isDefault: false },
      });
    }

    const signature = await prisma.emailSignature.create({
      data: {
        dealershipId: session.dealershipId,
        userId: isPersonal ? session.userId : null,
        name,
        content,
        isDefault: isDefault ?? false,
      },
    });

    return NextResponse.json({ signature }, { status: 201 });
  } catch (error) {
    console.error("Failed to create email signature:", error);
    return NextResponse.json(
      { error: "Failed to create email signature" },
      { status: 500 }
    );
  }
}
