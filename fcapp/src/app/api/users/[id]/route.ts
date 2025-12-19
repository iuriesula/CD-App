import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession, isAgencyAdmin } from "@/lib/auth";
import bcrypt from "bcryptjs";

// PUT /api/users/[id] - Update user (toggle active status or reset password)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and agency admins can update users
    if (session.role !== "manager" && !isAgencyAdmin(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { isActive, newPassword } = body;

    // Get the user to check permissions
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, dealershipId: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Managers can only update users in their dealership
    if (!isAgencyAdmin(session.role)) {
      if (targetUser.dealershipId !== session.dealershipId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      // Managers cannot deactivate other managers or agency admins
      if (targetUser.role === "manager" || targetUser.role === "agency_admin") {
        return NextResponse.json(
          { error: "Cannot modify users with equal or higher role" },
          { status: 403 }
        );
      }
    }

    // Prevent modifying yourself
    if (targetUser.id === session.userId) {
      return NextResponse.json(
        { error: "Cannot modify your own account" },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: any = {};

    if (typeof isActive === "boolean") {
      updateData.isActive = isActive;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 }
        );
      }
      updateData.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and agency admins can delete users
    if (session.role !== "manager" && !isAgencyAdmin(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Get the user to check permissions
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, dealershipId: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Managers can only delete users in their dealership
    if (!isAgencyAdmin(session.role)) {
      if (targetUser.dealershipId !== session.dealershipId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      // Managers cannot delete other managers or agency admins
      if (targetUser.role === "manager" || targetUser.role === "agency_admin") {
        return NextResponse.json(
          { error: "Cannot delete users with equal or higher role" },
          { status: 403 }
        );
      }
    }

    // Prevent deleting yourself
    if (targetUser.id === session.userId) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
