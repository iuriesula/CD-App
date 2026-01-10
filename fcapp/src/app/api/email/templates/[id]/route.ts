import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession, isAgencyAdmin } from "@/lib/auth";

// GET /api/email/templates/[id] - Get a single template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !session.dealershipId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const template = await prisma.emailTemplate.findFirst({
      where: {
        id,
        dealershipId: session.dealershipId,
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Failed to fetch email template:", error);
    return NextResponse.json(
      { error: "Failed to fetch email template" },
      { status: 500 }
    );
  }
}

// PUT /api/email/templates/[id] - Update a template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !session.dealershipId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.emailTemplate.findFirst({
      where: {
        id,
        dealershipId: session.dealershipId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Check permissions: users can only edit their own personal templates or dealership templates if manager
    if (existing.userId) {
      // Personal template - can only be edited by owner
      if (existing.userId !== session.userId) {
        return NextResponse.json({ error: "You can only edit your own templates" }, { status: 403 });
      }
    } else {
      // Dealership-wide template - salespeople, managers, and agency admins can edit
      if (session.role === "contractor") {
        return NextResponse.json({ error: "Contractors cannot edit dealership-wide templates" }, { status: 403 });
      }
    }

    const body = await request.json();
    const { name, subject, bodyHtml, bodyText, category, isActive } = body;

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        subject: subject !== undefined ? subject : existing.subject,
        bodyHtml: bodyHtml !== undefined ? bodyHtml : existing.bodyHtml,
        bodyText: bodyText !== undefined ? bodyText : existing.bodyText,
        category: category !== undefined ? category : existing.category,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      },
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Failed to update email template:", error);
    return NextResponse.json(
      { error: "Failed to update email template" },
      { status: 500 }
    );
  }
}

// DELETE /api/email/templates/[id] - Delete a template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !session.dealershipId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.emailTemplate.findFirst({
      where: {
        id,
        dealershipId: session.dealershipId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Check permissions: users can only delete their own personal templates or dealership templates if manager
    if (existing.userId) {
      // Personal template - can only be deleted by owner
      if (existing.userId !== session.userId) {
        return NextResponse.json({ error: "You can only delete your own templates" }, { status: 403 });
      }
    } else {
      // Dealership-wide template - salespeople, managers, and agency admins can delete
      if (session.role === "contractor") {
        return NextResponse.json({ error: "Contractors cannot delete dealership-wide templates" }, { status: 403 });
      }
    }

    await prisma.emailTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete email template:", error);
    return NextResponse.json(
      { error: "Failed to delete email template" },
      { status: 500 }
    );
  }
}
