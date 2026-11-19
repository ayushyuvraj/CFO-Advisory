import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACT_DIR = "C:\\Users\\HP\\.gemini\\antigravity\\brain\\4a86a5d6-9022-49d8-9dd3-c6a735e97086";
const DEBUG_PORT = 9222;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function isPortOpen() {
  try {
    const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
    return res.ok;
  } catch {
    return false;
  }
}

async function ensureChrome() {
  if (await isPortOpen()) {
    console.log(`[QA] Chrome already listening on port ${DEBUG_PORT}`);
    return null;
  }

  console.log(`[QA] Launching headless Chrome on port ${DEBUG_PORT}...`);
  const profileDir = path.join(process.env.TEMP || "C:\\Temp", "chrome-qa-run-" + Date.now());
  const proc = spawn(
    CHROME_PATH,
    [
      "--headless=new",
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${profileDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--window-size=1440,900",
    ],
    { detached: true, stdio: "ignore" }
  );

  for (let i = 0; i < 20; i++) {
    await sleep(400);
    if (await isPortOpen()) {
      console.log(`[QA] Headless Chrome ready on port ${DEBUG_PORT}`);
      return proc;
    }
  }
  throw new Error("Failed to start Chrome on port " + DEBUG_PORT);
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 0;
    this.callbacks = new Map();
    this.consoleLogs = [];
    this.consoleErrors = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.method === "Runtime.consoleAPICalled") {
          const text = msg.params.args.map((a) => a.value ?? a.description ?? "").join(" ");
          this.consoleLogs.push(text);
          if (msg.params.type === "error") {
            this.consoleErrors.push(text);
          }
        }
        if (msg.method === "Runtime.exceptionThrown") {
          this.consoleErrors.push(msg.params.exceptionDetails?.text || "Exception thrown");
        }
        if (msg.id && this.callbacks.has(msg.id)) {
          const { res, rej } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) rej(msg.error);
          else res(msg.result);
        }
      };
    });
  }

  async send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.callbacks.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result?.value;
  }

  async navigate(url) {
    await this.send("Page.navigate", { url });
    await sleep(2500);
  }

  async screenshot(filePath) {
    const res = await this.send("Page.captureScreenshot", { format: "png" });
    const buffer = Buffer.from(res.data, "base64");
    fs.writeFileSync(filePath, buffer);
    console.log(`[QA Screenshot] Saved -> ${path.basename(filePath)}`);
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function runQAPass(baseUrl, label) {
  console.log(`\n======================================================`);
  console.log(`[QA] RUNNING COMPREHENSIVE MULTI-TAB SUITE: ${label} (${baseUrl})`);
  console.log(`======================================================`);

  // 1. Authenticate with server-signed cookie
  const authRes = await fetch(`${baseUrl}/api/auth/kpmg-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "kpmg.lead@kpmg.com",
      passcode: "KPMG#Lead2026!",
    }),
  });

  if (!authRes.ok) {
    throw new Error(`Authentication failed on ${baseUrl}: HTTP ${authRes.status}`);
  }

  const authData = await authRes.json();
  const rawCookieHeader = authRes.headers.get("set-cookie") || "";
  const sessionCookieMatch = rawCookieHeader.match(/kpmg_cfo_session=([^;]+)/);
  const sessionCookie = sessionCookieMatch ? sessionCookieMatch[1] : "";
  console.log(`[QA] Authenticated as ${authData.user.name} (${authData.user.role})`);

  // 2. Open new page target
  const newPageRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?${baseUrl}/workflows`, {
    method: "PUT",
  });
  const pageInfo = await newPageRes.json();
  const client = new CDPClient(pageInfo.webSocketDebuggerUrl);
  await client.connect();

  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Network.enable");

  if (sessionCookie) {
    const domain = new URL(baseUrl).hostname;
    await client.send("Network.setCookie", {
      name: "kpmg_cfo_session",
      value: sessionCookie,
      domain,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    });
  }

  // Seed storage session for instant hydration
  await client.eval(`
    sessionStorage.setItem("kpmg_cfo_advisory_session_v1", JSON.stringify(${JSON.stringify(authData.user)}));
    localStorage.setItem("kpmg_cfo_user", JSON.stringify(${JSON.stringify(authData.user)}));
  `);

  console.log(`[QA] Navigating to ${baseUrl}/workflows...`);
  await client.navigate(`${baseUrl}/workflows`);
  await sleep(2000);

  const defects = [];

  // ==========================================
  // TAB 1: SOLUTION CATALOG
  // ==========================================
  console.log(`[QA Tab 1: Solution Catalog] Validating Clean Invariants & Live Probe...`);
  const catalogCheck = await client.eval(`
    (() => {
      const text = document.body.innerText.toLowerCase();
      const card = document.querySelector("[data-product-card]") || document.querySelector("h3")?.closest("div");
      const cardText = card ? card.innerText.toLowerCase() : text;

      return {
        hasOperational: cardText.includes("operational") || text.includes("operational"),
        hasTransformationAI: cardText.includes("transformation_ai"),
        hasPort5173: cardText.includes(":5173") || cardText.includes("port 5173"),
        hasRuns: cardText.includes("runs") || cardText.includes("9 runs"),
        hasLatencyMs: cardText.includes("ms") || cardText.includes("166234"),
        hasERPClutter: cardText.includes("erp: sap") || cardText.includes("erp:"),
        hasCmdK: text.includes("⌘k") || text.includes("ctrl+k"),
        hasPillarTabs: text.includes("ai & automation") || text.includes("treasury & capital"),
        hasFilterBtn: Boolean(Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim().startsWith('Filter'))),
        hasSortBtn: Boolean(Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim().startsWith('Sort'))),
        hasAddProductBtn: Boolean(Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Add Product'))),
        hasProductTitle: text.includes("ai invoice processing"),
      };
    })()
  `);

  console.log(`[QA Tab 1 Check]:`, JSON.stringify(catalogCheck, null, 2));

  if (!catalogCheck.hasProductTitle) defects.push("Product title missing in Catalog.");
  if (!catalogCheck.hasOperational) defects.push("Dynamic health status 'Operational' badge missing.");
  if (catalogCheck.hasTransformationAI) defects.push("FAIL: Raw 'TRANSFORMATION_AI' enum visible on card.");
  if (catalogCheck.hasPort5173) defects.push("FAIL: Localhost port ':5173' visible on card.");
  if (catalogCheck.hasRuns) defects.push("FAIL: 'runs' count visible on card.");
  if (catalogCheck.hasLatencyMs) defects.push("FAIL: 'ms' latency visible on card.");
  if (catalogCheck.hasERPClutter) defects.push("FAIL: 'ERP: SAP S/4HANA' text visible on card.");
  if (catalogCheck.hasCmdK) defects.push("FAIL: '⌘K' badge visible in search.");
  if (catalogCheck.hasPillarTabs) defects.push("FAIL: Hardcoded pillar tabs visible.");
  if (!catalogCheck.hasFilterBtn) defects.push("Filter button missing in Catalog.");
  if (!catalogCheck.hasSortBtn) defects.push("Sort button missing in Catalog.");
  if (!catalogCheck.hasAddProductBtn) defects.push("Add Product button missing in Catalog.");

  // Measure Catalog Control Bar Coordinates
  const catalogBarRect = await client.eval(`
    (() => {
      const input = document.querySelector("input[placeholder*='platforms']");
      if (!input) return null;
      const bar = input.closest(".border");
      const rect = bar ? bar.getBoundingClientRect() : null;
      return rect ? { top: Math.round(rect.top), left: Math.round(rect.left), height: Math.round(rect.height) } : null;
    })()
  `);
  console.log(`[QA Catalog Control Bar Coordinate]:`, JSON.stringify(catalogBarRect));

  await client.screenshot(path.join(ARTIFACT_DIR, `qa_${label}_catalog_grid.png`));

  // 3D Card Hover & Click Pop Verification
  console.log(`[QA] Testing 3D Card Hover & Pop Physics...`);
  await client.eval(`
    (() => {
      const card = document.querySelector("[data-product-card]");
      if (card) {
        const rect = card.getBoundingClientRect();
        card.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        card.dispatchEvent(new MouseEvent('mousemove', {
          bubbles: true,
          clientX: rect.left + rect.width * 0.75,
          clientY: rect.top + rect.height * 0.25,
        }));
      }
    })()
  `);
  await sleep(300);
  const hover3DCheck = await client.eval(`
    (() => {
      const card = document.querySelector("[data-product-card]");
      if (!card) return { hasCard: false };
      const style = card.getAttribute('style') || '';
      return {
        hasCard: true,
        hasPerspective: style.includes("perspective"),
        hasPreserve3D: style.includes("preserve-3d"),
        hasRotate: style.includes("rotateX") || style.includes("rotateY"),
        hasPopTranslate: style.includes("translateY") || style.includes("scale3d"),
      };
    })()
  `);
  console.log(`[QA 3D Hover Check]:`, JSON.stringify(hover3DCheck, null, 2));
  if (!hover3DCheck.hasPerspective || !hover3DCheck.hasPreserve3D) {
    defects.push("3D card perspective or preserve-3d style missing.");
  }
  await client.screenshot(path.join(ARTIFACT_DIR, `qa_${label}_card_3d_hover.png`));

  // Test Click Pop (Press feedback)
  console.log(`[QA] Testing 3D Card Click Pop (Press Feedback)...`);
  await client.eval(`
    (() => {
      const card = document.querySelector("[data-product-card]");
      if (card) {
        card.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      }
    })()
  `);
  await sleep(150);
  const clickPopCheck = await client.eval(`
    (() => {
      const card = document.querySelector("[data-product-card]");
      if (!card) return false;
      const style = card.getAttribute('style') || '';
      return style.includes("scale3d(0.975");
    })()
  `);
  console.log(`[QA Click Pop Check]: ${clickPopCheck}`);
  await client.screenshot(path.join(ARTIFACT_DIR, `qa_${label}_card_click_pop.png`));

  // Release click and mouseleave
  await client.eval(`
    (() => {
      const card = document.querySelector("[data-product-card]");
      if (card) {
        card.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        card.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
      }
    })()
  `);
  await sleep(200);

  // Test Filter Popover
  console.log(`[QA] Testing Catalog Filter Popover...`);
  await client.eval(`
    (() => {
      const b = Array.from(document.querySelectorAll('button')).find(el => el.innerText.trim().startsWith('Filter'));
      if (b) b.click();
    })()
  `);
  await sleep(400);
  const filterOpen = await client.eval(`
    (() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes("all statuses") && text.includes("operational");
    })()
  `);
  console.log(`[QA] Catalog Filter popover functional: ${filterOpen}`);
  if (!filterOpen) defects.push("Catalog filter popover options missing.");
  await client.screenshot(path.join(ARTIFACT_DIR, `qa_${label}_filter_open.png`));

  // Close filter
  await client.eval(`
    (() => {
      const b = Array.from(document.querySelectorAll('button')).find(el => el.innerText.trim().startsWith('Filter'));
      if (b) b.click();
    })()
  `);
  await sleep(300);

  // Test Sort Popover
  console.log(`[QA] Testing Catalog Sort Popover...`);
  await client.eval(`
    (() => {
      const b = Array.from(document.querySelectorAll('button')).find(el => el.innerText.trim().startsWith('Sort'));
      if (b) b.click();
    })()
  `);
  await sleep(400);
  const sortOpen = await client.eval(`
    (() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes("name (a → z)") || text.includes("name (a -> z)") || text.includes("operational status");
    })()
  `);
  console.log(`[QA] Catalog Sort popover functional: ${sortOpen}`);
  if (!sortOpen) defects.push("Catalog sort popover options missing.");
  await client.screenshot(path.join(ARTIFACT_DIR, `qa_${label}_sort_open.png`));

  // Close sort
  await client.eval(`
    (() => {
      const b = Array.from(document.querySelectorAll('button')).find(el => el.innerText.trim().startsWith('Sort'));
      if (b) b.click();
    })()
  `);
  await sleep(300);

  // Test Slide-Over Details Drawer
  console.log(`[QA] Testing Slide-over Details Drawer...`);
  await client.eval(`
    (() => {
      const b = document.querySelector("button[aria-label*='Inspect']") ||
                document.querySelector("button[title*='Inspect']");
      if (b) b.click();
    })()
  `);
  await sleep(700);
  const drawerOpen = await client.eval(`
    (() => {
      const dialog = document.querySelector("[role='dialog']");
      if (!dialog) return false;
      const text = dialog.innerText.toLowerCase();
      return (text.includes("platform overview") || text.includes("core platform capabilities")) &&
             text.includes("backend service");
    })()
  `);
  console.log(`[QA] Slide-over drawer opened and rendered with backend breakdown: ${drawerOpen}`);
  if (!drawerOpen) defects.push("Slide-over drawer failed to mount or render content.");
  await client.screenshot(path.join(ARTIFACT_DIR, `qa_${label}_drawer_open.png`));

  // Close drawer
  await client.eval(`
    (() => {
      const closeBtn = document.querySelector("button[aria-label*='Close drawer']");
      if (closeBtn) closeBtn.click();
    })()
  `);
  await sleep(500);

  // Test Table View Toggle
  console.log(`[QA] Testing View Switcher to Table View...`);
  await client.eval(`
    (() => {
      const tableBtn = document.querySelector("button[title*='Table'], button[aria-label*='Table']");
      if (tableBtn) tableBtn.click();
    })()
  `);
  await sleep(400);
  const tableActive = await client.eval(`Boolean(document.querySelector("table"))`);
  console.log(`[QA] High-Density Table active: ${tableActive}`);
  if (!tableActive) defects.push("High-Density Table view did not activate.");
  await client.screenshot(path.join(ARTIFACT_DIR, `qa_${label}_table_view.png`));

  // ==========================================
  // TAB 2: LIVE AUDIT & OBSERVABILITY
  // ==========================================
  console.log(`\n[QA Tab 2: Audit] Switching to Live Audit Tab...`);
  await client.eval(`
    (() => {
      const tabs = Array.from(document.querySelectorAll("button, a"));
      const auditTab = tabs.find(t => t.innerText.toLowerCase().includes("live audit") || t.innerText.toLowerCase().includes("audit"));
      if (auditTab) auditTab.click();
    })()
  `);
  await sleep(1500);

  const auditStripCheck = await client.eval(`
    (() => {
      const text = document.body.innerText.toLowerCase();
      const hasBar = Boolean(document.querySelector("input[placeholder*='actions']"));
      const hasFilter = Boolean(Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim().startsWith('Status') || b.innerText.trim().startsWith('Filter')));
      const hasProductFilter = Boolean(Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim().startsWith('Product')));
      const hasSort = Boolean(Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim().startsWith('Sort')));
      const hasSOXBanner = text.includes("sox audit command center") || text.includes("continuous telemetry ingestion active");
      const hasKPICards = text.includes("total spend (usd)") || text.includes("tokens consumed") || text.includes("avg latency");
      const hasPollingBadge = text.includes("3s polling") || text.includes("polling");
      const hasExportLogBtn = Boolean(Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes("Export Log")));
      return { hasBar, hasFilter, hasProductFilter, hasSort, hasSOXBanner, hasKPICards, hasPollingBadge, hasExportLogBtn, isAuditActive: text.includes("audit") };
    })()
  `);
  console.log(`[QA Audit Strip Check]:`, JSON.stringify(auditStripCheck, null, 2));
  if (!auditStripCheck.hasBar) defects.push("Audit tab: Unified search input missing.");
  if (!auditStripCheck.hasFilter) defects.push("Audit tab: Status filter button missing.");
  if (!auditStripCheck.hasProductFilter) defects.push("Audit tab: Product filter button missing.");
  if (!auditStripCheck.hasSort) defects.push("Audit tab: Sort button missing.");
  if (!auditStripCheck.hasExportLogBtn) defects.push("Audit tab: Export Log primary CTA button missing.");
  if (auditStripCheck.hasSOXBanner) defects.push("FAIL: Redundant SOX Command Center banner still visible in Audit tab.");
  if (auditStripCheck.hasKPICards) defects.push("FAIL: Redundant KPI cards still visible in Audit tab.");
  if (!auditStripCheck.hasPollingBadge) defects.push("FAIL: 3s polling indicator missing in Audit tab.");

  // Measure Audit Control Bar Coordinate
  const auditBarRect = await client.eval(`
    (() => {
      const input = document.querySelector("input[placeholder*='actions']");
      if (!input) return null;
      const bar = input.closest(".border");
      const rect = bar ? bar.getBoundingClientRect() : null;
      return rect ? { top: Math.round(rect.top), left: Math.round(rect.left), height: Math.round(rect.height) } : null;
    })()
  `);
  console.log(`[QA Audit Control Bar Coordinate]:`, JSON.stringify(auditBarRect));

  if (catalogBarRect && auditBarRect) {
    const diff = Math.abs(catalogBarRect.top - auditBarRect.top);
    console.log(`[QA Vertical Coordinate Alignment]: Catalog top = ${catalogBarRect.top}px, Audit top = ${auditBarRect.top}px, Delta = ${diff}px`);
    if (diff > 2) {
      defects.push(`FAIL: Control bar vertical position mismatch! Catalog=${catalogBarRect.top}px, Audit=${auditBarRect.top}px (delta: ${diff}px)`);
    } else {
      console.log(`>>> [PERFECT ALIGNMENT] Control bar sits at exact same Y coordinate between Catalog and Audit (delta: ${diff}px) <<<`);
    }
  }

  await client.screenshot(path.join(ARTIFACT_DIR, `qa_${label}_audit_tab.png`));

  // ==========================================
  // TAB 3: EXECUTIVE DASHBOARDS STUDIO
  // ==========================================
  console.log(`\n[QA Tab 3: Dashboards] Switching to Dashboards Tab...`);
  await client.eval(`
    (() => {
      const tabs = Array.from(document.querySelectorAll("button, a"));
      const dashTab = tabs.find(t => t.innerText.toLowerCase().includes("dashboard"));
      if (dashTab) dashTab.click();
    })()
  `);
  await sleep(1500);

  const dashStripCheck = await client.eval(`
    (() => {
      const text = document.body.innerText.toLowerCase();
      const hasBar = Boolean(document.querySelector("input[placeholder*='dashboards']"));
      const hasFilter = Boolean(Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim().startsWith('Scope') || b.innerText.trim().startsWith('Filter')));
      const hasSort = Boolean(Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim().startsWith('Sort')));
      const hasDashHero = text.includes("executive dashboards studio") && text.includes("47 visual types");
      const hasSemanticCards = text.includes("telemetry events") && text.includes("entitlements");
      const hasImportJsonBtn = Boolean(Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes("Import JSON")));
      const hasNewDashBtn = Boolean(Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes("New Dashboard")));
      return { hasBar, hasFilter, hasSort, hasDashHero, hasSemanticCards, hasImportJsonBtn, hasNewDashBtn, isDashActive: text.includes("dashboard") };
    })()
  `);
  console.log(`[QA Dashboards Strip Check]:`, JSON.stringify(dashStripCheck, null, 2));
  if (!dashStripCheck.hasBar) defects.push("Dashboards tab: Unified search input missing.");
  if (!dashStripCheck.hasFilter) defects.push("Dashboards tab: Scope filter button missing.");
  if (!dashStripCheck.hasSort) defects.push("Dashboards tab: Sort button missing.");
  if (dashStripCheck.hasDashHero) defects.push("FAIL: Redundant Dashboards studio banner still visible.");
  if (dashStripCheck.hasSemanticCards) defects.push("FAIL: Redundant semantic sources cards still visible in Dashboards.");
  if (!dashStripCheck.hasImportJsonBtn) defects.push("FAIL: Import JSON button missing from Dashboards control bar.");
  if (!dashStripCheck.hasNewDashBtn) defects.push("FAIL: New Dashboard button missing from Dashboards control bar.");

  // Measure Dashboards Control Bar Coordinate
  const dashBarRect = await client.eval(`
    (() => {
      const input = document.querySelector("input[placeholder*='dashboards']");
      if (!input) return null;
      const bar = input.closest(".border");
      const rect = bar ? bar.getBoundingClientRect() : null;
      return rect ? { top: Math.round(rect.top), left: Math.round(rect.left), height: Math.round(rect.height) } : null;
    })()
  `);
  console.log(`[QA Dashboards Control Bar Coordinate]:`, JSON.stringify(dashBarRect));

  if (catalogBarRect && dashBarRect) {
    const diff = Math.abs(catalogBarRect.top - dashBarRect.top);
    console.log(`[QA Vertical Coordinate Alignment]: Catalog top = ${catalogBarRect.top}px, Dashboards top = ${dashBarRect.top}px, Delta = ${diff}px`);
    if (diff > 2) {
      defects.push(`FAIL: Dashboards control bar vertical mismatch! Catalog=${catalogBarRect.top}px, Dashboards=${dashBarRect.top}px (delta: ${diff}px)`);
    } else {
      console.log(`>>> [PERFECT ALIGNMENT] Control bar sits at exact same Y coordinate between Catalog and Dashboards (delta: ${diff}px) <<<`);
    }
  }

  await client.screenshot(path.join(ARTIFACT_DIR, `qa_${label}_dashboards_tab.png`));

  // ==========================================
  // TAB 4: ACCESS GOVERNANCE
  // ==========================================
  console.log(`\n[QA Tab 4: Governance] Switching to Governance Tab...`);
  await client.eval(`
    (() => {
      const tabs = Array.from(document.querySelectorAll("button, a"));
      const govTab = tabs.find(t => t.innerText.toLowerCase().includes("governance") || t.innerText.toLowerCase().includes("client"));
      if (govTab) govTab.click();
    })()
  `);
  await sleep(1500);

  const govStripCheck = await client.eval(`
    (() => {
      const text = document.body.innerText.toLowerCase();
      const hasBar = Boolean(document.querySelector("input[placeholder*='organizations']"));
      const hasFilter = Boolean(Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim().startsWith('Status') || b.innerText.trim().startsWith('Filter')));
      const hasSort = Boolean(Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim().startsWith('Sort')));
      const hasGovMetricCards = text.includes("onboarded companies") || text.includes("active entitlements") || text.includes("configured personas");
      const hasAddOrgBtn = Boolean(Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes("Add Organization")));
      const hasViewSwitcher = Boolean(Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes("Companies")));
      return { hasBar, hasFilter, hasSort, hasGovMetricCards, hasAddOrgBtn, hasViewSwitcher, isGovActive: text.includes("organization") || text.includes("company") };
    })()
  `);
  console.log(`[QA Governance Strip Check]:`, JSON.stringify(govStripCheck, null, 2));
  if (!govStripCheck.hasBar) defects.push("Governance tab: Unified search input missing.");
  if (!govStripCheck.hasFilter) defects.push("Governance tab: Status filter button missing.");
  if (!govStripCheck.hasSort) defects.push("Governance tab: Sort button missing.");
  if (govStripCheck.hasGovMetricCards) defects.push("FAIL: Redundant summary metric cards still visible in Governance tab.");
  if (!govStripCheck.hasAddOrgBtn) defects.push("FAIL: Add Organization CTA missing from Governance control bar.");
  if (!govStripCheck.hasViewSwitcher) defects.push("FAIL: View switcher missing from Governance control bar.");

  // Measure Governance Control Bar Coordinate
  const govBarRect = await client.eval(`
    (() => {
      const input = document.querySelector("input[placeholder*='organizations']");
      if (!input) return null;
      const bar = input.closest(".border");
      const rect = bar ? bar.getBoundingClientRect() : null;
      return rect ? { top: Math.round(rect.top), left: Math.round(rect.left), height: Math.round(rect.height) } : null;
    })()
  `);
  console.log(`[QA Governance Control Bar Coordinate]:`, JSON.stringify(govBarRect));

  if (catalogBarRect && govBarRect) {
    const diff = Math.abs(catalogBarRect.top - govBarRect.top);
    console.log(`[QA Vertical Coordinate Alignment]: Catalog top = ${catalogBarRect.top}px, Governance top = ${govBarRect.top}px, Delta = ${diff}px`);
    if (diff > 2) {
      defects.push(`FAIL: Governance control bar vertical mismatch! Catalog=${catalogBarRect.top}px, Governance=${govBarRect.top}px (delta: ${diff}px)`);
    } else {
      console.log(`>>> [PERFECT ALIGNMENT] Control bar sits at exact same Y coordinate between Catalog and Governance (delta: ${diff}px) <<<`);
    }
  }

  // Final 4-Tab Coordinate & Thickness Summary
  if (catalogBarRect && auditBarRect && dashBarRect && govBarRect) {
    const coords = [catalogBarRect.top, auditBarRect.top, dashBarRect.top, govBarRect.top];
    const heights = [catalogBarRect.height, auditBarRect.height, dashBarRect.height, govBarRect.height];
    const maxDelta = Math.max(...coords) - Math.min(...coords);
    const maxHeightDelta = Math.max(...heights) - Math.min(...heights);
    console.log(`\n======================================================`);
    console.log(`[4-TAB SEAMLESS ALIGNMENT & THICKNESS VERDICT]`);
    console.log(`Catalog:    Top = ${catalogBarRect.top}px, Height = ${catalogBarRect.height}px`);
    console.log(`Audit:      Top = ${auditBarRect.top}px, Height = ${auditBarRect.height}px`);
    console.log(`Dashboards: Top = ${dashBarRect.top}px, Height = ${dashBarRect.height}px`);
    console.log(`Governance: Top = ${govBarRect.top}px, Height = ${govBarRect.height}px`);
    console.log(`Maximum Vertical Coordinate Delta: ${maxDelta}px`);
    console.log(`Maximum Thickness (Height) Delta:  ${maxHeightDelta}px`);
    console.log(`======================================================\n`);
    if (maxDelta > 1) {
      defects.push(`FAIL: 4-Tab maximum vertical delta exceeds tolerance (${maxDelta}px > 1px).`);
    }
    if (maxHeightDelta > 1) {
      defects.push(`FAIL: 4-Tab maximum thickness (height) delta exceeds tolerance (${maxHeightDelta}px > 1px).`);
    }
  }

  await client.screenshot(path.join(ARTIFACT_DIR, `qa_${label}_governance_tab.png`));

  // Check console errors
  if (client.consoleErrors.length > 0) {
    defects.push(`Console errors: ${client.consoleErrors.join("; ")}`);
  }

  client.close();
  await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/close/${pageInfo.id}`);

  if (defects.length === 0) {
    console.log(`\n>>> [PASSED] ${label}: 0 DEFECTS FOUND ACROSS ALL 4 TABS <<<`);
    return { passed: true, defects: [] };
  } else {
    console.error(`\n>>> [FAILED] ${label}: ${defects.length} DEFECTS:`, defects);
    return { passed: false, defects };
  }
}

async function main() {
  const chromeProc = await ensureChrome();
  try {
    const res3000 = await runQAPass("http://localhost:3000", "port3000_original");
    const res3001 = await runQAPass("http://localhost:3001", "port3001_v2");

    console.log(`\n======================================================`);
    console.log(`[FINAL QA VERDICT]`);
    console.log(`Port 3000 (Original): ${res3000.passed ? "PASSED (100% GREEN)" : "FAILED"}`);
    console.log(`Port 3001 (V2):       ${res3001.passed ? "PASSED (100% GREEN)" : "FAILED"}`);
    console.log(`======================================================\n`);

    if (!res3000.passed || !res3001.passed) {
      process.exit(1);
    }
  } finally {
    if (chromeProc) chromeProc.kill();
  }
}

main().catch((err) => {
  console.error("[QA FATAL ERROR]:", err);
  process.exit(1);
});
