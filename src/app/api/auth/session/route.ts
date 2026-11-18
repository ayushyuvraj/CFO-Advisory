import { NextRequest, NextResponse } from "next/server";
import {
  clearSessionCookie,
  resolveVerifiedActor,
  SessionAuthError,
} from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { authUser } = resolveVerifiedActor(request);
    return NextResponse.json(
      {
        active: true,
        user: authUser,
      },
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof SessionAuthError) {
      const res = NextResponse.json(
        { active: false, reason: err.message },
        { status: err.status }
      );
      if (err.status === 401 || err.status === 403 || err.status === 404) {
        clearSessionCookie(res);
      }
      return res;
    }
    return NextResponse.json(
      { error: "Failed to verify client session." },
      { status: 500 }
    );
  }
}
