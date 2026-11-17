import { NextResponse } from "next/server";
import {
  getClientSessionByPersonaId,
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

  const { companyId, personaId } = body || {};
  if (
    !companyId ||
    typeof companyId !== "string" ||
    !personaId ||
    typeof personaId !== "string"
  ) {
    return NextResponse.json(
      { active: false, reason: "Invalid session identifiers." },
      { status: 400 }
    );
  }

  try {
    const session = getClientSessionByPersonaId(companyId, personaId);
    if (!session) {
      return NextResponse.json(
        { active: false, reason: "Persona or company access was revoked." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        active: true,
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
      return NextResponse.json(
        { active: false, reason: err.message },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: "Failed to verify client session." },
      { status: 500 }
    );
  }
}
