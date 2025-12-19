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

    const where: any = {
      dealershipId: session.dealershipId,
    };

    if (category) {
      where.category = category;
    }

    if (activeOnly) {
      where.isActive = true;
    }

    const templates = await prisma.emailTemplate.findMany({
      where,
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

    // Only managers and agency admins can create templates
    if (session.role !== "manager" && !isAgencyAdmin(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, subject, bodyHtml, bodyText, category, isActive } = body;

    if (!name || !subject || !bodyHtml) {
      return NextResponse.json(
        { error: "Name, subject, and body HTML are required" },
        { status: 400 }
      );
    }

    const template = await prisma.emailTemplate.create({
      data: {
        dealershipId: session.dealershipId,
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
