import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { testImapConnection, ImapConfig } from "@/lib/email-receive";

// POST /api/email/test-imap - Test IMAP connection
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

    const config: ImapConfig = {
      host,
      port: port || 993,
      user,
      password,
      secure: secure ?? true,
    };

    const result = await testImapConnection(config);

    return NextResponse.json(result);
  } catch (error) {
    console.error("IMAP test error:", error);
    return NextResponse.json(
      { success: false, error: "Connection test failed" },
      { status: 500 }
    );
  }
}
