import { NextRequest, NextResponse } from "next/server";
import {
  createPersona,
  getCompanyById,
  getCompanyPersonas,
  isValidEmail,
} from "@/lib/governance/store";
import { requireKpmgAdmin, SessionAuthError } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    requireKpmgAdmin(request);
    const { id: companyId } = await context.params;
    const company = getCompanyById(companyId);
    if (!company) {
      return NextResponse.json(
        { error: "Company profile not found." },
        { status: 404 }
      );
    }

    const personas = getCompanyPersonas(companyId);
    return NextResponse.json({ personas }, { status: 200 });
  } catch (err) {
    if (err instanceof SessionAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[API /api/clients/[id]/personas GET] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch company personas." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    requireKpmgAdmin(request);
  } catch (err) {
    if (err instanceof SessionAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
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

  try {
    const { id: companyId } = await context.params;
    const company = getCompanyById(companyId);
    if (!company) {
      return NextResponse.json(
        { error: "Company profile not found." },
        { status: 404 }
      );
    }

    const {
      name,
      roleTitle,
      email,
      passcode,
      productAccessMode,
      allowedProductIds,
      permissions,
    } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Persona name is required." },
        { status: 400 }
      );
    }

    if (!roleTitle || typeof roleTitle !== "string" || !roleTitle.trim()) {
      return NextResponse.json(
        { error: "Role title is required (e.g. Finance Manager, Client Admin)." },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 }
      );
    }

    if (!passcode || typeof passcode !== "string" || passcode.trim().length < 4) {
      return NextResponse.json(
        { error: "A passcode of at least 4 characters is required." },
        { status: 400 }
      );
    }

    const perms = (permissions && typeof permissions === "object"
      ? permissions
      : {}) as Record<string, unknown>;

    const persona = createPersona(companyId, {
      name,
      roleTitle,
      email,
      passcode,
      productAccessMode: productAccessMode === "custom" ? "custom" : "all",
      allowedProductIds: Array.isArray(allowedProductIds)
        ? allowedProductIds.filter((x): x is string => typeof x === "string")
        : [],
      permissions: {
        canLaunchProducts: Boolean(perms.canLaunchProducts),
        canViewAudit: Boolean(perms.canViewAudit),
        canManageDashboards: Boolean(perms.canManageDashboards),
        canExportData: Boolean(perms.canExportData),
      },
    });

    return NextResponse.json({ persona }, { status: 201 });
  } catch (err) {
    console.error("[API /api/clients/[id]/personas POST] Error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to create persona.",
      },
      { status: 400 }
    );
  }
}
