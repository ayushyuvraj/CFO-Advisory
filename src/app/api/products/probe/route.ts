import { NextRequest, NextResponse } from "next/server";
import net from "net";
import { getPublicProducts } from "@/lib/telemetry/productRegistry";

export const dynamic = "force-dynamic";

interface HealthProbeResult {
  productId: string;
  status: "operational" | "offline" | "maintenance";
  frontendOnline: boolean;
  backendOnline: boolean;
  portFrontend?: number;
  portBackend?: number;
  checkedAt: string;
}

function probePort(port: number, host = "127.0.0.1", timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isResolved = false;

    const finalize = (success: boolean) => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(success);
      }
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finalize(true));
    socket.once("timeout", () => finalize(false));
    socket.once("error", () => finalize(false));

    try {
      socket.connect(port, host);
    } catch {
      finalize(false);
    }
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetProductId = searchParams.get("productId");

    const allProducts = getPublicProducts();
    const productsToProbe = targetProductId
      ? allProducts.filter((p) => p.id === targetProductId)
      : allProducts;

    const now = new Date().toISOString();

    const probePromises = productsToProbe.map(async (product): Promise<HealthProbeResult> => {
      // If product status is explicitly maintenance in DB, reflect maintenance
      if (product.status === "maintenance") {
        return {
          productId: product.id,
          status: "maintenance",
          frontendOnline: false,
          backendOnline: false,
          portFrontend: product.portFrontend,
          portBackend: product.portBackend,
          checkedAt: now,
        };
      }

      const portFrontend = product.portFrontend || 5173;
      const portBackend = product.portBackend || 8000;

      // Fast concurrent TCP socket checks
      const [frontendOnline, backendOnline] = await Promise.all([
        probePort(portFrontend),
        probePort(portBackend),
      ]);

      // If backend is responding or frontend is responding, consider operational
      // If both are down or backend is down, report offline
      const status: "operational" | "offline" =
        backendOnline || frontendOnline ? "operational" : "offline";

      return {
        productId: product.id,
        status,
        frontendOnline,
        backendOnline,
        portFrontend,
        portBackend,
        checkedAt: now,
      };
    });

    const results = await Promise.all(probePromises);
    const probeMap: Record<string, HealthProbeResult> = {};
    for (const res of results) {
      probeMap[res.productId] = res;
    }

    return NextResponse.json(
      {
        probes: probeMap,
        timestamp: now,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err: unknown) {
    console.error("[API /api/products/probe] Error:", err);
    return NextResponse.json(
      { error: "Failed to probe product health." },
      { status: 500 }
    );
  }
}
