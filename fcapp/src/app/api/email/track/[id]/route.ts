import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// 1x1 transparent PNG
const TRACKING_PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

// GET /api/email/track/[id] - Record email open and return tracking pixel
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Update email as opened (only if not already opened)
  try {
    await prisma.email.updateMany({
      where: {
        id,
        openedAt: null, // Only update if not already tracked
        direction: "outbound", // Only track outbound emails
      },
      data: {
        openedAt: new Date(),
      },
    });
  } catch (error) {
    // Silently fail - don't want to break email rendering
    console.error("Failed to track email open:", error);
  }

  // Return transparent 1x1 PNG
  return new NextResponse(TRACKING_PIXEL, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
