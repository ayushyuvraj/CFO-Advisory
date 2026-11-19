import { NextRequest, NextResponse } from "next/server";
import {
  canActorEditDashboard,
  DashboardStoreError,
  deleteDashboard,
  getDashboardByIdForActor,
  updateDashboard,
} from "@/lib/dashboards/store";
import { UpdateDashboardInput } from "@/lib/dashboards/types";
import { ActorAuthError, resolveDashboardActor } from "../actor";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = resolveDashboardActor(req);
    const { id } = await context.params;
    const dashboard = getDashboardByIdForActor(actor, id);
    if (!dashboard) {
      return NextResponse.json({ error: "Dashboard not found." }, { status: 404 });
    }
    return NextResponse.json({
      dashboard,
      canEdit: canActorEditDashboard(actor, dashboard),
      canExport: actor.tenantType === "kpmg" || Boolean(actor.permissions.canManageDashboards),
    });
  } catch (err) {
    if (err instanceof ActorAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[API /api/dashboards/[id] GET] Error:", err);
    return NextResponse.json(
      { error: "Failed to load dashboard." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  let actor;
  try {
    actor = resolveDashboardActor(req);
  } catch (err) {
    if (err instanceof ActorAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: UpdateDashboardInput;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }
    body = parsed as UpdateDashboardInput;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  try {
    const { id } = await context.params;
    const updated = updateDashboard(actor, id, body);
    if (!updated) {
      return NextResponse.json({ error: "Dashboard not found." }, { status: 404 });
    }
    return NextResponse.json({ dashboard: updated });
  } catch (err) {
    if (err instanceof DashboardStoreError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[API /api/dashboards/[id] PATCH] Error:", err);
    return NextResponse.json(
      { error: "Failed to update dashboard." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = resolveDashboardActor(req);
    const { id } = await context.params;
    const deleted = deleteDashboard(actor, id);
    if (!deleted) {
      return NextResponse.json({ error: "Dashboard not found." }, { status: 404 });
    }
    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (err instanceof ActorAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof DashboardStoreError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[API /api/dashboards/[id] DELETE] Error:", err);
    return NextResponse.json(
      { error: "Failed to delete dashboard." },
      { status: 500 }
    );
  }
}
