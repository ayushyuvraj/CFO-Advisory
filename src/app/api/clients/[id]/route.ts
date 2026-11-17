import { NextResponse } from "next/server";
import {
  deleteCompany,
  getCompanyById,
  getCompanyEntitlements,
  getCompanyPersonas,
  updateCompany,
} from "@/lib/governance/store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
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

    return NextResponse.json(
      { company, entitlements, personas },
      { status: 200 }
    );
  } catch (err) {
    console.error("[API /api/clients/[id] GET] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch company profile." },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const updated = updateCompany(id, body);
    if (!updated) {
      return NextResponse.json(
        { error: "Company profile not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ company: updated }, { status: 200 });
  } catch (err) {
    console.error("[API /api/clients/[id] PUT] Error:", err);
    return NextResponse.json(
      { error: "Failed to update company profile." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
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
    console.error("[API /api/clients/[id] DELETE] Error:", err);
    return NextResponse.json(
      { error: "Failed to delete company profile." },
      { status: 500 }
    );
  }
}
