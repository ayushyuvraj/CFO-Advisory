import { NextRequest, NextResponse } from "next/server";
import { getAllProducts, registerProduct, RegisterProductInput } from "@/lib/telemetry/productRegistry";

export async function GET() {
  try {
    const products = getAllProducts();
    return NextResponse.json({ products });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to load products";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RegisterProductInput;

    if (!body.name || !body.launchUrl || !body.pillar) {
      return NextResponse.json(
        { error: "Missing required fields: 'name', 'launchUrl', and 'pillar' are required." },
        { status: 400 }
      );
    }

    const product = registerProduct(body);

    return NextResponse.json(
      {
        message: "Product successfully registered",
        product,
        instructions: {
          telemetryEndpoint: "/api/telemetry",
          apiKey: product.apiKey,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to register product";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
