import { NextRequest, NextResponse } from "next/server";
import {
  buildKpmgAuthUser,
  checkLoginRateLimit,
  clearLoginFailures,
  recordLoginFailure,
  setSessionCookie,
  verifyKpmgLeadCredentials,
} from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const passcode = typeof body.passcode === "string" ? body.passcode.trim() : "";

  if (!email || !passcode) {
    return NextResponse.json(
      { error: "Please enter your KPMG advisory email and passcode." },
      { status: 400 }
    );
  }

  const rateKey = `kpmg:${email.toLowerCase()}`;
  const rate = checkLoginRateLimit(rateKey);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Too many failed sign-in attempts. Please wait ${rate.retryAfterSec}s and try again.`,
      },
      { status: 429 }
    );
  }

  if (!verifyKpmgLeadCredentials(email, passcode)) {
    recordLoginFailure(rateKey);
    return NextResponse.json(
      {
        error:
          "Invalid advisory credentials. Please verify your email and passcode.",
      },
      { status: 401 }
    );
  }

  clearLoginFailures(rateKey);
  const user = buildKpmgAuthUser();
  const res = NextResponse.json({ user }, { status: 200 });
  setSessionCookie(res, {
    kind: "kpmg",
    userId: user.id,
    email: user.email,
  });
  return res;
}
