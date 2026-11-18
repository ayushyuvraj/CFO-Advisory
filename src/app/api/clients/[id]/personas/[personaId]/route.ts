import { NextRequest, NextResponse } from "next/server";
import { deletePersona, updatePersona } from "@/lib/governance/store";
import { requireKpmgAdmin, SessionAuthError } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; personaId: string }> }
) {
  try {
    requireKpmgAdmin(request);
  } catch (err) {
    if (err instanceof SessionAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

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
    const { id: companyId, personaId } = await context.params;
    const updated = updatePersona(companyId, personaId, body);
    if (!updated) {
      return NextResponse.json(
        { error: "Persona not found for this company." },
        { status: 404 }
      );
    }

    return NextResponse.json({ persona: updated }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to update persona.",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; personaId: string }> }
) {
  try {
    requireKpmgAdmin(request);
    const { id: companyId, personaId } = await context.params;
    const deleted = deletePersona(companyId, personaId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Persona not found or already deleted." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Persona revoked and deleted successfully." },
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof SessionAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[API /api/clients/[id]/personas/[personaId] DELETE] Error:", err);
    return NextResponse.json(
      { error: "Failed to delete persona." },
      { status: 500 }
    );
  }
}
