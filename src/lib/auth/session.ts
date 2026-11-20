import crypto from "crypto";
import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { ensureDataDir } from "@/lib/storage/jsonFileStore";
import {
  getClientSessionByPersonaId,
  getCompanyById,
  getCompanyPersonas,
  SuspendedCompanyError,
} from "@/lib/governance/store";
import { DashboardActor } from "@/lib/dashboards/types";
import type { AuthUser } from "@/context/AuthContext";

export const SESSION_COOKIE_NAME = "kpmg_cfo_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

// Server-only KPMG Lead credentials (never bundled into client JS)
const SERVER_KPMG_EMAIL = (
  process.env.KPMG_LEAD_EMAIL || "kpmg.lead@kpmg.com"
).trim().toLowerCase();
const SERVER_KPMG_PASSCODE =
  process.env.KPMG_LEAD_PASSCODE || "";

export const SERVER_KPMG_PROFILE = {
  id: "usr-kpmg-lead",
  name: "KPMG Lead",
  role: "Lead Partner, CFO Advisory Practice",
  email: SERVER_KPMG_EMAIL,
  badge: "Verified KPMG Lead",
} as const;

export interface SessionCookiePayload {
  kind: "kpmg" | "client" | "kpmg_preview";
  userId: string;
  email: string;
  companyId?: string;
  personaId?: string;
  iat: number;
  exp: number;
}

export class SessionAuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.name = "SessionAuthError";
    this.status = status;
  }
}

let cachedSecret: string | null = null;

function getSessionSecret(): string {
  if (cachedSecret) return cachedSecret;
  if (process.env.CFO_SESSION_SECRET && process.env.CFO_SESSION_SECRET.length >= 16) {
    cachedSecret = process.env.CFO_SESSION_SECRET;
    return cachedSecret;
  }
  const dir = ensureDataDir();
  const secretPath = path.join(dir, ".session_secret");
  try {
    if (fs.existsSync(secretPath)) {
      const existing = fs.readFileSync(secretPath, "utf8").trim();
      if (existing.length >= 32) {
        cachedSecret = existing;
        return cachedSecret;
      }
    }
    const generated = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(secretPath, generated, { encoding: "utf8", mode: 0o600 });
    cachedSecret = generated;
    return cachedSecret;
  } catch {
    // Fallback deterministic in-memory secret if filesystem is read-only
    cachedSecret = crypto
      .createHash("sha256")
      .update(`${process.cwd()}:kpmg_cfo_advisory_session_fallback_v2`)
      .digest("hex");
    return cachedSecret;
  }
}

export function timingSafeEqualString(a: string, b: string): boolean {
  const hashA = crypto.createHash("sha256").update(a).digest();
  const hashB = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export function verifyKpmgLeadCredentials(email: string, passcode: string): boolean {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPasscode = passcode.trim();
  return (
    SERVER_KPMG_PASSCODE.length > 0 &&
    timingSafeEqualString(cleanEmail, SERVER_KPMG_EMAIL) &&
    timingSafeEqualString(cleanPasscode, SERVER_KPMG_PASSCODE)
  );
}

function signData(encodedPayload: string): string {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(encodedPayload)
    .digest("base64url");
}

export function encodeSessionToken(payload: Omit<SessionCookiePayload, "iat" | "exp">): string {
  const now = Date.now();
  const full: SessionCookiePayload = {
    ...payload,
    iat: now,
    exp: now + SESSION_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(full), "utf8").toString("base64url");
  const sig = signData(body);
  return `${body}.${sig}`;
}

export function decodeSessionToken(token: string | undefined): SessionCookiePayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;
  const expected = signData(body);
  if (!timingSafeEqualString(sig, expected)) {
    return null;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as Partial<SessionCookiePayload>;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.exp !== "number" || Date.now() > parsed.exp) return null;
    if (
      parsed.kind !== "kpmg" &&
      parsed.kind !== "client" &&
      parsed.kind !== "kpmg_preview"
    ) {
      return null;
    }
    return parsed as SessionCookiePayload;
  } catch {
    return null;
  }
}

export function setSessionCookie(
  res: NextResponse,
  payload: Omit<SessionCookiePayload, "iat" | "exp">
): void {
  const token = encodeSessionToken(payload);
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production" && process.env.ALLOW_HTTP_LOCAL !== "true",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function readSessionFromRequest(req: NextRequest | Request): SessionCookiePayload | null {
  if ("cookies" in req && typeof req.cookies?.get === "function") {
    return decodeSessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  }
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!match) return null;
  const rawVal = decodeURIComponent(match.slice(SESSION_COOKIE_NAME.length + 1));
  return decodeSessionToken(rawVal);
}

export function buildKpmgAuthUser(): AuthUser {
  return {
    id: SERVER_KPMG_PROFILE.id,
    name: SERVER_KPMG_PROFILE.name,
    role: SERVER_KPMG_PROFILE.role,
    email: SERVER_KPMG_PROFILE.email,
    method: "credentials",
    badge: SERVER_KPMG_PROFILE.badge,
    tenantType: "kpmg",
  };
}

/**
 * Resolves the live verified actor + UI AuthUser directly from the signed HttpOnly cookie.
 * Never trusts spoofable x-cfo-* identity headers.
 */
