import {
  calculatePeriodWindow,
  evaluateQuotaCheck,
  getAggregatedSpend,
} from "../src/lib/governance/quotaEngine";
import {
  createCompany,
  deleteCompany,
  createPersona,
  deletePersona,
  getCompanyById,
} from "../src/lib/governance/store";
import { appendTelemetryEvent } from "../src/lib/telemetry/telemetryStore";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${msg}`);
}

async function runTests() {
  console.log("=== RUNNING QUOTA ENGINE & SPEND GOVERNANCE TESTS ===");

  // 1. Test Period Window Calculations
  const refDate = new Date("2026-11-20T12:00:00.000Z");

  const dailyWindow = calculatePeriodWindow(
    { amountUsd: 10, period: "daily", enabled: true },
    refDate
  );
  assert(
    dailyWindow.start.toISOString() === "2026-11-20T00:00:00.000Z",
    "Daily window starts at 00:00:00 UTC of reference day"
  );
  assert(
    dailyWindow.resetAt?.toISOString() === "2026-11-21T00:00:00.000Z",
    "Daily window resets at 00:00:00 UTC of next day"
  );

  const weeklyWindow = calculatePeriodWindow(
    { amountUsd: 50, period: "weekly", enabled: true },
    refDate // Nov 20, 2026 is a Friday
  );
  assert(
    weeklyWindow.start.toISOString() === "2026-11-16T00:00:00.000Z",
    "Weekly window starts on Monday Nov 16 at 00:00:00 UTC"
  );
  assert(
    weeklyWindow.resetAt?.toISOString() === "2026-11-23T00:00:00.000Z",
    "Weekly window resets on next Monday Nov 23 at 00:00:00 UTC"
  );

  const monthlyWindow = calculatePeriodWindow(
    { amountUsd: 100, period: "monthly", enabled: true },
    refDate
  );
  assert(
    monthlyWindow.start.toISOString() === "2026-11-01T00:00:00.000Z",
    "Monthly window starts on 1st of month at 00:00:00 UTC"
  );
  assert(
    monthlyWindow.resetAt?.toISOString() === "2026-12-01T00:00:00.000Z",
    "Monthly window resets on 1st of next month at 00:00:00 UTC"
  );

  const customDaysWindow = calculatePeriodWindow(
    { amountUsd: 20, period: "custom_days", customDays: 7, enabled: true },
    refDate
  );
  assert(
    customDaysWindow.start.getTime() === refDate.getTime() - 7 * 86_400_000,
    "Custom 7-day rolling window starts exactly 7 days prior"
  );

  // 2. Test Scenario 1: ABC Limited ($10/day, shared pool)
  const companyAbc = createCompany({
    name: "ABC Limited Test",
    code: `ABC-TEST-${Date.now().toString().slice(-4)}`,
    contactEmail: "admin@abc-test.com",
    spendLimit: {
      amountUsd: 10,
      period: "daily",
      enabled: true,
    },
  });

  const personaAbc1 = createPersona(companyAbc.id, {
    name: "Alice ABC",
    roleTitle: "Analyst",
    email: `alice.${Date.now()}@abc-test.com`,
    passcode: "Pass1234!",
    productAccessMode: "all",
    permissions: { canLaunchProducts: true, canViewAudit: true, canManageDashboards: false },
    spendLimitUsd: null, // pool
  });

  const personaAbc2 = createPersona(companyAbc.id, {
    name: "Bob ABC",
    roleTitle: "Reviewer",
    email: `bob.${Date.now()}@abc-test.com`,
    passcode: "Pass1234!",
    productAccessMode: "all",
    permissions: { canLaunchProducts: true, canViewAudit: true, canManageDashboards: false },
    spendLimitUsd: 10, // up to 10
  });

  // Check initial quota (spend = $0)
  const initialCheck = evaluateQuotaCheck({
    companyId: companyAbc.id,
    personaId: personaAbc1.id,
    estimatedCostUsd: 2.0,
  });
  assert(initialCheck.allowed === true, "Alice can spend $2 initially");
  assert(initialCheck.companyRemainingUsd === 10, "Initial company remaining is $10");

  // Simulate Alice spending $6
  appendTelemetryEvent({
    tenant_id: companyAbc.id,
    user_id: personaAbc1.id,
    user_email: personaAbc1.email,
    estimated_cost_usd: 6.0,
    action_name: "EXTRACT_INVOICE",
    created_at: new Date().toISOString(),
  });

  // Check Bob attempting to spend $5 (6 + 5 = 11 > 10, should be blocked!)
  const bobOverCheck = evaluateQuotaCheck({
    companyId: companyAbc.id,
    personaId: personaAbc2.id,
    estimatedCostUsd: 5.0,
  });
  assert(bobOverCheck.allowed === false, "Bob cannot spend $5 when only $4 remaining in pool");

  // Check Bob attempting to spend $3 (6 + 3 = 9 <= 10, should be allowed)
  const bobUnderCheck = evaluateQuotaCheck({
    companyId: companyAbc.id,
    personaId: personaAbc2.id,
    estimatedCostUsd: 3.0,
  });
  assert(bobUnderCheck.allowed === true, "Bob can spend $3 when $4 remaining in pool");

  // 3. Test Scenario 2: XYZ Limited ($20 pool, sub-caps A=$8, B=$10, C=$20)
  const companyXyz = createCompany({
    name: "XYZ Holdings Test",
    code: `XYZ-TEST-${Date.now().toString().slice(-4)}`,
    contactEmail: "admin@xyz-test.com",
    spendLimit: {
      amountUsd: 20,
      period: "monthly",
      enabled: true,
    },
  });

  const personaA = createPersona(companyXyz.id, {
    name: "Client A",
    roleTitle: "Staff",
    email: `clienta.${Date.now()}@xyz-test.com`,
    passcode: "Pass1234!",
    productAccessMode: "all",
    permissions: { canLaunchProducts: true, canViewAudit: false, canManageDashboards: false },
    spendLimitUsd: 8.0,
  });

  const personaB = createPersona(companyXyz.id, {
    name: "Client B",
    roleTitle: "Manager",
    email: `clientb.${Date.now()}@xyz-test.com`,
    passcode: "Pass1234!",
    productAccessMode: "all",
    permissions: { canLaunchProducts: true, canViewAudit: false, canManageDashboards: false },
    spendLimitUsd: 10.0,
  });

  const personaC = createPersona(companyXyz.id, {
    name: "Client C",
    roleTitle: "Director",
    email: `clientc.${Date.now()}@xyz-test.com`,
    passcode: "Pass1234!",
    productAccessMode: "all",
    permissions: { canLaunchProducts: true, canViewAudit: false, canManageDashboards: false },
    spendLimitUsd: 20.0,
  });

  // Persona A tries to spend $9 (exceeds $8 sub-cap, company has $20)
  const checkAOver = evaluateQuotaCheck({
    companyId: companyXyz.id,
    personaId: personaA.id,
    estimatedCostUsd: 9.0,
  });
  assert(checkAOver.allowed === false, "Persona A cannot spend $9 because sub-cap is $8");

  // Persona A spends $8
  appendTelemetryEvent({
    tenant_id: companyXyz.id,
    user_id: personaA.id,
    user_email: personaA.email,
    estimated_cost_usd: 8.0,
    created_at: new Date().toISOString(),
  });

  // Persona B spends $10
  appendTelemetryEvent({
    tenant_id: companyXyz.id,
    user_id: personaB.id,
    user_email: personaB.email,
    estimated_cost_usd: 10.0,
    created_at: new Date().toISOString(),
  });

  // Now total company spend = $18 ($2 left in $20 pool)
  // Persona C has $20 sub-cap and has spent $0.
  // Can Persona C spend $5? NO! Pool only has $2 left!
  const checkCOver = evaluateQuotaCheck({
    companyId: companyXyz.id,
    personaId: personaC.id,
    estimatedCostUsd: 5.0,
  });
  assert(checkCOver.allowed === false, "Persona C cannot spend $5 because company pool only has $2 left");
  assert(checkCOver.effectiveRemainingUsd === 2, "Persona C's effective remaining is $2");

  // Can Persona C spend $1.50? YES!
  const checkCUnder = evaluateQuotaCheck({
    companyId: companyXyz.id,
    personaId: personaC.id,
    estimatedCostUsd: 1.5,
  });
  assert(checkCUnder.allowed === true, "Persona C can spend $1.50 within remaining $2 pool");

  // Clean up test records
  deleteCompany(companyAbc.id);
  deleteCompany(companyXyz.id);

  console.log("=== ALL QUOTA & SPEND GOVERNANCE TESTS PASSED SUCCESSFULLY! ===");
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
