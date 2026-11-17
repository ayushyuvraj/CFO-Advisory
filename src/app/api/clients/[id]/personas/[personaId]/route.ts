import { NextResponse } from "next/server";
import { deletePersona, updatePersona } from "@/lib/governance/store";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string; personaId: string }> }
) {
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
  _request: Request,
  context: { params: Promise<{ id: string; personaId: string }> }
) {
  try {
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
    console.error("[API /api/clients/[id]/personas/[personaId] DELETE] Error:", err);
    return NextResponse.json(
      { error: "Failed to delete persona." },
      { status: 500 }
    );
  }
}
