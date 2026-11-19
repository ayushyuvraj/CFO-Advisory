import { NextRequest, NextResponse } from "next/server";
import { getProductByApiKey } from "@/lib/telemetry/productRegistry";
import { resolveVerifiedActor } from "@/lib/auth/session";
import { evaluateQuotaCheck } from "@/lib/governance/quotaEngine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let authenticated = false;
  let sessionActorCompanyId: string | undefined;
  let sessionActorPersonaId: string | undefined;
  let sessionActorEmail: string | undefined;

  // 1. Check Product Bearer API Key authentication
  const authHeader = req.headers.get("authorization") || "";
  const apiKey = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (apiKey) {
    const product = getProductByApiKey(apiKey);
    if (product) {
      authenticated = true;
    }
  }

  // 2. Fallback to User Session Cookie authentication
  if (!authenticated) {
    try {
      const { actor } = resolveVerifiedActor(req);
      authenticated = true;
      sessionActorCompanyId = actor.companyId;
      sessionActorPersonaId = actor.personaId || actor.userId;
      sessionActorEmail = actor.userEmail;
    } catch {
      // not authenticated via session
    }
  }

  if (!authenticated) {
    return NextResponse.json(
      { error: "Unauthorized: Valid product API key or active session required." },
      { status: 401 }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    const parsed = await req.json();
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    // optional body
  }

  const companyId =
    (typeof body.companyId === "string" && body.companyId.trim()) ||
    sessionActorCompanyId ||
    "";

  if (!companyId) {
    return NextResponse.json(
      { error: "companyId parameter is required." },
      { status: 400 }
    );
  }

  const personaId =
    (typeof body.personaId === "string" && body.personaId.trim()) ||
    sessionActorPersonaId ||
    undefined;

  const userEmail =
    (typeof body.userEmail === "string" && body.userEmail.trim()) ||
    sessionActorEmail ||
    undefined;

  const estimatedCostUsd =
    typeof body.estimatedCostUsd === "number" && Number.isFinite(body.estimatedCostUsd)
      ? Math.max(0, body.estimatedCostUsd)
      : 0;

  const result = evaluateQuotaCheck({
    companyId,
    personaId,
    userEmail,
    estimatedCostUsd,
  });

  if (!result.allowed) {
    return NextResponse.json(
      {
        allowed: false,
        reason: result.denialReason || "Spend quota exceeded.",
        quota: result,
      },
      { status: 402 }
    );
  }

  return NextResponse.json(
    {
      allowed: true,
      quota: result,
    },
    { status: 200 }
  );
}
