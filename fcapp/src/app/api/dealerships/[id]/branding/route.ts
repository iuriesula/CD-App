import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET - Get branding settings
export async function GET(request: NextRequest, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: dealershipId } = await context.params;

  // Verify user belongs to this dealership
  if (session.dealershipId !== dealershipId && session.role !== "agency_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dealership = await prisma.dealership.findUnique({
    where: { id: dealershipId },
    select: {
      logoUrl: true,
      brandColor: true,
    },
  });

  if (!dealership) {
    return NextResponse.json({ error: "Dealership not found" }, { status: 404 });
  }

  return NextResponse.json(dealership);
}

// PUT - Update branding settings
export async function PUT(request: NextRequest, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: dealershipId } = await context.params;

  // Verify user belongs to this dealership and has permission
  if (session.dealershipId !== dealershipId && session.role !== "agency_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (session.role !== "manager" && session.role !== "agency_admin") {
    return NextResponse.json({ error: "Only managers can update branding" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { logoUrl, brandColor } = body;

    // Validate brand color if provided
    if (brandColor && !/^#[0-9A-Fa-f]{6}$/.test(brandColor)) {
      return NextResponse.json(
        { error: "Invalid brand color. Use hex format: #RRGGBB" },
        { status: 400 }
      );
    }

    const updateData: { logoUrl?: string | null; brandColor?: string | null } = {};

    if (logoUrl !== undefined) {
      updateData.logoUrl = logoUrl || null;
    }
    if (brandColor !== undefined) {
      updateData.brandColor = brandColor || null;
    }

    const dealership = await prisma.dealership.update({
      where: { id: dealershipId },
      data: updateData,
      select: {
        logoUrl: true,
        brandColor: true,
      },
    });

    return NextResponse.json(dealership);
  } catch (error) {
    console.error("Branding update failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 500 }
    );
  }
}
