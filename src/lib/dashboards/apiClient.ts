import type { AuthUser } from "@/context/AuthContext";

/**
 * Session authentication is now enforced exclusively via the server-signed
 * HttpOnly `kpmg_cfo_session` cookie (sent automatically on same-origin requests).
 * This helper returns an empty header object so zero spoofable identity headers
 * are transmitted on the wire.
 */
export function buildDashboardActorHeaders(
  _user: AuthUser | null,
  _isPreviewMode: boolean
): Record<string, string> {
  void _user;
  void _isPreviewMode;
  return {};
}
