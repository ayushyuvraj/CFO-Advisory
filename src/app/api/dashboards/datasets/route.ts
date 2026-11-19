import { NextRequest, NextResponse } from "next/server";
import { getTelemetryEvents } from "@/lib/telemetry/telemetryStore";
import { getAllProducts } from "@/lib/telemetry/productRegistry";
import {
  getEffectiveProductIdsForPersona,
  readGovernanceData,
} from "@/lib/governance/store";
import { DatasetId, LiveDatasetsPayload, RawDataRow } from "@/lib/dashboards/types";
import { ActorAuthError, resolveDashboardActor } from "../actor";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const actor = resolveDashboardActor(req);
    if (actor.tenantType === "client" && !actor.permissions.canManageDashboards) {
      return NextResponse.json(
        { error: "Your persona does not have access to dashboard datasets." },
        { status: 403 }
      );
    }
    const isKpmg = actor.tenantType === "kpmg";

    const allProducts = getAllProducts();
    const governance = readGovernanceData();
    const productNameById = new Map(allProducts.map((p) => [p.id, p.name]));
    const companyNameById = new Map(governance.companies.map((c) => [c.id, c.name]));

    const restrictedDatasets: Partial<Record<DatasetId, string>> = {};

    // 1. Live Telemetry Events (strictly scoped by product entitlements + canViewAudit)
    // Includes all sanitized AuditInspectorDrawer fields without fabricating missing values.
    let telemetryRows: RawDataRow[] = [];
    const productTelemetryMap = new Map<
      string,
      { totalTokens: number; totalCost: number; activeDays: Set<string>; count: number }
    >();

    if (isKpmg || actor.permissions.canViewAudit) {
      const { events } = getTelemetryEvents({
        allowedProductIds: isKpmg ? undefined : actor.allowedProductIds,
        limit: 5000,
        offset: 0,
      });

      for (const evt of events) {
        const pid = evt.product_id;
        let entry = productTelemetryMap.get(pid);
        if (!entry) {
          entry = { totalTokens: 0, totalCost: 0, activeDays: new Set(), count: 0 };
          productTelemetryMap.set(pid, entry);
        }
        entry.totalTokens += evt.total_tokens || 0;
        entry.totalCost += evt.estimated_cost_usd || 0;
        if (evt.created_at) {
          entry.activeDays.add(evt.created_at.slice(0, 10));
        }
        entry.count += 1;
      }

      telemetryRows = events.map((e) => ({
        id: e.id,
        tenant_id: e.tenant_id,
        engagement_code: e.engagement_code,
        user_id: e.user_id,
        user_email: e.user_email,
        user_role: e.user_role,
        client_ip: e.client_ip ?? null,
        user_agent: e.user_agent ?? null,
        product_id: e.product_id,
        product_name: e.product_name,
        product_version: e.product_version,
        environment: e.environment,
        session_id: e.session_id,
        trace_id: e.trace_id,
        span_id: e.span_id,
        parent_span_id: e.parent_span_id ?? null,
        workflow_id: e.workflow_id,
        workflow_name: e.workflow_name,
        step_name: e.step_name,
        step_sequence: e.step_sequence,
        action_name: e.action_name,
        action_status: e.action_status,
        target_entity_type: e.target_entity_type,
        target_entity_id: e.target_entity_id,
        document_pages: e.document_pages ?? null,
        ai_provider: e.ai_provider,
        model_name: e.model_name,
        model_version: e.model_version ?? null,
        prompt_tokens: e.prompt_tokens,
        completion_tokens: e.completion_tokens,
        reasoning_tokens: e.reasoning_tokens ?? 0,
        total_tokens: e.total_tokens,
        estimated_cost_usd: e.estimated_cost_usd,
        temperature: e.temperature,
        finish_reason: e.finish_reason,
        confidence_score: e.confidence_score ?? null,
        timestamp_start: e.timestamp_start,
        timestamp_end: e.timestamp_end,
        duration_ms: e.duration_ms,
        time_to_first_token_ms: e.time_to_first_token_ms ?? null,
        http_status_code: e.http_status_code ?? null,
        input_query_sanitized: e.input_query_sanitized ?? null,
        output_response_sanitized: e.output_response_sanitized ?? null,
        pii_masked_flag: e.pii_masked_flag,
        tool_name: e.tool_name || "None",
        tool_status: e.tool_status || "N/A",
        requires_human_signoff: e.requires_human_signoff,
        signoff_status: e.signoff_status,
        created_at: e.created_at,
      }));
    } else {
      restrictedDatasets.telemetry_events =
        "Audit Telemetry dataset is restricted for this persona (canViewAudit is OFF).";
    }

    // 2. Registered Products (apiKey strictly stripped, enriched with computed governance & telemetry)
    const scopedProducts = isKpmg
      ? allProducts
      : allProducts.filter((p) => actor.allowedProductIds.includes(p.id));

    const productRows: RawDataRow[] = scopedProducts.map((p) => {
      const activeEntitledCompanyIds = new Set(
        governance.entitlements
          .filter(
            (e) =>
              e.productId === p.id &&
              e.enabled &&
              governance.companies.some((c) => c.id === e.companyId && c.status === "active")
          )
          .map((e) => e.companyId)
      );

      const entitledPersonasCount = governance.personas.filter((persona) => {
        if (!activeEntitledCompanyIds.has(persona.companyId)) return false;
        if (persona.productAccessMode === "all") return true;
        return persona.allowedProductIds.includes(p.id);
      }).length;

      const telem = productTelemetryMap.get(p.id);
      const totalTokens = telem ? telem.totalTokens : 0;
      const totalCostUsd = telem ? Number(telem.totalCost.toFixed(4)) : 0;
      const totalRuns = telem ? telem.count : 0;
      const activeDays = telem ? Math.max(1, telem.activeDays.size) : 1;
      const avgDailyTokens = Math.round(totalTokens / activeDays);

      return {
        id: p.id,
        name: p.name,
        shortName: p.shortName,
        pillar: p.pillar,
        status: p.status,
        entitledCompanyCount: activeEntitledCompanyIds.size,
        entitledPersonaCount: entitledPersonasCount,
        totalTokens,
        avgDailyTokens,
        totalCostUsd,
        totalRuns,
        portFrontend: p.portFrontend ?? 0,
        portBackend: p.portBackend ?? 0,
        tagCount: p.tags.length,
        featureCount: p.features.length,
        systemIntegration: p.systemIntegration,
        createdAt: p.createdAt,
      };
    });

    // 3. Client Companies (KPMG sees all; Client sees strictly own company)
    const scopedCompanies = isKpmg
      ? governance.companies
      : governance.companies.filter((c) => c.id === actor.companyId);

    const companyRows: RawDataRow[] = scopedCompanies.map((c) => {
      const companyEntitledProductIds = governance.entitlements
        .filter((e) => e.companyId === c.id && e.enabled)
        .map((e) => e.productId);
      const companyEntitledNames = companyEntitledProductIds
        .map((pid) => productNameById.get(pid) || pid)
        .join(", ");

      return {
        id: c.id,
        name: c.name,
        code: c.code,
        contactEmail: c.contactEmail,
        status: c.status,
        enabledProductCount: companyEntitledProductIds.length,
        personaCount: governance.personas.filter((p) => p.companyId === c.id).length,
        entitledProductNames: companyEntitledNames || "None",
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });

    // 4. Client Personas (passcode strictly stripped; viewer-only client personas without
    // canManageDashboards only see their own persona record, never peer employee directories)
    const scopedPersonas = isKpmg
      ? governance.personas
      : actor.permissions.canManageDashboards
      ? governance.personas.filter((p) => p.companyId === actor.companyId)
      : governance.personas.filter(
          (p) => p.companyId === actor.companyId && p.id === actor.personaId
        );

    const personaRows: RawDataRow[] = scopedPersonas.map((p) => {
      const effectiveIds = getEffectiveProductIdsForPersona(p.companyId, p.id);
      const effectiveNames = effectiveIds
        .map((pid) => productNameById.get(pid) || pid)
        .join(", ");
      const enabledPermCount = [
        p.permissions.canLaunchProducts,
        p.permissions.canViewAudit,
        p.permissions.canManageDashboards,
      ].filter(Boolean).length;

      return {
        id: p.id,
        name: p.name,
        roleTitle: p.roleTitle,
        companyName: companyNameById.get(p.companyId) || p.companyId,
        email: p.email,
        productAccessMode: p.productAccessMode,
        allowedProductCount: effectiveIds.length,
        effectiveProductNames: effectiveNames || "None",
        enabledPermissionCount: enabledPermCount,
        canLaunchProducts: p.permissions.canLaunchProducts,
        canViewAudit: p.permissions.canViewAudit,
        canManageDashboards: p.permissions.canManageDashboards,
        canExportData: p.permissions.canExportData,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });

    // 5. Product Entitlements Matrix (KPMG sees all; Client sees own company)
    const scopedEntitlements = isKpmg
      ? governance.entitlements
      : governance.entitlements.filter((e) => e.companyId === actor.companyId);

    const entitlementRows: RawDataRow[] = scopedEntitlements.map((e) => ({
      companyName: companyNameById.get(e.companyId) || e.companyId,
      productName: productNameById.get(e.productId) || e.productId,
      productId: e.productId,
      enabled: e.enabled,
      enabledNumeric: e.enabled ? 1 : 0,
      grantedBy: e.grantedBy,
      grantedAt: e.grantedAt,
    }));

    // 6. Granular Product Access Matrix ("Who has access to what")
    const accessMatrixRows: RawDataRow[] = [];
    for (const company of scopedCompanies) {
      const companyPersonas = scopedPersonas.filter((p) => p.companyId === company.id);
      const isCompanyActive = company.status === "active";

      for (const prod of scopedProducts) {
        const entitlement = governance.entitlements.find(
          (e) => e.companyId === company.id && e.productId === prod.id
        );
        const isEntitledByCompany = Boolean(entitlement && entitlement.enabled);

        for (const persona of companyPersonas) {
          const modeAllows =
            persona.productAccessMode === "all" ||
            persona.allowedProductIds.includes(prod.id);
          const canLaunch = Boolean(persona.permissions.canLaunchProducts);
          const effectiveActive = isCompanyActive && isEntitledByCompany && modeAllows;

          let accessStatus: "Active" | "Restricted" | "Disabled" | "Suspended";
          if (!isCompanyActive) {
            accessStatus = "Suspended";
          } else if (!isEntitledByCompany) {
            accessStatus = "Disabled";
          } else if (!modeAllows) {
            accessStatus = "Restricted";
          } else {
            accessStatus = "Active";
          }

          accessMatrixRows.push({
            id: `${company.id}_${persona.id}_${prod.id}`,
            companyName: company.name,
            companyCode: company.code,
            companyStatus: company.status,
            personaName: persona.name,
            personaEmail: persona.email,
            roleTitle: persona.roleTitle,
            productName: prod.name,
            productId: prod.id,
            accessStatus,
            productAccessMode: persona.productAccessMode,
            isEntitled: effectiveActive,
            isEntitledNumeric: effectiveActive ? 1 : 0,
            canLaunch: effectiveActive && canLaunch,
            canViewAudit: Boolean(persona.permissions.canViewAudit),
            canManageDashboards: Boolean(persona.permissions.canManageDashboards),
            canExportData: Boolean(persona.permissions.canExportData),
            grantedBy: entitlement?.grantedBy || "KPMG Lead",
            grantedAt: entitlement?.grantedAt || persona.updatedAt || persona.createdAt,
          });
        }
      }
    }

    const payload: LiveDatasetsPayload = {
      datasets: {
        telemetry_events: telemetryRows,
        registered_products: productRows,
        client_companies: companyRows,
        client_personas: personaRows,
        product_entitlements: entitlementRows,
        product_access_matrix: accessMatrixRows,
      },
      restrictedDatasets,
      fetchedAt: new Date().toISOString(),
    };

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    if (err instanceof ActorAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[API /api/dashboards/datasets GET] Error:", err);
    return NextResponse.json(
      { error: "Failed to load live datasets." },
      { status: 500 }
    );
  }
}
