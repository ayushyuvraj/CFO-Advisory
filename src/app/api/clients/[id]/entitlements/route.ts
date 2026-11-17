import { NextResponse } from "next/server";
import {
  getCompanyById,
  toggleProductEntitlement,
} from "@/lib/governance/store";

export const dynamic = "force-dynamic";

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
    const { productId, enabled, grantedBy } = body || {};

    if (!productId || typeof productId !== "string") {
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

    const entitlement = toggleProductEntitlement(
      companyId,
      productId,
      enabled,
      grantedBy || "KPMG Lead"
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
