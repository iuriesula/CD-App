import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendEmail, addTrackingToHtml } from "@/lib/email";

// POST /api/email/send - Send an email
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.dealershipId) {
      return NextResponse.json({ error: "No dealership assigned" }, { status: 400 });
    }

    const body = await request.json();
    const { leadId, to, subject, bodyHtml, bodyText, inReplyTo } = body;

    if (!to || !subject) {
      return NextResponse.json(
        { error: "Recipient and subject are required" },
        { status: 400 }
      );
    }

    // Get dealership with email config
    const dealership = await prisma.dealership.findUnique({
      where: { id: session.dealershipId },
    });

    if (!dealership) {
      return NextResponse.json({ error: "Dealership not found" }, { status: 404 });
    }

    if (!dealership.smtpHost || !dealership.smtpUser) {
      return NextResponse.json(
        { error: "Email not configured for this dealership. Please set up SMTP in settings." },
        { status: 400 }
      );
    }

    // Create email record first to get ID for tracking
    const email = await prisma.email.create({
      data: {
        dealershipId: session.dealershipId,
        userId: session.id,
        leadId: leadId || null,
        direction: "outbound",
        fromAddress: dealership.emailFromAddress || dealership.smtpUser || "",
        toAddress: to,
        subject,
        bodyText: bodyText || null,
        bodyHtml: bodyHtml || null,
        inReplyTo: inReplyTo || null,
      },
    });

    // Note: Tracking pixel disabled for now as it triggers spam filters
    // To enable, set ENABLE_EMAIL_TRACKING=true in environment
    // Also requires a proper production domain (not localhost)
    let finalHtml = bodyHtml;
    if (bodyHtml && process.env.ENABLE_EMAIL_TRACKING === "true" && process.env.NEXT_PUBLIC_APP_URL) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
      // Only add tracking if we have a real production URL (not localhost)
      if (!baseUrl.includes("localhost") && !baseUrl.includes("127.0.0.1")) {
        finalHtml = addTrackingToHtml(bodyHtml, baseUrl, email.id);
      }
    }

    // Send the email
    const result = await sendEmail(dealership, {
      to,
      subject,
      text: bodyText,
      html: finalHtml,
      inReplyTo,
    });

    if (!result.success) {
      // Update email record with error (could add status field later)
      console.error("Email send failed:", result.error);
      return NextResponse.json(
        { error: result.error || "Failed to send email" },
        { status: 500 }
      );
    }

    // Update email with messageId
    await prisma.email.update({
      where: { id: email.id },
      data: { messageId: result.messageId },
    });

    // Create activity if linked to a lead
    if (leadId) {
      await prisma.activity.create({
        data: {
          leadId,
          userId: session.id,
          activityType: "email_sent",
          details: {
            emailId: email.id,
            subject,
            to,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      email: {
        id: email.id,
        messageId: result.messageId,
      },
    });
  } catch (error) {
    console.error("Failed to send email:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
