import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getProductById, isSafeLaunchUrl } from "@/lib/telemetry/productRegistry";
import {
  mintSignedHandoffToken,
  resolveVerifiedActor,
  SessionAuthError,
} from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { actor } = resolveVerifiedActor(req);

    if (actor.isPreviewMode) {
      return NextResponse.json(
        { error: "Platform launch is disabled during read-only Preview Mode." },
        { status: 403 }
      );
    }

    if (actor.tenantType === "client" && !actor.permissions.canLaunchProducts) {
      return NextResponse.json(
        { error: "Your persona does not have execution privileges to launch platforms." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const productId = (searchParams.get("productId") || "").trim();

    if (!productId) {
      return NextResponse.json(
        { error: "productId parameter is required." },
        { status: 400 }
      );
    }

    if (
      actor.tenantType === "client" &&
      !actor.allowedProductIds.includes(productId)
    ) {
      return NextResponse.json(
        { error: "Forbidden: your organization is not entitled to launch this platform." },
        { status: 403 }
      );
    }

    const product = getProductById(productId);
    if (!product) {
      return NextResponse.json(
        {
          error: `404: Product '${productId}' does not exist. This application is under construction or not yet deployed.`,
        },
        { status: 404 }
      );
    }

    if (!isSafeLaunchUrl(product.launchUrl)) {
      return NextResponse.json(
        { error: "Platform launch URL failed security validation." },
        { status: 400 }
      );
    }

    const traceId = `trc_00-${crypto.randomBytes(16).toString("hex")}`;
    const token = mintSignedHandoffToken({
      tenant_id: actor.companyId || "org_kpmg_advisory",
      user_id: actor.userId,
      user_email: actor.userEmail,
      user_role: actor.tenantType === "kpmg" ? "KPMG_LEAD" : "CLIENT_PERSONA",
      product_id: product.id,
      trace_id: traceId,
      telemetry_endpoint: "/api/telemetry",
    });

    const delimiter = product.launchUrl.includes("?") ? "&" : "?";
    const launchUrlWithToken = `${product.launchUrl}${delimiter}kpmg_token=${encodeURIComponent(token)}`;

    return NextResponse.json({
      productId: product.id,
      launchUrl: launchUrlWithToken,
      traceId,
      token,
    });
  } catch (err: unknown) {
    if (err instanceof SessionAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[API /api/catalog/launch GET] Error:", err);
    return NextResponse.json(
      { error: "Platform launch failure." },
      { status: 500 }
    );
  }
}
