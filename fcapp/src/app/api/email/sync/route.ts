import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { syncDealershipEmails } from "@/lib/email-receive";

// POST /api/email/sync - Trigger email sync for dealership
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.dealershipId) {
      return NextResponse.json({ error: "No dealership assigned" }, { status: 400 });
    }

    // Any authenticated user can trigger sync for their dealership

    const result = await syncDealershipEmails(session.dealershipId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Sync failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      newEmails: result.newEmails,
      newLeads: result.newLeads,
    });
  } catch (error) {
    console.error("Email sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync emails" },
      { status: 500 }
    );
  }
}
