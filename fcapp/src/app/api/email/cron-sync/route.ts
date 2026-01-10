import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { syncDealershipEmails } from "@/lib/email-receive";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Cron endpoint to sync emails for all dealerships
 *
 * Call this from an external scheduler (cron, Windows Task Scheduler, etc.)
 * Example: curl -X POST http://localhost:3100/api/email/cron-sync -H "x-cron-secret: your-secret"
 *
 * CRON_SECRET is REQUIRED in production for security
 */
export async function POST(request: NextRequest) {
  // Rate limit: 2 requests per minute (prevent abuse/misconfiguration)
  const rateLimitResult = await rateLimit(request, {
    maxRequests: 2,
    windowMs: 60 * 1000, // 1 minute
  });

  if (rateLimitResult) {
    return rateLimitResult; // Returns 429 if rate limited
  }

  const isProduction = process.env.NODE_ENV === "production";

  // In production, CRON_SECRET is mandatory
  if (isProduction && !env.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured in production" },
      { status: 401 }
    );
  }

  // Verify cron secret
  if (env.CRON_SECRET) {
    const providedSecret = request.headers.get("x-cron-secret");
    if (providedSecret !== env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // Get all dealerships with email sync enabled
    const dealerships = await prisma.dealership.findMany({
      where: {
        emailSyncEnabled: true,
        imapHost: { not: null },
        imapUser: { not: null },
        imapPassword: { not: null },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const results: {
      dealershipId: string;
      name: string;
      success: boolean;
      newEmails: number;
      newLeads: number;
      error?: string;
    }[] = [];

    // Sync each dealership sequentially to avoid overwhelming IMAP servers
    for (const dealership of dealerships) {
      const result = await syncDealershipEmails(dealership.id);
      results.push({
        dealershipId: dealership.id,
        name: dealership.name,
        ...result,
      });
    }

    const totalNewEmails = results.reduce((sum, r) => sum + r.newEmails, 0);
    const totalNewLeads = results.reduce((sum, r) => sum + r.newLeads, 0);
    const failedCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      summary: {
        dealershipsProcessed: dealerships.length,
        dealershipsFailed: failedCount,
        totalNewEmails,
        totalNewLeads,
      },
      results,
    });
  } catch (error) {
    console.error("Cron sync failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}

// Also allow GET for easy testing in browser (only in development)
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Use POST in production" }, { status: 405 });
  }
  return POST(request);
}
