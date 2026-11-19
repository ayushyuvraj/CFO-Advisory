import { NextRequest, NextResponse } from "next/server";
import {
  createCompany,
  isValidEmail,
  readGovernanceData,
} from "@/lib/governance/store";
import { getAllCompaniesSpendSummary } from "@/lib/governance/quotaEngine";
import { requireKpmgAdmin, SessionAuthError } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    requireKpmgAdmin(request);
    const data = readGovernanceData();
    const spendSummary = getAllCompaniesSpendSummary();
    return NextResponse.json({ ...data, spendSummary }, { status: 200 });
  } catch (err) {
    if (err instanceof SessionAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[API /api/clients GET] Error:", err);
    return NextResponse.json(
      { error: "Failed to load client governance records." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    requireKpmgAdmin(request);
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
    const { name, code, contactEmail, status, notes } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Company name is required." },
        { status: 400 }
      );
    }

    if (
      !contactEmail ||
      typeof contactEmail !== "string" ||
      !isValidEmail(contactEmail)
    ) {
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
      { error: isClientError ? message : "Failed to create company." },
      { status: isClientError ? 400 : 500 }
    );
  }
}
