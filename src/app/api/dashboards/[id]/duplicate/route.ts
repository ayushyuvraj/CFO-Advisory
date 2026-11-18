import { NextRequest, NextResponse } from "next/server";
import {
  DashboardStoreError,
  duplicateDashboard,
} from "@/lib/dashboards/store";
import { ActorAuthError, resolveDashboardActor } from "../../actor";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = resolveDashboardActor(req);
    const { id } = await context.params;
    const cloned = duplicateDashboard(actor, id);
    if (!cloned) {
      return NextResponse.json(
        { error: "Source dashboard not found or not accessible." },
        { status: 404 }
      );
    }
    return NextResponse.json({ dashboard: cloned }, { status: 201 });
  } catch (err) {
    if (err instanceof ActorAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof DashboardStoreError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[API /api/dashboards/[id]/duplicate POST] Error:", err);
    return NextResponse.json(
      { error: "Failed to duplicate dashboard." },
      { status: 500 }
    );
  }
}
