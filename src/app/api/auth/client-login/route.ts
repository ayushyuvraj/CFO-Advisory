import { NextResponse } from "next/server";
import {
  authenticateClientPersona,
  SuspendedCompanyError,
} from "@/lib/governance/store";
import {
  checkLoginRateLimit,
  clearLoginFailures,
  recordLoginFailure,
  setSessionCookie,
} from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
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

  try {
    const { email, passcode } = body;

    if (
      !email ||
      typeof email !== "string" ||
      !email.trim() ||
      !passcode ||
      typeof passcode !== "string" ||
      !passcode.trim()
    ) {
      return NextResponse.json(
        { error: "Both email and passcode are required." },
        { status: 400 }
      );
    }

    const rateKey = `client:${email.trim().toLowerCase()}`;
    const rate = checkLoginRateLimit(rateKey);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `Too many failed sign-in attempts. Please wait ${rate.retryAfterSec}s and try again.`,
        },
        { status: 429 }
      );
    }

    const session = authenticateClientPersona(email, passcode);
    if (!session) {
      recordLoginFailure(rateKey);
      return NextResponse.json(
        {
          error:
            "Invalid client credentials. Please verify your email and passcode.",
        },
        { status: 401 }
      );
    }

    clearLoginFailures(rateKey);

    const user = {
      id: session.persona.id,
      name: session.persona.name,
      role: session.persona.roleTitle,
      email: session.persona.email,
      method: "client_credentials" as const,
      badge: `Client: ${session.company.name}`,
      tenantType: "client" as const,
      companyId: session.company.id,
      companyName: session.company.name,
      personaId: session.persona.id,
      permissions: session.persona.permissions,
      allowedProductIds: session.allowedProductIds,
    };

    const res = NextResponse.json({ user }, { status: 200 });
    setSessionCookie(res, {
      kind: "client",
      userId: session.persona.id,
      email: session.persona.email,
      companyId: session.company.id,
      personaId: session.persona.id,
    });
    return res;
  } catch (err) {
    if (err instanceof SuspendedCompanyError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("[API /api/auth/client-login POST] Error:", err);
    return NextResponse.json(
      { error: "Authentication failed. Please contact your administrator." },
      { status: 500 }
    );
  }
}
