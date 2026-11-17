import { NextResponse } from "next/server";
import {
  authenticateClientPersona,
  SuspendedCompanyError,
} from "@/lib/governance/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  try {
    const { email, passcode } = body || {};

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

    const session = authenticateClientPersona(email, passcode);
    if (!session) {
      return NextResponse.json(
        {
          error:
            "Invalid client credentials. Please verify your email and passcode.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        user: {
          id: session.persona.id,
          name: session.persona.name,
          role: session.persona.roleTitle,
          email: session.persona.email,
          method: "client_credentials",
          badge: `Client: ${session.company.name}`,
          tenantType: "client",
          companyId: session.company.id,
          companyName: session.company.name,
          personaId: session.persona.id,
          permissions: session.persona.permissions,
          allowedProductIds: session.allowedProductIds,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof SuspendedCompanyError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("[API /api/auth/client-login POST] Error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Authentication failed. Please contact your administrator.",
      },
      { status: 500 }
    );
  }
}
