import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession, isAgencyAdmin } from "@/lib/auth";
import { ActivityType } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { activityType, details, note } = body;

    // Validate activity type
    if (!Object.values(ActivityType).includes(activityType)) {
      return NextResponse.json(
        { error: "Invalid activity type" },
        { status: 400 }
      );
    }

    // Check lead exists and user can access it
    const lead = await prisma.lead.findFirst({
      where: {
        id,
        ...(isAgencyAdmin(session.role) ? {} : { dealershipId: session.dealershipId }),
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Create activity
    const activity = await prisma.activity.create({
      data: {
        leadId: id,
        userId: session.id,
        activityType,
        details: {
          ...details,
          ...(note ? { note } : {}),
        },
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    // If this is a contact attempt, update lead's attemptCount and updatedAt
    const contactAttemptTypes = [
      "call_outbound",
      "call_missed",
      "voicemail_left",
      "email_sent",
    ];

    if (contactAttemptTypes.includes(activityType)) {
      await prisma.lead.update({
        where: { id },
        data: {
          attemptCount: { increment: 1 },
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    console.error("Failed to create activity:", error);
    return NextResponse.json(
      { error: "Failed to create activity" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const activities = await prisma.activity.findMany({
      where: {
        leadId: id,
        lead: isAgencyAdmin(session.role) ? {} : { dealershipId: session.dealershipId },
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ activities });
  } catch (error) {
    console.error("Failed to fetch activities:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}
