import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession, isAgencyAdmin } from "@/lib/auth";

// GET /api/email/templates - List all templates for the dealership
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.dealershipId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const activeOnly = searchParams.get("activeOnly") === "true";
    const includePersonal = searchParams.get("includePersonal") !== "false";

    const where: any = {
      dealershipId: session.dealershipId,
    };

    // By default, show dealership templates and user's personal templates
    if (includePersonal) {
      where.OR = [
        { userId: null }, // Dealership-wide templates
        { userId: session.userId }, // User's personal templates
      ];
    } else {
      where.userId = null; // Only dealership-wide templates
    }

    if (category) {
      where.category = category;
    }

    if (activeOnly) {
      where.isActive = true;
    }

    const templates = await prisma.emailTemplate.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Failed to fetch email templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch email templates" },
      { status: 500 }
    );
  }
}

// POST /api/email/templates - Create a new template
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.dealershipId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, subject, bodyHtml, bodyText, category, isActive, isPersonal } = body;

    if (!name || !subject || !bodyHtml) {
      return NextResponse.json(
        { error: "Name, subject, and body HTML are required" },
        { status: 400 }
      );
    }

    // Check permissions for dealership-wide templates
    // Salespeople, managers, and agency admins can create dealership-wide templates
    // Only contractors are blocked
    if (!isPersonal) {
      if (session.role === "contractor") {
        return NextResponse.json(
          { error: "Contractors cannot create dealership-wide templates" },
          { status: 403 }
        );
      }
    }

    const template = await prisma.emailTemplate.create({
      data: {
        dealershipId: session.dealershipId,
        userId: isPersonal ? session.userId : null,
        name,
        subject,
        bodyHtml,
        bodyText: bodyText || null,
        category: category || "custom",
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("Failed to create email template:", error);
    return NextResponse.json(
      { error: "Failed to create email template" },
      { status: 500 }
    );
  }
}
