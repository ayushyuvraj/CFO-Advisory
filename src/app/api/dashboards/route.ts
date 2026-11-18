import { NextRequest, NextResponse } from "next/server";
import {
  canActorCreateDashboard,
  createDashboard,
  DashboardStoreError,
  listDashboardsForActor,
} from "@/lib/dashboards/store";
import { CreateDashboardInput } from "@/lib/dashboards/types";
import { ActorAuthError, resolveDashboardActor } from "./actor";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const actor = resolveDashboardActor(req);
    const dashboards = listDashboardsForActor(actor);
    return NextResponse.json({
      dashboards,
      canCreate: canActorCreateDashboard(actor),
      canExport: actor.tenantType === "kpmg" || actor.permissions.canExportData,
    });
  } catch (err) {
    if (err instanceof ActorAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[API /api/dashboards GET] Error:", err);
    return NextResponse.json(
      { error: "Failed to list dashboards." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  let actor;
  try {
    actor = resolveDashboardActor(req);
  } catch (err) {
    if (err instanceof ActorAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canActorCreateDashboard(actor)) {
    return NextResponse.json(
      {
        error: actor.isPreviewMode
          ? "Dashboard creation is disabled during read-only Preview Mode."
          : "Your persona does not have permission to create dashboards.",
      },
      { status: 403 }
    );
  }

  let body: CreateDashboardInput;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }
    body = parsed as CreateDashboardInput;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  try {
    const dashboard = createDashboard(actor, body);
    return NextResponse.json({ dashboard }, { status: 201 });
  } catch (err) {
    if (err instanceof DashboardStoreError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[API /api/dashboards POST] Error:", err);
    return NextResponse.json(
      { error: "Failed to create dashboard." },
      { status: 500 }
    );
  }
}
