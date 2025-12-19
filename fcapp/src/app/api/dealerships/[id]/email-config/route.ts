import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession, isAgencyAdmin } from "@/lib/auth";

// GET /api/dealerships/[id]/email-config - Get email configuration
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check access: agency admins or managers of the dealership
    if (!isAgencyAdmin(session.role)) {
      if (session.role !== "manager" || session.dealershipId !== id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const dealership = await prisma.dealership.findUnique({
      where: { id },
      select: {
        id: true,
        // SMTP config
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpSecure: true,
        emailFromName: true,
        emailFromAddress: true,
        // IMAP config
        imapHost: true,
        imapPort: true,
        imapUser: true,
        imapSecure: true,
        // Sync settings
        emailSyncEnabled: true,
        lastEmailSync: true,
      },
    });

    if (!dealership) {
      return NextResponse.json({ error: "Dealership not found" }, { status: 404 });
    }

    // Don't expose passwords - just indicate if they're set
    return NextResponse.json({
      config: {
        ...dealership,
        smtpPasswordSet: !!(await hasSmtpPassword(id)),
        imapPasswordSet: !!(await hasImapPassword(id)),
      },
    });
  } catch (error) {
    console.error("Failed to fetch email config:", error);
    return NextResponse.json(
      { error: "Failed to fetch email configuration" },
      { status: 500 }
    );
  }
}

// PUT /api/dealerships/[id]/email-config - Update email configuration
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check access: agency admins or managers of the dealership
    if (!isAgencyAdmin(session.role)) {
      if (session.role !== "manager" || session.dealershipId !== id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await request.json();
    const {
      // SMTP config
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword,
      smtpSecure,
      emailFromName,
      emailFromAddress,
      // IMAP config
      imapHost,
      imapPort,
      imapUser,
      imapPassword,
      imapSecure,
      // Sync settings
      emailSyncEnabled,
    } = body;

    // Build update data - only include password if provided
    const updateData: any = {
      smtpHost: smtpHost || null,
      smtpPort: smtpPort || null,
      smtpUser: smtpUser || null,
      smtpSecure: smtpSecure ?? true,
      emailFromName: emailFromName || null,
      emailFromAddress: emailFromAddress || null,
      imapHost: imapHost || null,
      imapPort: imapPort || null,
      imapUser: imapUser || null,
      imapSecure: imapSecure ?? true,
      emailSyncEnabled: emailSyncEnabled ?? false,
    };

    // Only update passwords if provided (non-empty)
    if (smtpPassword) {
      updateData.smtpPassword = smtpPassword;
    }
    if (imapPassword) {
      updateData.imapPassword = imapPassword;
    }

    const dealership = await prisma.dealership.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpSecure: true,
        emailFromName: true,
        emailFromAddress: true,
        imapHost: true,
        imapPort: true,
        imapUser: true,
        imapSecure: true,
        emailSyncEnabled: true,
        lastEmailSync: true,
      },
    });

    return NextResponse.json({
      config: {
        ...dealership,
        smtpPasswordSet: !!(await hasSmtpPassword(id)),
        imapPasswordSet: !!(await hasImapPassword(id)),
      },
    });
  } catch (error) {
    console.error("Failed to update email config:", error);
    return NextResponse.json(
      { error: "Failed to update email configuration" },
      { status: 500 }
    );
  }
}

// Helper to check if SMTP password is set
async function hasSmtpPassword(dealershipId: string): Promise<boolean> {
  const result = await prisma.dealership.findUnique({
    where: { id: dealershipId },
    select: { smtpPassword: true },
  });
  return !!result?.smtpPassword;
}

// Helper to check if IMAP password is set
async function hasImapPassword(dealershipId: string): Promise<boolean> {
  const result = await prisma.dealership.findUnique({
    where: { id: dealershipId },
    select: { imapPassword: true },
  });
  return !!result?.imapPassword;
}
