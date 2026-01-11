import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/email/inbox - Get inbox emails for dealership
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.dealershipId) {
      return NextResponse.json({ error: "No dealership assigned" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const direction = searchParams.get("direction") as "inbound" | "outbound" | null;
    const leadId = searchParams.get("leadId");
    const unlinkedOnly = searchParams.get("unlinkedOnly") === "true";
    const folder = searchParams.get("folder") as "spam" | "trash" | "important" | null;

    const where: any = {
      dealershipId: session.dealershipId,
    };

    // Handle folder filtering
    if (folder === "spam" || folder === "trash") {
      where.folder = folder;
    } else if (folder === "important") {
      // Important folder shows all important emails (excluding spam/trash)
      where.isImportant = true;
      where.OR = [
        { folder: null },
        { folder: { notIn: ["spam", "trash"] } },
      ];
    } else {
      // For inbox/sent/all, exclude spam and trash
      // Use OR because NULL NOT IN (...) returns NULL in SQL, not TRUE
      where.OR = [
        { folder: null },
        { folder: { notIn: ["spam", "trash"] } },
      ];
    }

    if (direction) {
      where.direction = direction;
    }

    if (leadId) {
      where.leadId = leadId;
    }

    if (unlinkedOnly) {
      where.leadId = null;
    }

    // Build unread count query (inbox unread only - excludes spam/trash)
    const unreadWhere = {
      dealershipId: session.dealershipId,
      direction: "inbound" as const,
      isRead: false,
      OR: [
        { folder: null },
        { folder: { notIn: ["spam", "trash"] } },
      ],
    };

    const [emails, total, unreadCount] = await Promise.all([
      prisma.email.findMany({
        where,
        include: {
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              primaryEmail: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.email.count({ where }),
      prisma.email.count({ where: unreadWhere }),
    ]);

    return NextResponse.json({
      emails,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch emails:", error);
    return NextResponse.json(
      { error: "Failed to fetch emails" },
      { status: 500 }
    );
  }
}
