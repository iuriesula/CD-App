import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

/**
 * GET /api/inventory/import/[jobId]
 * Get import job status and details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = await params;

    const job = await prisma.websiteImportJob.findUnique({
      where: { id: jobId },
      include: {
        dealership: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, name: true },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Check access
    if (
      session.role !== "agency_admin" &&
      job.dealershipId !== session.dealershipId
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error("Failed to get job:", error);
    return NextResponse.json(
      { error: "Failed to get job status" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/inventory/import/[jobId]
 * Cancel a running import job
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = await params;

    const job = await prisma.websiteImportJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Check access
    if (
      session.role !== "agency_admin" &&
      job.dealershipId !== session.dealershipId
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Can only cancel pending or running jobs
    if (!["pending", "discovering", "importing"].includes(job.status)) {
      return NextResponse.json(
        { error: "Job cannot be cancelled" },
        { status: 400 }
      );
    }

    // Update job status to cancelled
    await prisma.websiteImportJob.update({
      where: { id: jobId },
      data: {
        status: "cancelled",
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to cancel job:", error);
    return NextResponse.json(
      { error: "Failed to cancel job" },
      { status: 500 }
    );
  }
}
