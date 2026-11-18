import { NextRequest, NextResponse } from "next/server";
import {
  buildKpmgAuthUser,
  readSessionFromRequest,
  resolveVerifiedActor,
  SessionAuthError,
  setSessionCookie,
} from "@/lib/auth/session";
import { getCompanyById, getCompanyPersonas } from "@/lib/governance/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
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

  const session = readSessionFromRequest(req);
  if (!session || (session.kind !== "kpmg" && session.kind !== "kpmg_preview")) {
    return NextResponse.json(
      { error: "Forbidden: only KPMG Advisory Leads can use Preview Mode." },
      { status: 403 }
    );
  }

  // Exit Preview Mode back to KPMG Lead
  if (body.action === "exit") {
    const admin = buildKpmgAuthUser();
    const res = NextResponse.json({ user: admin }, { status: 200 });
    setSessionCookie(res, {
      kind: "kpmg",
      userId: admin.id,
      email: admin.email,
    });
    return res;
  }

  // Enter Preview Mode for a specific company + persona
  const companyId = typeof body.companyId === "string" ? body.companyId.trim() : "";
  const personaId = typeof body.personaId === "string" ? body.personaId.trim() : "";
  if (!companyId || !personaId) {
    return NextResponse.json(
      { error: "companyId and personaId are required to start preview." },
      { status: 400 }
    );
  }

  const company = getCompanyById(companyId);
  const persona = getCompanyPersonas(companyId).find((p) => p.id === personaId);
  if (!company || !persona) {
    return NextResponse.json(
      { error: "Target company or persona not found." },
      { status: 404 }
    );
  }

  // Build signed preview cookie & return resolved preview AuthUser
  const fakeReq = new NextRequest(req.url, {
    headers: {
      cookie: `kpmg_cfo_session=`,
    },
  });
  void fakeReq;

  const resPayload = (() => {
    try {
      // Reuse exact resolution logic cleanly
      const tokenPayload = {
        kind: "kpmg_preview" as const,
        userId: persona.id,
        email: persona.email,
        companyId: company.id,
        personaId: persona.id,
      };
      const tempRes = NextResponse.json({});
      setSessionCookie(tempRes, tokenPayload);
      const cookieVal = tempRes.cookies.get("kpmg_cfo_session")?.value || "";
      const verifyReq = new NextRequest(req.url, {
        headers: { cookie: `kpmg_cfo_session=${cookieVal}` },
      });
      const resolved = resolveVerifiedActor(verifyReq);
      return { user: resolved.authUser, tokenPayload };
    } catch (err) {
      if (err instanceof SessionAuthError) throw err;
      throw new SessionAuthError("Unable to initialize preview session.", 500);
    }
  })();

  const res = NextResponse.json({ user: resPayload.user }, { status: 200 });
  setSessionCookie(res, resPayload.tokenPayload);
  return res;
}
