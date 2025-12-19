import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/email/[id] - Get single email
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.dealershipId) {
      return NextResponse.json({ error: "No dealership assigned" }, { status: 400 });
    }

    const { id } = await params;

    const email = await prisma.email.findFirst({
      where: {
        id,
        dealershipId: session.dealershipId,
      },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            primaryEmail: true,
            primaryPhone: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    return NextResponse.json(email);
  } catch (error) {
    console.error("Failed to fetch email:", error);
    return NextResponse.json(
      { error: "Failed to fetch email" },
      { status: 500 }
    );
  }
}

// PATCH /api/email/[id] - Update email (link to lead)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.dealershipId) {
      return NextResponse.json({ error: "No dealership assigned" }, { status: 400 });
    }

    const { id } = await params;
    const body = await request.json();
    const { leadId } = body;

    // Verify email belongs to dealership
    const email = await prisma.email.findFirst({
      where: {
        id,
        dealershipId: session.dealershipId,
      },
    });

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    // If linking to a lead, verify lead belongs to dealership
    if (leadId) {
      const lead = await prisma.lead.findFirst({
        where: {
          id: leadId,
          dealershipId: session.dealershipId,
        },
      });

      if (!lead) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 });
      }
    }

    const updatedEmail = await prisma.email.update({
      where: { id },
      data: { leadId: leadId || null },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            primaryEmail: true,
          },
        },
      },
    });

    // Create activity if linking to a lead
    if (leadId && !email.leadId) {
      await prisma.activity.create({
        data: {
          leadId,
          userId: session.id,
          activityType: "email_linked",
          details: {
            emailId: id,
            subject: email.subject,
            direction: email.direction,
          },
        },
      });
    }

    return NextResponse.json(updatedEmail);
  } catch (error) {
    console.error("Failed to update email:", error);
    return NextResponse.json(
      { error: "Failed to update email" },
      { status: 500 }
    );
  }
}

// PUT /api/email/[id] - Update email properties (isRead, etc)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.dealershipId) {
      return NextResponse.json({ error: "No dealership assigned" }, { status: 400 });
    }

    const { id } = await params;
    const body = await request.json();
    const { isRead, isImportant, folder, leadId } = body;

    // Verify email belongs to dealership
    const email = await prisma.email.findFirst({
      where: {
        id,
        dealershipId: session.dealershipId,
      },
    });

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (typeof isRead === "boolean") {
      updateData.isRead = isRead;
    }
    if (typeof isImportant === "boolean") {
      updateData.isImportant = isImportant;
    }
    // Allow setting folder to "spam", "trash", or null (to restore)
    if (folder !== undefined) {
      updateData.folder = folder === "spam" || folder === "trash" ? folder : null;
    }
    // Allow linking to a lead
    if (leadId !== undefined) {
      updateData.leadId = leadId || null;
    }

    const updatedEmail = await prisma.email.update({
      where: { id },
      data: updateData,
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            primaryEmail: true,
          },
        },
      },
    });

    return NextResponse.json(updatedEmail);
  } catch (error) {
    console.error("Failed to update email:", error);
    return NextResponse.json(
      { error: "Failed to update email" },
      { status: 500 }
    );
  }
}
