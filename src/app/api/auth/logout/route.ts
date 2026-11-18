import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ signedOut: true }, { status: 200 });
  clearSessionCookie(res);
  return res;
}
