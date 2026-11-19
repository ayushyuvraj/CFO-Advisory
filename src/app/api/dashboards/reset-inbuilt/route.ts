import { NextRequest, NextResponse } from "next/server";
import {
  DashboardStoreError,
  resetInbuiltDashboard,
} from "@/lib/dashboards/store";
import { ActorAuthError, resolveDashboardActor } from "../actor";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const actor = resolveDashboardActor(req);
    const dashboard = resetInbuiltDashboard(actor);
    return NextResponse.json({ dashboard, message: "Inbuilt executive dashboard reset successfully." }, { status: 200 });
  } catch (err) {
    if (err instanceof ActorAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof DashboardStoreError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[API /api/dashboards/reset-inbuilt POST] Error:", err);
    return NextResponse.json(
      { error: "Failed to reset inbuilt dashboard." },
      { status: 500 }
    );
  }
}
