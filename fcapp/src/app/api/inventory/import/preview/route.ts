import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { previewWebsiteVehicles } from "@/lib/scraper";

/**
 * POST /api/inventory/import/preview
 * Preview vehicles from a dealership website without importing
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
    const { websiteUrl, listingPath = "/listing/" } = body;

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
    const dealershipId = session.dealershipId;
    if (!dealershipId && session.role !== "agency_admin") {
      return NextResponse.json(
        { error: "No dealership associated with your account" },
        { status: 400 }
      );
    }

    // For agency admins, require dealershipId in request
    const targetDealershipId = body.dealershipId || dealershipId;
    if (!targetDealershipId) {
      return NextResponse.json(
        { error: "Dealership ID is required" },
        { status: 400 }
      );
    }

    // Preview vehicles
    const result = await previewWebsiteVehicles(
      normalizedUrl,
      listingPath,
      targetDealershipId
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Preview failed:", error);
    return NextResponse.json(
      { error: "Failed to preview website" },
      { status: 500 }
    );
  }
}
