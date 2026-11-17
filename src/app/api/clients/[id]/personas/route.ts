import { NextResponse } from "next/server";
import {
  createPersona,
  getCompanyById,
  getCompanyPersonas,
} from "@/lib/governance/store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
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
    console.error("[API /api/clients/[id]/personas GET] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch company personas." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await context.params;
    const company = getCompanyById(companyId);
    if (!company) {
      return NextResponse.json(
        { error: "Company profile not found." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      name,
      roleTitle,
      email,
      passcode,
      productAccessMode,
      allowedProductIds,
      permissions,
    } = body || {};

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

    if (!email || typeof email !== "string" || !email.includes("@")) {
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

    const persona = createPersona(companyId, {
      name,
      roleTitle,
      email,
      passcode,
      productAccessMode: productAccessMode === "custom" ? "custom" : "all",
      allowedProductIds: Array.isArray(allowedProductIds) ? allowedProductIds : [],
      permissions: {
        canLaunchProducts: Boolean(permissions?.canLaunchProducts),
        canViewAudit: Boolean(permissions?.canViewAudit),
        canManageDashboards: Boolean(permissions?.canManageDashboards),
        canExportData: Boolean(permissions?.canExportData),
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
