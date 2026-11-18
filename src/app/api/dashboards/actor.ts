import { NextRequest } from "next/server";
import {
  resolveVerifiedActor,
  SessionAuthError,
} from "@/lib/auth/session";
import { DashboardActor } from "@/lib/dashboards/types";

export class ActorAuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.name = "ActorAuthError";
    this.status = status;
  }
}

/**
 * Resolves the caller strictly from the server-signed HttpOnly session cookie.
 * Spoofed client headers (`x-cfo-*`) are completely ignored.
 */
export function resolveDashboardActor(req: NextRequest): DashboardActor {
  try {
    return resolveVerifiedActor(req).actor;
  } catch (err) {
    if (err instanceof SessionAuthError) {
      throw new ActorAuthError(err.message, err.status);
    }
    throw new ActorAuthError("Authentication required to access dashboards.", 401);
  }
}
