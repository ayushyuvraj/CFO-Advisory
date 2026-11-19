import { NextRequest, NextResponse } from "next/server";
import {
  appendTelemetryEvent,
  getTelemetryEvents,
  getTelemetryMetrics,
} from "@/lib/telemetry/telemetryStore";
import { getProductByApiKey } from "@/lib/telemetry/productRegistry";
import { resolveVerifiedActor, SessionAuthError } from "@/lib/auth/session";
import { resolveCompanyAndPersona } from "@/lib/governance/quotaEngine";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const apiKey = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!apiKey) {
    return NextResponse.json(
      { error: "Unauthorized: Bearer product API key is required." },
      { status: 401 }
    );
  }

  const product = getProductByApiKey(apiKey);
  if (!product) {
    return NextResponse.json(
      { error: "Unauthorized: invalid product API key." },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json(
        { error: "Invalid JSON telemetry payload." },
        { status: 400 }
      );
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON telemetry payload." },
      { status: 400 }
    );
  }

  try {
    body.product_id = product.id;
    body.product_name = product.name;

    // Smart tenant & user identity resolution if missing, placeholder or legacy
    const rawTenant = typeof body.tenant_id === "string" ? body.tenant_id.trim() : "";
    const rawEmail = typeof body.user_email === "string" ? body.user_email.trim() : "";
    const rawPersonaId = typeof body.user_id === "string" ? body.user_id.trim() : "";

    const { company, persona } = resolveCompanyAndPersona({
      companyId: rawTenant,
      personaId: rawPersonaId,
      userEmail: rawEmail,
    });

    if (company) {
      body.tenant_id = company.id;
      if (persona) {
        body.user_id = persona.id;
        body.user_email = persona.email;
        body.user_role = "CLIENT_PERSONA";
      }
    }

    const event = appendTelemetryEvent(body);

    return NextResponse.json(
      {
        status: "accepted",
        eventId: event.id,
        traceId: event.trace_id,
        receivedAt: event.created_at,
      },
      { status: 202 }
    );
  } catch (err: unknown) {
    console.error("[API Telemetry Ingestion Error]:", err);
    return NextResponse.json(
      { error: "Failed to ingest telemetry event." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { actor } = resolveVerifiedActor(req);
    const isKpmg = actor.tenantType === "kpmg";

    if (!isKpmg && !actor.permissions.canViewAudit) {
      return NextResponse.json(
        { error: "Forbidden: your persona does not have audit telemetry access." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    const rawLimit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!, 10)
      : 50;
    const rawOffset = searchParams.get("offset")
      ? parseInt(searchParams.get("offset")!, 10)
      : 0;
    const limit = Number.isFinite(rawLimit)
      ? Math.max(1, Math.min(200, rawLimit))
      : 50;
    const offset = Number.isFinite(rawOffset)
      ? Math.max(0, Math.min(100_000, rawOffset))
      : 0;

    const allowedProductIds = isKpmg ? undefined : actor.allowedProductIds;

    const { events, total } = getTelemetryEvents({
      productId,
      allowedProductIds,
      status,
      search,
      limit,
      offset,
    });
    const metrics = getTelemetryMetrics(allowedProductIds);

    return NextResponse.json(
      {
        events,
        total,
        metrics,
        lastUpdated: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err: unknown) {
    if (err instanceof SessionAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[API Telemetry GET Error]:", err);
    return NextResponse.json(
      { error: "Failed to retrieve telemetry events." },
      { status: 500 }
    );
  }
}
