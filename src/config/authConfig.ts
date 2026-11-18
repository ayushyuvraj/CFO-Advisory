export interface AdvisoryLeadDisplayConfig {
  emailHint: string;
  name: string;
  role: string;
  badge: string;
}

/**
 * Non-secret public display hints for the KPMG Lead sign-in form.
 * Credentials are verified exclusively server-side in `src/lib/auth/session.ts`.
 */
export const KPMG_LEAD_DISPLAY: AdvisoryLeadDisplayConfig = {
  emailHint: "kpmg.lead@kpmg.com",
  name: "KPMG Lead",
  role: "Lead Partner, CFO Advisory Practice",
  badge: "Verified KPMG Lead",
};
