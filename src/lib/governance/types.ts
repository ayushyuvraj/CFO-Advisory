export type SpendPeriod = "daily" | "weekly" | "monthly" | "custom_days";

export interface CompanySpendLimit {
  amountUsd: number;
  period: SpendPeriod;
  customDays?: number;
  enabled: boolean;
}

export interface CompanyProfile {
  id: string;
  name: string;
  code: string;
  contactEmail: string;
  status: "active" | "suspended";
  notes?: string;
  spendLimit?: CompanySpendLimit;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyEntitlement {
  companyId: string;
  productId: string;
  enabled: boolean;
  grantedAt: string;
  grantedBy: string;
}

export interface PersonaPermissions {
  canLaunchProducts: boolean;
  canViewAudit: boolean;
  canManageDashboards: boolean;
  canExportData?: boolean;
}

export interface CompanyPersona {
  id: string;
  companyId: string;
  name: string;
  roleTitle: string;
  email: string;
  passcode: string;
  productAccessMode: "all" | "custom";
  allowedProductIds: string[];
  permissions: PersonaPermissions;
  spendLimitUsd?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientGovernanceData {
  companies: CompanyProfile[];
  entitlements: CompanyEntitlement[];
  personas: CompanyPersona[];
}

export interface CreateCompanyInput {
  name: string;
  code?: string;
  contactEmail: string;
  status?: "active" | "suspended";
  notes?: string;
  spendLimit?: CompanySpendLimit;
}

export interface UpdateCompanyInput {
  name?: string;
  code?: string;
  contactEmail?: string;
  status?: "active" | "suspended";
  notes?: string;
  spendLimit?: CompanySpendLimit;
}

export interface CreatePersonaInput {
  name: string;
  roleTitle: string;
  email: string;
  passcode: string;
  productAccessMode: "all" | "custom";
  allowedProductIds?: string[];
  permissions: PersonaPermissions;
  spendLimitUsd?: number | null;
}

export interface UpdatePersonaInput {
  name?: string;
  roleTitle?: string;
  email?: string;
  passcode?: string;
  productAccessMode?: "all" | "custom";
  allowedProductIds?: string[];
  permissions?: Partial<PersonaPermissions>;
  spendLimitUsd?: number | null;
}
