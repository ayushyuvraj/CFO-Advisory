export type ScenarioId = "base" | "fx-shock" | "tax-reform";

export interface IncomeStatementData {
  revenue: number;
  cogs: number;
  grossProfit: number;
  opex: number;
  ebitda: number;
  da: number;
  ebit: number;
  netInterest: number;
  ebt: number;
  taxExpense: number;
  netIncome: number;
}

export interface TaxBridgeData {
  statutoryRate: number;
  foreignMix: number;
  pillarTwoTopUp: number;
  rdCredits: number;
  effectiveTaxRate: number;
  deferredTaxChange: number;
  cashTaxesPaid: number;
}

export interface BalanceSheetData {
  cash: number;
  accountsReceivable: number;
  inventory: number;
  fixedAndIntangibleAssets: number;
  totalAssets: number;
  accountsPayable: number;
  longTermDebt: number;
  deferredTaxAndAccrued: number;
  totalLiabilities: number;
  paidInCapital: number;
  openingRetainedEarnings: number;
  dividends: number;
  endingRetainedEarnings: number;
  totalEquity: number;
}

export interface CashFlowData {
  openingCash: number;
  deltaNwc: number;
  operatingCashFlow: number;
  capex: number;
  debtRepayment: number;
  dividendsPaid: number;
  debtServiceAndDividends: number;
  endingCash: number;
  thirteenWeekHeadroom: number;
}

export interface ReconciledScenario {
  id: ScenarioId;
  label: string;
  shortTag: string;
  assumptionNote: string;
  monolithTiltDeg: number;
  particleVelocity: number;
  incomeStatement: IncomeStatementData;
  taxBridge: TaxBridgeData;
  balanceSheet: BalanceSheetData;
  cashFlow: CashFlowData;
}

export const SCENARIO_ORDER: ScenarioId[] = ["base", "fx-shock", "tax-reform"];

