export interface CompanyProfile {
  id: string;
  name: string;
  code: string;
  contactEmail: string;
  status: "active" | "suspended";
  notes?: string;
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
}

export interface UpdateCompanyInput {
  name?: string;
  code?: string;
  contactEmail?: string;
  status?: "active" | "suspended";
  notes?: string;
}

export interface CreatePersonaInput {
  name: string;
  roleTitle: string;
  email: string;
  passcode: string;
  productAccessMode: "all" | "custom";
  allowedProductIds?: string[];
  permissions: PersonaPermissions;
}

export interface UpdatePersonaInput {
  name?: string;
  roleTitle?: string;
  email?: string;
  passcode?: string;
  productAccessMode?: "all" | "custom";
  allowedProductIds?: string[];
  permissions?: Partial<PersonaPermissions>;
}
