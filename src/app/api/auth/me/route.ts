import { NextRequest, NextResponse } from "next/server";
import {
  clearSessionCookie,
  resolveVerifiedActor,
  SessionAuthError,
} from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { authUser } = resolveVerifiedActor(req);
    return NextResponse.json(
      { active: true, user: authUser },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (err) {
    if (err instanceof SessionAuthError) {
      const res = NextResponse.json(
        { active: false, reason: err.message },
        { status: err.status === 401 ? 200 : err.status }
      );
      if (err.status === 403 || err.status === 404) {
        clearSessionCookie(res);
      }
      return res;
    }
    return NextResponse.json(
      { active: false, reason: "Failed to verify session." },
      { status: 500 }
    );
  }
}
