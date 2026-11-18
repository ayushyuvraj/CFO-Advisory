import { NextRequest, NextResponse } from "next/server";
import {
  getCompanyById,
  toggleProductEntitlement,
} from "@/lib/governance/store";
import { getProductById } from "@/lib/telemetry/productRegistry";
import { requireKpmgAdmin, SessionAuthError } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  let adminName = "KPMG Lead";
  try {
    const { actor } = requireKpmgAdmin(request);
    adminName = actor.userName || "KPMG Lead";
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

    const { productId, enabled } = body;

    if (!productId || typeof productId !== "string" || !productId.trim()) {
      return NextResponse.json(
        { error: "A valid productId is required." },
        { status: 400 }
      );
    }

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "The 'enabled' field must be a boolean." },
        { status: 400 }
      );
    }

    const registeredProduct = getProductById(productId.trim());
    if (!registeredProduct) {
      return NextResponse.json(
        { error: `Product "${productId}" is not a registered physical platform.` },
        { status: 404 }
      );
    }

    // Derive grantedBy strictly from the verified KPMG admin session
    const entitlement = toggleProductEntitlement(
      companyId,
      productId.trim(),
      enabled,
      adminName
    );

    return NextResponse.json({ entitlement }, { status: 200 });
  } catch (err) {
    console.error("[API /api/clients/[id]/entitlements POST] Error:", err);
    return NextResponse.json(
      { error: "Failed to update product entitlement." },
      { status: 500 }
    );
  }
}
