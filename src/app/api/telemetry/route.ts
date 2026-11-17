import { NextRequest, NextResponse } from "next/server";
import { appendTelemetryEvent, getTelemetryEvents, getTelemetryMetrics } from "@/lib/telemetry/telemetryStore";
import { getProductByApiKey } from "@/lib/telemetry/productRegistry";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const apiKey = authHeader.replace(/^Bearer\s+/i, "").trim();

    const product = apiKey ? getProductByApiKey(apiKey) : null;
    const body = await req.json();

    if (product) {
      body.product_id = product.id;
      body.product_name = product.name;
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
    const errorMsg = err instanceof Error ? err.message : "Internal ingestion failure";
    console.error("[API Telemetry Ingestion Error]:", errorMsg);
    return NextResponse.json(
      { error: "Failed to ingest telemetry event", details: errorMsg },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : 0;

    const { events, total } = getTelemetryEvents({ productId, status, search, limit, offset });
    const metrics = getTelemetryMetrics();

    return NextResponse.json({
      events,
      total,
      metrics,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal query failure";
    return NextResponse.json(
      { error: "Failed to retrieve telemetry events", details: errorMsg },
      { status: 500 }
    );
  }
}
