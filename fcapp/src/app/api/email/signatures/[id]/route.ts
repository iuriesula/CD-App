import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession, isAgencyAdmin } from "@/lib/auth";

// GET /api/email/signatures/[id] - Get a single signature
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !session.dealershipId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const signature = await prisma.emailSignature.findFirst({
      where: {
        id,
        dealershipId: session.dealershipId,
        OR: [
          { userId: null },
          { userId: session.userId },
        ],
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    if (!signature) {
      return NextResponse.json({ error: "Signature not found" }, { status: 404 });
    }

    return NextResponse.json({ signature });
  } catch (error) {
    console.error("Failed to fetch email signature:", error);
    return NextResponse.json(
      { error: "Failed to fetch email signature" },
      { status: 500 }
    );
  }
}

// PUT /api/email/signatures/[id] - Update a signature
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !session.dealershipId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.emailSignature.findFirst({
      where: {
        id,
        dealershipId: session.dealershipId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Signature not found" }, { status: 404 });
    }

    // Check permissions
    const isOwner = existing.userId === session.userId;
    const isDealershipWide = existing.userId === null;
    const isContractor = session.role === "contractor";

    // Contractors cannot update dealership-wide signatures
    if (isDealershipWide && isContractor) {
      return NextResponse.json(
        { error: "Contractors cannot update dealership-wide signatures" },
        { status: 403 }
      );
    }

    // Personal signatures can only be updated by owner (or managers/admins)
    if (!isDealershipWide && !isOwner && session.role !== "manager" && !isAgencyAdmin(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, content, isDefault } = body;

    // If setting as default, unset other defaults in the same scope
    if (isDefault && !existing.isDefault) {
      const defaultWhere: any = {
        dealershipId: session.dealershipId,
        isDefault: true,
      };

      if (existing.userId) {
        defaultWhere.userId = existing.userId;
      } else {
        defaultWhere.userId = null;
      }

      await prisma.emailSignature.updateMany({
        where: defaultWhere,
        data: { isDefault: false },
      });
    }

    const signature = await prisma.emailSignature.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        content: content !== undefined ? content : existing.content,
        isDefault: isDefault !== undefined ? isDefault : existing.isDefault,
      },
    });

    return NextResponse.json({ signature });
  } catch (error) {
    console.error("Failed to update email signature:", error);
    return NextResponse.json(
      { error: "Failed to update email signature" },
      { status: 500 }
    );
  }
}

// DELETE /api/email/signatures/[id] - Delete a signature
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !session.dealershipId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.emailSignature.findFirst({
      where: {
        id,
        dealershipId: session.dealershipId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Signature not found" }, { status: 404 });
    }

    // Check permissions
    const isOwner = existing.userId === session.userId;
    const isDealershipWide = existing.userId === null;
    const isContractor = session.role === "contractor";

    // Contractors cannot delete dealership-wide signatures
    if (isDealershipWide && isContractor) {
      return NextResponse.json(
        { error: "Contractors cannot delete dealership-wide signatures" },
        { status: 403 }
      );
    }

    // Personal signatures can only be deleted by owner (or managers/admins)
    if (!isDealershipWide && !isOwner && session.role !== "manager" && !isAgencyAdmin(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.emailSignature.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete email signature:", error);
    return NextResponse.json(
      { error: "Failed to delete email signature" },
      { status: 500 }
    );
  }
}
