import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageContractors } from "@/lib/permissions";

// DELETE /api/contractors/:id/dealerships/:dealershipId - Remove dealership access
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; dealershipId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageContractors(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: contractorId, dealershipId } = await params;

    // Verify access exists
    const access = await prisma.contractorDealershipAccess.findUnique({
      where: {
        contractorId_dealershipId: {
          contractorId,
          dealershipId,
        },
      },
    });

    if (!access) {
      return NextResponse.json(
        { error: "Dealership access not found" },
        { status: 404 }
      );
    }

    // Delete the access
    await prisma.contractorDealershipAccess.delete({
      where: {
        contractorId_dealershipId: {
          contractorId,
          dealershipId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove dealership access:", error);
    return NextResponse.json(
      { error: "Failed to remove dealership access" },
      { status: 500 }
    );
  }
}
