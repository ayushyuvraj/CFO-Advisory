import { NextResponse } from "next/server";
import {
  createCompany,
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
  try {
    const body = await request.json();
    const { name, code, contactEmail, status, notes } = body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Company name is required." },
        { status: 400 }
      );
    }

    if (
      !contactEmail ||
      typeof contactEmail !== "string" ||
      !contactEmail.includes("@")
    ) {
      return NextResponse.json(
        { error: "A valid primary contact email is required." },
        { status: 400 }
      );
    }

    const company = createCompany({
      name,
      code,
      contactEmail,
      status: status === "suspended" ? "suspended" : "active",
      notes,
    });

    return NextResponse.json({ company }, { status: 201 });
  } catch (err) {
    console.error("[API /api/clients POST] Error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to create company.",
      },
      { status: 500 }
    );
  }
}
