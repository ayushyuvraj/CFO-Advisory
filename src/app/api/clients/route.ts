import { NextResponse } from "next/server";
import {
  createCompany,
  isValidEmail,
  readGovernanceData,
} from "@/lib/governance/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = readGovernanceData();
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("[API /api/clients GET] Error:", err);
    return NextResponse.json(
      { error: "Failed to load client governance records." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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
    const { name, code, contactEmail, status, notes } = body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Company name is required." },
        { status: 400 }
      );
    }

    if (!contactEmail || typeof contactEmail !== "string" || !isValidEmail(contactEmail)) {
      return NextResponse.json(
        { error: "A valid primary contact email is required." },
        { status: 400 }
      );
    }

    const company = createCompany({
      name,
      code: typeof code === "string" ? code : undefined,
      contactEmail,
      status: status === "suspended" ? "suspended" : "active",
      notes: typeof notes === "string" ? notes : undefined,
    });

    return NextResponse.json({ company }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create company.";
    const isClientError =
      message.includes("required") || message.includes("already assigned");
    return NextResponse.json(
      { error: message },
      { status: isClientError ? 400 : 500 }
    );
  }
}
