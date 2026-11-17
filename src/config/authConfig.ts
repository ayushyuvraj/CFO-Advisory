export interface AdvisoryLeadCredentials {
  email: string;
  passcode: string;
  name: string;
  role: string;
  badge: string;
}

/**
 * Designated credentials for the KPMG Lead persona.
 * Easily modifiable upon request or transferable to server environment variables.
 */
export const KPMG_LEAD_USER: AdvisoryLeadCredentials = {
  email: "kpmg.lead@kpmg.com",
  passcode: "KPMG#Lead2026!",
  name: "KPMG Lead",
  role: "Lead Partner, CFO Advisory Practice",
  badge: "Verified KPMG Lead",
};
