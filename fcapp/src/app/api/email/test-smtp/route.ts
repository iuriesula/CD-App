import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { testSmtpConnection, EmailConfig } from "@/lib/email";

// POST /api/email/test-smtp - Test SMTP connection
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and agency admins can test connections
    if (session.role !== "manager" && session.role !== "agency_admin") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const { host, port, user, password, secure } = body;

    if (!host || !user || !password) {
      return NextResponse.json(
        { error: "Host, user, and password are required" },
        { status: 400 }
      );
    }

    const config: EmailConfig = {
      host,
      port: port || 587,
      user,
      password,
      secure: secure ?? true,
    };

    const result = await testSmtpConnection(config);

    return NextResponse.json(result);
  } catch (error) {
    console.error("SMTP test error:", error);
    return NextResponse.json(
      { success: false, error: "Connection test failed" },
      { status: 500 }
    );
  }
}
