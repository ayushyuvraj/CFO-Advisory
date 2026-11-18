import { NextRequest, NextResponse } from "next/server";
import {
  getPublicProducts,
  registerProduct,
  RegisterProductInput,
} from "@/lib/telemetry/productRegistry";
import {
  requireKpmgAdmin,
  resolveVerifiedActor,
  SessionAuthError,
} from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { actor } = resolveVerifiedActor(req);
    const allProducts = getPublicProducts();
    const products =
      actor.tenantType === "kpmg"
        ? allProducts
        : allProducts.filter((p) => actor.allowedProductIds.includes(p.id));
    return NextResponse.json({ products }, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof SessionAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[API /api/products GET] Error:", err);
    return NextResponse.json(
      { error: "Failed to load products." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    requireKpmgAdmin(req);
  } catch (err) {
    if (err instanceof SessionAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: RegisterProductInput;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }
    body = parsed as RegisterProductInput;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  try {
    if (!body.name || !body.launchUrl || !body.pillar) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: 'name', 'launchUrl', and 'pillar' are required.",
        },
        { status: 400 }
      );
    }

    const product = registerProduct(body);
    const { apiKey, ...publicProduct } = product;

    return NextResponse.json(
      {
        message: "Product successfully registered",
        product: publicProduct,
        instructions: {
          telemetryEndpoint: "/api/telemetry",
          apiKey,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to register product.";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
