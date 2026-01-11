import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { importWebsiteVehicles } from "@/lib/scraper";

/**
 * POST /api/inventory/import
 * Start a new import job
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and agency admins can import
    if (session.role !== "manager" && session.role !== "agency_admin") {
      return NextResponse.json(
        { error: "Only managers can import vehicles" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { websiteUrl, listingPath = "/listing/", selectedUrls } = body;

    if (!websiteUrl) {
      return NextResponse.json(
        { error: "Website URL is required" },
        { status: 400 }
      );
    }

    // Validate URL format
    let normalizedUrl: string;
    try {
      const url = new URL(websiteUrl);
      normalizedUrl = url.origin;
    } catch {
      return NextResponse.json(
        { error: "Invalid website URL" },
        { status: 400 }
      );
    }

    // Get dealership ID
    const dealershipId = body.dealershipId || session.dealershipId;
    if (!dealershipId) {
      return NextResponse.json(
        { error: "Dealership ID is required" },
        { status: 400 }
      );
    }

    // Check for existing running job
    const existingJob = await prisma.websiteImportJob.findFirst({
      where: {
        dealershipId,
        status: { in: ["pending", "discovering", "importing"] },
      },
    });

    if (existingJob) {
      return NextResponse.json(
        { error: "An import is already in progress for this dealership" },
        { status: 409 }
      );
    }

    // Create import job
    const job = await prisma.websiteImportJob.create({
      data: {
        dealershipId,
        userId: session.id,
        websiteUrl: normalizedUrl,
        listingPath,
        status: "pending",
      },
    });

    // Start import in background (don't await)
    importWebsiteVehicles(
      normalizedUrl,
      listingPath,
      dealershipId,
      session.id,
      job.id,
      undefined, // onProgress callback
      selectedUrls // optional array of selected vehicle URLs
    ).catch((error) => {
      console.error("Background import failed:", error);
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: "pending",
    });
  } catch (error) {
    console.error("Import start failed:", error);
    return NextResponse.json(
      { error: "Failed to start import" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/inventory/import
 * List recent import jobs
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dealershipId = session.dealershipId;

    // Build where clause
    const where: { dealershipId?: string } = {};
    if (session.role !== "agency_admin" && dealershipId) {
      where.dealershipId = dealershipId;
    }

    const jobs = await prisma.websiteImportJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        status: true,
        websiteUrl: true,
        totalVehicles: true,
        processedCount: true,
        createdCount: true,
        updatedCount: true,
        errorCount: true,
        createdAt: true,
        completedAt: true,
        dealership: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("Failed to list import jobs:", error);
    return NextResponse.json(
      { error: "Failed to list import jobs" },
      { status: 500 }
    );
  }
}