export const RECONCILED_SCENARIOS: Record<ScenarioId, ReconciledScenario> = {
  base: {
    id: "base",
    label: "Base Case · FY26 Plan",
    shortTag: "BASE CASE",
    assumptionNote:
      "Illustrative consolidated enterprise model · Nominal FX · 21.0% effective tax rate.",
    monolithTiltDeg: 0,
    particleVelocity: 1.0,
    incomeStatement: {
      revenue: 4820.0,
      cogs: 2740.0,
      grossProfit: 2080.0,
      opex: 940.0,
      ebitda: 1140.0,
      da: 180.0,
      ebit: 960.0,
      netInterest: 60.0,
      ebt: 900.0,
      taxExpense: 189.0,
      netIncome: 711.0,
    },
    taxBridge: {
      statutoryRate: 21.0,
      foreignMix: -1.2,
      pillarTwoTopUp: 1.8,
      rdCredits: -0.6,
      effectiveTaxRate: 21.0,
      deferredTaxChange: 19.0,
      cashTaxesPaid: 170.0,
    },
    balanceSheet: {
      cash: 1050.0,
      accountsReceivable: 790.0,
      inventory: 540.0,
      fixedAndIntangibleAssets: 3920.0,
      totalAssets: 6300.0,
      accountsPayable: 510.0,
      longTermDebt: 1540.0,
      deferredTaxAndAccrued: 450.0,
      totalLiabilities: 2500.0,
      paidInCapital: 1400.0,
      openingRetainedEarnings: 1789.0,
      dividends: 100.0,
      endingRetainedEarnings: 2400.0,
      totalEquity: 3800.0,
    },
    cashFlow: {
      openingCash: 680.0,
      deltaNwc: -70.0,
      operatingCashFlow: 840.0,
      capex: -260.0,
      debtRepayment: 110.0,
      dividendsPaid: 100.0,
      debtServiceAndDividends: -210.0,
      endingCash: 1050.0,
      thirteenWeekHeadroom: 1420.0,
    },
  },
  "fx-shock": {
    id: "fx-shock",
    label: "FX Shock · -8% EUR/USD",
    shortTag: "FX SHOCK (-8%)",
    assumptionNote:
      "Illustrative stress test · -8% European translation shock with working capital absorption.",
    monolithTiltDeg: 4.5,
    particleVelocity: 1.55,
    incomeStatement: {
      revenue: 4480.0,
      cogs: 2580.0,
      grossProfit: 1900.0,
      opex: 910.0,
      ebitda: 990.0,
      da: 180.0,
      ebit: 810.0,
      netInterest: 60.0,
      ebt: 750.0,
      taxExpense: 165.0,
      netIncome: 585.0,
    },
    taxBridge: {
      statutoryRate: 21.0,
      foreignMix: -0.4,
      pillarTwoTopUp: 2.0,
      rdCredits: -0.6,
      effectiveTaxRate: 22.0,
      deferredTaxChange: 15.0,
      cashTaxesPaid: 150.0,
    },
    balanceSheet: {
      cash: 980.0,
      accountsReceivable: 815.0,
      inventory: 565.0,
      fixedAndIntangibleAssets: 3880.0,
      totalAssets: 6240.0,
      accountsPayable: 515.0,
      longTermDebt: 1570.0,
      deferredTaxAndAccrued: 466.0,
      totalLiabilities: 2551.0,
      paidInCapital: 1400.0,
      openingRetainedEarnings: 1789.0,
      dividends: 85.0,
      endingRetainedEarnings: 2289.0,
      totalEquity: 3689.0,
    },
    cashFlow: {
      openingCash: 680.0,
      deltaNwc: -95.0,
      operatingCashFlow: 685.0,
      capex: -220.0,
      debtRepayment: 80.0,
      dividendsPaid: 85.0,
      debtServiceAndDividends: -165.0,
      endingCash: 980.0,
      thirteenWeekHeadroom: 1210.0,
    },
  },
  "tax-reform": {
    id: "tax-reform",
    label: "Pillar Two · +3.5% ETR",
    shortTag: "TAX REFORM (+3.5%)",
    assumptionNote:
      "Illustrative OECD Pillar Two minimum tax top-up · Cash tax outflow rises while ledger stays reconciled.",
    monolithTiltDeg: -3.5,
    particleVelocity: 1.3,
    incomeStatement: {
      revenue: 4820.0,
      cogs: 2740.0,
      grossProfit: 2080.0,
      opex: 940.0,
      ebitda: 1140.0,
      da: 180.0,
      ebit: 960.0,
      netInterest: 60.0,
      ebt: 900.0,
      taxExpense: 220.5,
      netIncome: 679.5,
    },
    taxBridge: {
      statutoryRate: 21.0,
      foreignMix: -0.5,
      pillarTwoTopUp: 4.6,
      rdCredits: -0.6,
      effectiveTaxRate: 24.5,
      deferredTaxChange: 12.5,
      cashTaxesPaid: 208.0,
    },
    balanceSheet: {
      cash: 1012.0,
      accountsReceivable: 790.0,
      inventory: 540.0,
      fixedAndIntangibleAssets: 3920.0,
      totalAssets: 6262.0,
      accountsPayable: 510.0,
      longTermDebt: 1540.0,
      deferredTaxAndAccrued: 443.5,
      totalLiabilities: 2493.5,
      paidInCapital: 1400.0,
      openingRetainedEarnings: 1789.0,
      dividends: 100.0,
      endingRetainedEarnings: 2368.5,
      totalEquity: 3768.5,
    },
    cashFlow: {
      openingCash: 680.0,
      deltaNwc: -70.0,
      operatingCashFlow: 802.0,
      capex: -260.0,
      debtRepayment: 110.0,
      dividendsPaid: 100.0,
      debtServiceAndDividends: -210.0,
      endingCash: 1012.0,
      thirteenWeekHeadroom: 1382.0,
    },
  },
};

