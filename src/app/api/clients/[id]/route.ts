import { NextRequest, NextResponse } from "next/server";
import {
  deleteCompany,
  getCompanyById,
  getCompanyEntitlements,
  getCompanyPersonas,
  updateCompany,
} from "@/lib/governance/store";
import { evaluateQuotaCheck } from "@/lib/governance/quotaEngine";
import { requireKpmgAdmin, SessionAuthError } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    requireKpmgAdmin(request);
    const { id } = await context.params;
    const company = getCompanyById(id);
    if (!company) {
      return NextResponse.json(
        { error: "Company profile not found." },
        { status: 404 }
      );
    }

    const entitlements = getCompanyEntitlements(id);
    const personas = getCompanyPersonas(id);
    const quota = evaluateQuotaCheck({ companyId: id });

    return NextResponse.json(
      { company, entitlements, personas, quota },
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof SessionAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[API /api/clients/[id] GET] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch company profile." },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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
    const { id } = await context.params;
    const updated = updateCompany(id, body);
    if (!updated) {
      return NextResponse.json(
        { error: "Company profile not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ company: updated }, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update company profile.";
    const isClientError =
      message.includes("required") ||
      message.includes("cannot be empty") ||
      message.includes("already assigned") ||
      message.includes("Status must be");
    return NextResponse.json(
      { error: isClientError ? message : "Failed to update company profile." },
      { status: isClientError ? 400 : 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    requireKpmgAdmin(request);
    const { id } = await context.params;
    const success = deleteCompany(id);
    if (!success) {
      return NextResponse.json(
        { error: "Company profile not found or already deleted." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Company profile and all associations deleted successfully." },
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof SessionAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[API /api/clients/[id] DELETE] Error:", err);
    return NextResponse.json(
      { error: "Failed to delete company profile." },
      { status: 500 }
    );
  }
}