export function resolveVerifiedActor(req: NextRequest | Request): {
  actor: DashboardActor;
  authUser: AuthUser;
} {
  const session = readSessionFromRequest(req);
  if (!session) {
    throw new SessionAuthError("Authentication required. Please sign in.", 401);
  }

  if (session.kind === "kpmg") {
    const authUser = buildKpmgAuthUser();
    return {
      authUser,
      actor: {
        tenantType: "kpmg",
        userId: authUser.id,
        userName: authUser.name,
        userEmail: authUser.email,
        isPreviewMode: false,
        allowedProductIds: [],
        permissions: {
          canLaunchProducts: true,
          canViewAudit: true,
          canManageDashboards: true,
          canExportData: true,
        },
      },
    };
  }

  if (session.kind === "kpmg_preview") {
    const companyId = session.companyId || "";
    const personaId = session.personaId || "";
    const company = getCompanyById(companyId);
    const persona = getCompanyPersonas(companyId).find((p) => p.id === personaId);
    if (!company || !persona) {
      throw new SessionAuthError(
        "Previewed client persona or company no longer exists.",
        404
      );
    }

    let allowedProductIds: string[] = [];
    if (company.status === "active") {
      try {
        const live = getClientSessionByPersonaId(companyId, personaId);
        allowedProductIds = live?.allowedProductIds || [];
      } catch {
        allowedProductIds = [];
      }
    }

    const authUser: AuthUser = {
      id: persona.id,
      name: persona.name,
      role: persona.roleTitle,
      email: persona.email,
      method: "kpmg_preview",
      badge:
        company.status === "active"
          ? `Preview: ${company.name}`
          : `Preview (Suspended): ${company.name}`,
      tenantType: "client",
      companyId: company.id,
      companyName: company.name,
      personaId: persona.id,
      permissions: persona.permissions,
      allowedProductIds,
      previewOriginalAdmin: buildKpmgAuthUser(),
    };

    return {
      authUser,
      actor: {
        tenantType: "client",
        userId: persona.id,
        userName: persona.name,
        userEmail: persona.email,
        isPreviewMode: true,
        companyId: company.id,
        companyName: company.name,
        personaId: persona.id,
        allowedProductIds,
        permissions:
          company.status === "active"
            ? persona.permissions
            : {
                canLaunchProducts: false,
                canViewAudit: false,
                canManageDashboards: false,
                canExportData: false,
              },
      },
    };
  }

  // Client credentials session — always re-validate against live governance store
  const companyId = session.companyId || "";
  const personaId = session.personaId || "";
  try {
    const live = getClientSessionByPersonaId(companyId, personaId);
    if (!live) {
      throw new SessionAuthError(
        "Your persona or organization access was revoked.",
        403
      );
    }

    const authUser: AuthUser = {
      id: live.persona.id,
      name: live.persona.name,
      role: live.persona.roleTitle,
      email: live.persona.email,
      method: "client_credentials",
      badge: `Client: ${live.company.name}`,
      tenantType: "client",
      companyId: live.company.id,
      companyName: live.company.name,
      personaId: live.persona.id,
      permissions: live.persona.permissions,
      allowedProductIds: live.allowedProductIds,
    };

    return {
      authUser,
      actor: {
        tenantType: "client",
        userId: live.persona.id,
        userName: live.persona.name,
        userEmail: live.persona.email,
        isPreviewMode: false,
        companyId: live.company.id,
        companyName: live.company.name,
        personaId: live.persona.id,
        allowedProductIds: live.allowedProductIds,
        permissions: live.persona.permissions,
      },
    };
  } catch (err) {
    if (err instanceof SuspendedCompanyError) {
      throw new SessionAuthError(err.message, 403);
    }
    throw err;
  }
}

export function requireKpmgAdmin(req: NextRequest | Request): {
  actor: DashboardActor;
  authUser: AuthUser;
} {
  const resolved = resolveVerifiedActor(req);
  if (resolved.actor.tenantType !== "kpmg" || resolved.actor.isPreviewMode) {
    throw new SessionAuthError(
      "Forbidden: KPMG Advisory Lead privileges are required.",
      403
    );
  }
  return resolved;
}

export function mintSignedHandoffToken(payload: Record<string, unknown>): string {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    ...payload,
    jti: crypto.randomBytes(8).toString("hex"),
    iat: now,
    exp: now + 120, // 2-minute short-lived handoff token
  };
  const body = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  const sig = signData(body);
  return `${body}.${sig}`;
}

// Lightweight in-memory sliding-window brute-force rate limiter for login endpoints
const loginFailures = new Map<string, number[]>();
const RATE_WINDOW_MS = 1000 * 60 * 5; // 5 minutes
const MAX_FAILURES_PER_WINDOW = 15;

export function checkLoginRateLimit(key: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const list = (loginFailures.get(key) || []).filter((ts) => now - ts < RATE_WINDOW_MS);
  if (list.length >= MAX_FAILURES_PER_WINDOW) {
    const oldest = list[0] || now;
    const retryAfterSec = Math.max(1, Math.ceil((RATE_WINDOW_MS - (now - oldest)) / 1000));
    loginFailures.set(key, list);
    return { allowed: false, retryAfterSec };
  }
  loginFailures.set(key, list);
  return { allowed: true, retryAfterSec: 0 };
}

export function recordLoginFailure(key: string): void {
  const now = Date.now();
  const list = (loginFailures.get(key) || []).filter((ts) => now - ts < RATE_WINDOW_MS);
  list.push(now);
  loginFailures.set(key, list);
}

export function clearLoginFailures(key: string): void {
  loginFailures.delete(key);
}
