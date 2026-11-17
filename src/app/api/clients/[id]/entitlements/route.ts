import { NextResponse } from "next/server";
import {
  getCompanyById,
  toggleProductEntitlement,
} from "@/lib/governance/store";
import { getProductById } from "@/lib/telemetry/productRegistry";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
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

    const { productId, enabled, grantedBy } = body || {};

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

    const entitlement = toggleProductEntitlement(
      companyId,
      productId.trim(),
      enabled,
      typeof grantedBy === "string" && grantedBy.trim() ? grantedBy.trim() : "KPMG Lead"
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
