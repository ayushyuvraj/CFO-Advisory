import { NextRequest, NextResponse } from "next/server";
import { getProductById } from "@/lib/telemetry/productRegistry";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json({ error: "productId parameter is required" }, { status: 400 });
    }

    const product = getProductById(productId);
    if (!product) {
      return NextResponse.json(
        { error: `404: Product '${productId}' does not exist. This application is under construction or not yet deployed.` },
        { status: 404 }
      );
    }

    // Mint session handoff token
    const traceId = `trc_00-${crypto.randomBytes(16).toString("hex")}`;
    const payload = {
      tenant_id: "org_acme_corp_global",
      engagement_code: "ENG-2026-CFO-9042",
      user_id: "usr_kpmg_lead_01",
      user_email: "lead.director@kpmg.com",
      user_role: "KPMG_LEAD",
      product_id: product.id,
      trace_id: traceId,
      issued_at: new Date().toISOString(),
      telemetry_endpoint: "/api/telemetry",
    };

    const token = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const delimiter = product.launchUrl.includes("?") ? "&" : "?";
    const launchUrlWithToken = `${product.launchUrl}${delimiter}kpmg_token=${token}`;

    return NextResponse.json({
      productId: product.id,
      launchUrl: launchUrlWithToken,
      traceId,
      token,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Launch failure";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
