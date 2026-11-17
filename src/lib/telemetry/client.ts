import { TelemetryEvent } from "./types";

/**
 * Universal Client SDK for KPMG CFO Advisory Telemetry.
 * Fire-and-forget, non-blocking, fail-silent.
 */
export async function trackCfoEvent(
  event: Partial<TelemetryEvent>,
  options?: {
    endpoint?: string;
    apiKey?: string;
  }
): Promise<void> {
  const endpoint =
    options?.endpoint ||
    process.env.NEXT_PUBLIC_KPMG_CFO_TELEMETRY_ENDPOINT ||
    "/api/telemetry";

  const apiKey =
    options?.apiKey ||
    process.env.KPMG_CFO_PRODUCT_API_KEY ||
    "";

  try {
    // Non-blocking fire and forget
    fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(event),
    }).catch((err) => {
      // Telemetry errors must never impact end-user product execution
      console.warn("[CFO Telemetry Client Non-Fatal Warning]:", err?.message);
    });
  } catch (err: unknown) {
    // Fail silently in host application
    console.warn("[CFO Telemetry Client Exception]:", err);
  }
}
