import { NextRequest, NextResponse } from "next/server";
import { resolveVerifiedActor, SessionAuthError } from "@/lib/auth/session";
import { evaluateQuotaCheck } from "@/lib/governance/quotaEngine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { actor } = resolveVerifiedActor(req);

    let targetCompanyId: string | undefined = actor.companyId;
    let targetPersonaId: string | undefined = actor.personaId || actor.userId;
    let targetUserEmail: string | undefined = actor.userEmail;

    if (actor.tenantType === "kpmg") {
      const { searchParams } = new URL(req.url);
      const queryCompanyId = searchParams.get("companyId");
      if (queryCompanyId) {
        targetCompanyId = queryCompanyId;
        targetPersonaId = searchParams.get("personaId") || undefined;
        targetUserEmail = undefined;
      }
    }

    if (!targetCompanyId) {
      return NextResponse.json(
        {
          status: "none",
          message: "No client organization associated with this session.",
          quota: null,
        },
        { status: 200 }
      );
    }

    const quota = evaluateQuotaCheck({
      companyId: targetCompanyId,
      personaId: targetPersonaId,
      userEmail: targetUserEmail,
      estimatedCostUsd: 0,
    });

    return NextResponse.json({ status: "ok", quota }, { status: 200 });
  } catch (err) {
    if (err instanceof SessionAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[API /api/governance/quota/status GET] Error:", err);
    return NextResponse.json(
      { error: "Failed to resolve spend quota status." },
      { status: 500 }
    );
  }
}