export interface ReconciliationAudit {
  balanceSheetVariance: number;
  cashTieVariance: number;
  retainedEarningsVariance: number;
  taxBridgeVariance: number;
  pnlIntegrityVariance: number;
  isFullyReconciled: boolean;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Verifies cross-statement accounting integrity across P&L, Balance Sheet, Tax Bridge, and Treasury Cash Flow.
 */
export function verifyLedgerEquilibrium(
  scenario: ReconciledScenario
): ReconciliationAudit {
  const { incomeStatement: pl, taxBridge: tx, balanceSheet: bs, cashFlow: cf } =
    scenario;

  const pnlGrossCheck = round2(pl.revenue - pl.cogs - pl.grossProfit);
  const pnlEbitdaCheck = round2(pl.grossProfit - pl.opex - pl.ebitda);
  const pnlEbitCheck = round2(pl.ebitda - pl.da - pl.ebit);
  const pnlEbtCheck = round2(pl.ebit - pl.netInterest - pl.ebt);
  const pnlNetCheck = round2(pl.ebt - pl.taxExpense - pl.netIncome);
  const pnlIntegrityVariance = round2(
    Math.abs(pnlGrossCheck) +
      Math.abs(pnlEbitdaCheck) +
      Math.abs(pnlEbitCheck) +
      Math.abs(pnlEbtCheck) +
      Math.abs(pnlNetCheck)
  );

  const expectedEtr = round2(
    tx.statutoryRate + tx.foreignMix + tx.pillarTwoTopUp + tx.rdCredits
  );
  const expectedTaxExpense = round2((pl.ebt * expectedEtr) / 100);
  const expectedCashTax = round2(pl.taxExpense - tx.deferredTaxChange);
  const taxBridgeVariance = round2(
    Math.abs(expectedEtr - tx.effectiveTaxRate) +
      Math.abs(expectedTaxExpense - pl.taxExpense) +
      Math.abs(expectedCashTax - tx.cashTaxesPaid)
  );

  const computedAssets = round2(
    bs.cash + bs.accountsReceivable + bs.inventory + bs.fixedAndIntangibleAssets
  );
  const computedLiabilities = round2(
    bs.accountsPayable + bs.longTermDebt + bs.deferredTaxAndAccrued
  );
  const computedEquity = round2(bs.paidInCapital + bs.endingRetainedEarnings);
  const balanceSheetVariance = round2(
    Math.abs(computedAssets - bs.totalAssets) +
      Math.abs(computedLiabilities - bs.totalLiabilities) +
      Math.abs(computedEquity - bs.totalEquity) +
      Math.abs(bs.totalAssets - (bs.totalLiabilities + bs.totalEquity))
  );

  const expectedEndingRe = round2(
    bs.openingRetainedEarnings + pl.netIncome - bs.dividends
  );
  const retainedEarningsVariance = round2(
    Math.abs(expectedEndingRe - bs.endingRetainedEarnings)
  );

  const expectedOcf = round2(
    pl.netIncome + pl.da + tx.deferredTaxChange + cf.deltaNwc
  );
  const expectedEndingCash = round2(
    cf.openingCash + cf.operatingCashFlow + cf.capex + cf.debtServiceAndDividends
  );
  const cashTieVariance = round2(
    Math.abs(expectedOcf - cf.operatingCashFlow) +
      Math.abs(expectedEndingCash - cf.endingCash) +
      Math.abs(cf.endingCash - bs.cash)
  );

  const isFullyReconciled =
    balanceSheetVariance === 0 &&
    cashTieVariance === 0 &&
    retainedEarningsVariance === 0 &&
    taxBridgeVariance === 0 &&
    pnlIntegrityVariance === 0;

  return {
    balanceSheetVariance,
    cashTieVariance,
    retainedEarningsVariance,
    taxBridgeVariance,
    pnlIntegrityVariance,
    isFullyReconciled,
  };
}
