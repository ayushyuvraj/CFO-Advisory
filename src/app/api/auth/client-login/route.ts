import { NextResponse } from "next/server";
import { authenticateClientPersona } from "@/lib/governance/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, passcode } = body || {};

    if (!email || typeof email !== "string" || !passcode || typeof passcode !== "string") {
      return NextResponse.json(
        { error: "Both email and passcode are required." },
        { status: 400 }
      );
    }

    const session = authenticateClientPersona(email, passcode);
    if (!session) {
      return NextResponse.json(
        { error: "Invalid client credentials. Please verify your email and passcode." },
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
    console.error("[API /api/auth/client-login POST] Error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Authentication failed. Please contact your administrator.",
      },
      { status: 400 }
    );
  }
}
