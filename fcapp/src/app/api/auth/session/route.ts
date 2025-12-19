import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// GET /api/auth/session - Get current session info
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ session: null });
    }

    return NextResponse.json({
      session: {
        userId: session.id,
        id: session.id,
        email: session.email,
        name: session.name,
        role: session.role,
        dealershipId: session.dealershipId,
        mustChangePassword: session.mustChangePassword,
      },
    });
  } catch (error) {
    console.error("Failed to get session:", error);
    return NextResponse.json({ session: null });
  }
}
