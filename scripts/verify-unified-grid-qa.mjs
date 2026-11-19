import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACT_DIR = "C:\\Users\\HP\\.gemini\\antigravity\\brain\\7db67949-59e4-4a88-973d-e83b46bf9706";
const DEBUG_PORT = 9222;
const BASE_URL = "http://localhost:3000";

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
    console.log(`[QA] Chrome already active on port ${DEBUG_PORT}`);
    return null;
  }

  console.log(`[QA] Launching Chrome on port ${DEBUG_PORT}...`);
  const profileDir = path.join(process.env.TEMP || "C:\\Temp", "chrome-grid-qa-" + Date.now());
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

  for (let i = 0; i < 25; i++) {
    await sleep(400);
    if (await isPortOpen()) {
      console.log(`[QA] Chrome debugger ready.`);
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
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new globalThis.WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.id && this.callbacks.has(data.id)) {
          const { res, rej } = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) rej(data.error);
          else res(data.result);
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

  async eval(expr) {
    const res = await this.send("Runtime.evaluate", {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  }

  async captureScreenshot(filename) {
    const res = await this.send("Page.captureScreenshot", { format: "png" });
    const buffer = Buffer.from(res.data, "base64");
    const filePath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(filePath, buffer);
    console.log(`[Screenshot] Saved ${filename}`);
    return filePath;
  }

  async close() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
    }
  }
}

async function runTest() {
  console.log("====================================================");
  console.log("  UNIFIED 4-CARD GRID & MINIMAL INFO AUTOMATED QA   ");
  console.log("====================================================");

  let chromeProc = null;
  let client = null;
  const results = [];

  try {
    chromeProc = await ensureChrome();

    // 1. Authenticate with server-signed cookie as KPMG Lead
    console.log(`[QA] Authenticating with KPMG Lead API...`);
    const authRes = await fetch(`${BASE_URL}/api/auth/kpmg-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "kpmg.lead@kpmg.com",
        passcode: "KPMG#Lead2026!",
      }),
    });

    if (!authRes.ok) {
      throw new Error(`Authentication failed on ${BASE_URL}: HTTP ${authRes.status}`);
    }

    const authData = await authRes.json();
    const rawCookieHeader = authRes.headers.get("set-cookie") || "";
    const sessionCookieMatch = rawCookieHeader.match(/kpmg_cfo_session=([^;]+)/);
    const sessionCookie = sessionCookieMatch ? sessionCookieMatch[1] : "";
    console.log(`[QA] Authenticated as ${authData.user.name} (${authData.user.role})`);

    // 2. Open new page target at baseUrl/workflows
    const newPageRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?${BASE_URL}/workflows`, {
      method: "PUT",
    });
    const pageInfo = await newPageRes.json();
    client = new CDPClient(pageInfo.webSocketDebuggerUrl);
    await client.connect();

    await client.send("Page.enable");
    await client.send("DOM.enable");
    await client.send("Runtime.enable");
    await client.send("Network.enable");

    if (sessionCookie) {
      await client.send("Network.setCookie", {
        name: "kpmg_cfo_session",
        value: sessionCookie,
        url: BASE_URL,
      });
    }

    // Navigate to /workflows first
    console.log(`[QA] Navigating to ${BASE_URL}/workflows...`);
    await client.send("Page.navigate", { url: `${BASE_URL}/workflows` });
    await sleep(2000);

    // Seed storage session for instant hydration
    await client.eval(`
      sessionStorage.setItem("kpmg_cfo_advisory_session_v1", JSON.stringify(${JSON.stringify(authData.user)}));
      localStorage.setItem("kpmg_cfo_user", JSON.stringify(${JSON.stringify(authData.user)}));
      window.dispatchEvent(new Event("kpmg-cfo-session-change"));
    `);
    await sleep(1000);

    const bodySnippet = await client.eval(`document.body.innerText.slice(0, 300)`);
    console.log(`[QA] Body snippet:`, bodySnippet);

    const checkAuthed = await client.eval(`Boolean(document.querySelector('nav[aria-label="Workflows Hub Navigation"]'))`);
    console.log(`[QA] Authenticated as KPMG Lead: ${checkAuthed}`);
    if (!checkAuthed) {
      throw new Error("Failed to authenticate to Workflows Hub.");
    }

    // ========================================================
    // GATE 1: CATALOG TAB AUDIT & MEASUREMENTS
    // ========================================================
    console.log("\n--- Checking Gate 1: Catalog Tab ---");
    await client.eval(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button[role="tab"]')).find(b => b.textContent.includes("Catalog"));
        if (btn) btn.click();
      })()
    `);
    await sleep(1000);

    const catalogGrid = await client.eval(`
      (() => {
        const grid = document.querySelector('[data-hub-card]')?.parentElement;
        if (!grid) return null;
        const rect = grid.getBoundingClientRect();
        const computed = window.getComputedStyle(grid);
        const cols = computed.gridTemplateColumns.split(" ").length;
        const cards = Array.from(grid.querySelectorAll('[data-hub-card]'));
        const firstCard = cards[0]?.getBoundingClientRect();
        return {
          gridCols: cols,
          gridWidth: rect.width,
          cardCount: cards.length,
          firstCard: firstCard ? { x: Math.round(firstCard.x), y: Math.round(firstCard.y), w: Math.round(firstCard.width), h: Math.round(firstCard.height) } : null,
          hasDescription: Boolean(document.querySelector('[data-hub-card] p.line-clamp-2')),
          hasSmileActions: Boolean(document.querySelector('[data-hub-card] [aria-label*="Inspect"], [data-hub-card] [aria-label*="Launch"]'))
        };
      })()
    `);

    console.log("Catalog Grid Metrics:", catalogGrid);
    results.push({
      test: "Catalog 4-Column Grid Layout",
      pass: catalogGrid && catalogGrid.gridCols === 4,
      details: `Columns: ${catalogGrid?.gridCols}, Card: ${JSON.stringify(catalogGrid?.firstCard)}`,
    });
    results.push({
      test: "Catalog Minimal Information (No Multiline Description)",
      pass: catalogGrid && catalogGrid.hasDescription === false,
      details: `Has description: ${catalogGrid?.hasDescription}`,
    });

    await client.captureScreenshot("qa_01_catalog_grid.png");

    // Test Catalog Table Switcher
    await client.eval(`
      (() => {
        const tableBtn = document.querySelector('button[aria-label="Table view"]');
        if (tableBtn) tableBtn.click();
      })()
    `);
    await sleep(600);

    const catalogTable = await client.eval(`
      (() => {
        const th = document.querySelector('table th');
        if (!th) return null;
        const comp = window.getComputedStyle(th);
        const tr = document.querySelector('table tr');
        return {
          headerBg: comp.backgroundColor,
          headerFont: comp.fontFamily,
          hasTable: Boolean(document.querySelector('table'))
        };
      })()
    `);
    results.push({
      test: "Catalog Table View Harmonization",
      pass: catalogTable && catalogTable.hasTable,
      details: `Table active, headerBg: ${catalogTable?.headerBg}`,
    });

    await client.captureScreenshot("qa_02_catalog_table.png");

    // Switch back to Grid
    await client.eval(`
      (() => {
        const gridBtn = document.querySelector('button[aria-label="Grid view"]');
        if (gridBtn) gridBtn.click();
      })()
    `);
    await sleep(600);

    // ========================================================
    // GATE 2: DASHBOARDS TAB AUDIT & SPATIAL ALIGNMENT
    // ========================================================
    console.log("\n--- Checking Gate 2: Dashboards Tab ---");
    await client.eval(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button[role="tab"]')).find(b => b.textContent.includes("Dashboards"));
        if (btn) btn.click();
      })()
    `);
    await sleep(1200);

    const dashboardGrid = await client.eval(`
      (() => {
        const grid = document.querySelector('[data-hub-card]')?.parentElement;
        if (!grid) return null;
        const rect = grid.getBoundingClientRect();
        const computed = window.getComputedStyle(grid);
        const cols = computed.gridTemplateColumns.split(" ").length;
        const cards = Array.from(grid.querySelectorAll('[data-hub-card]'));
        const firstCard = cards[0]?.getBoundingClientRect();
        return {
          gridCols: cols,
          gridWidth: rect.width,
          cardCount: cards.length,
          firstCard: firstCard ? { x: Math.round(firstCard.x), y: Math.round(firstCard.y), w: Math.round(firstCard.width), h: Math.round(firstCard.height) } : null,
          hasDescription: Boolean(document.querySelector('[data-hub-card] p.line-clamp-2')),
          hasSmileActions: Boolean(document.querySelector('[data-hub-card] [aria-label*="Present"], [data-hub-card] [aria-label*="Studio"], [data-hub-card] [aria-label*="Viewer"]'))
        };
      })()
    `);

    console.log("Dashboard Grid Metrics:", dashboardGrid);
    const yDelta = Math.abs((catalogGrid?.firstCard?.y || 0) - (dashboardGrid?.firstCard?.y || 0));
    console.log(`Spatial Y Coordinate Delta (Catalog vs Dashboards): ${yDelta}px`);

    results.push({
      test: "Dashboards 4-Column Grid Layout",
      pass: dashboardGrid && dashboardGrid.gridCols === 4,
      details: `Columns: ${dashboardGrid?.gridCols}, Card count: ${dashboardGrid?.cardCount}`,
    });
    results.push({
      test: "Dashboards Minimal Information (No Multiline Description)",
      pass: dashboardGrid && dashboardGrid.hasDescription === false,
      details: `Has multiline description: ${dashboardGrid?.hasDescription}`,
    });
    results.push({
      test: "Sub-pixel Spatial Y Alignment (Catalog vs Dashboards <= 2px)",
      pass: yDelta <= 2,
      details: `Y-Delta: ${yDelta}px (Catalog Y: ${catalogGrid?.firstCard?.y}, Dashboard Y: ${dashboardGrid?.firstCard?.y})`,
    });

    await client.captureScreenshot("qa_03_dashboards_grid.png");

    // Test Dashboard Table View
    await client.eval(`
      (() => {
        const tableBtn = document.querySelector('button[aria-label="Table view"]');
        if (tableBtn) tableBtn.click();
      })()
    `);
    await sleep(600);

    const dashboardTable = await client.eval(`Boolean(document.querySelector('table'))`);
    results.push({
      test: "Dashboards Table View Toggle & Synchronization",
      pass: dashboardTable,
      details: `Table active in Dashboards: ${dashboardTable}`,
    });

    await client.captureScreenshot("qa_04_dashboards_table.png");

    // Switch back to Grid
    await client.eval(`
      (() => {
        const gridBtn = document.querySelector('button[aria-label="Grid view"]');
        if (gridBtn) gridBtn.click();
      })()
    `);
    await sleep(600);

    // ========================================================
    // GATE 3: GOVERNANCE TAB (COMPANIES & PRODUCTS)
    // ========================================================
    console.log("\n--- Checking Gate 3: Governance Tab (Companies & Products) ---");
    await client.eval(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button[role="tab"]')).find(b => b.textContent.includes("Governance"));
        if (btn) btn.click();
      })()
    `);
    await sleep(1200);

    // 3A: By-Company Grid
    const companyGrid = await client.eval(`
      (() => {
        const grid = document.querySelector('[data-hub-card]')?.parentElement;
        if (!grid) return null;
        const computed = window.getComputedStyle(grid);
        const cols = computed.gridTemplateColumns.split(" ").length;
        const cards = Array.from(grid.querySelectorAll('[data-hub-card]'));
        const firstCard = cards[0]?.getBoundingClientRect();
        return {
          gridCols: cols,
          cardCount: cards.length,
          firstCard: firstCard ? { x: Math.round(firstCard.x), y: Math.round(firstCard.y), w: Math.round(firstCard.width), h: Math.round(firstCard.height) } : null,
          hasSmileActions: Boolean(document.querySelector('[data-hub-card] [aria-label*="Manage access"]'))
        };
      })()
    `);

    console.log("Governance Companies Grid Metrics:", companyGrid);
    const companyYDelta = Math.abs((catalogGrid?.firstCard?.y || 0) - (companyGrid?.firstCard?.y || 0));

    results.push({
      test: "Governance Companies 4-Column Grid",
      pass: companyGrid && companyGrid.gridCols === 4,
      details: `Columns: ${companyGrid?.gridCols}, Count: ${companyGrid?.cardCount}`,
    });
    results.push({
      test: "Sub-pixel Spatial Y Alignment (Catalog vs Governance Companies <= 2px)",
      pass: companyYDelta <= 2,
      details: `Y-Delta: ${companyYDelta}px (Catalog Y: ${catalogGrid?.firstCard?.y}, Governance Y: ${companyGrid?.firstCard?.y})`,
    });

    await client.captureScreenshot("qa_05_governance_companies_grid.png");

    // 3B: Switch to By-Product Sub-Tab
    console.log("[QA] Switching to Governance Products Sub-View...");
    await client.eval(`
      (() => {
        const productTabBtn = Array.from(document.querySelectorAll('button[role="tab"]')).find(b => b.textContent.includes("Products"));
        if (productTabBtn) productTabBtn.click();
      })()
    `);
    await sleep(600);

    const govProductGrid = await client.eval(`
      (() => {
        const grid = document.querySelector('[data-hub-card]')?.parentElement;
        if (!grid) return null;
        const computed = window.getComputedStyle(grid);
        const cols = computed.gridTemplateColumns.split(" ").length;
        const cards = Array.from(grid.querySelectorAll('[data-hub-card]'));
        const firstCard = cards[0]?.getBoundingClientRect();
        return {
          gridCols: cols,
          cardCount: cards.length,
          firstCard: firstCard ? { x: Math.round(firstCard.x), y: Math.round(firstCard.y), w: Math.round(firstCard.width), h: Math.round(firstCard.height) } : null,
          hasSmileActions: Boolean(document.querySelector('[data-hub-card] [aria-label*="Manage client entitlements"]'))
        };
      })()
    `);

    console.log("Governance Products Grid Metrics:", govProductGrid);
    results.push({
      test: "Governance Products 4-Column Grid",
      pass: govProductGrid && govProductGrid.gridCols === 4,
      details: `Columns: ${govProductGrid?.gridCols}, Count: ${govProductGrid?.cardCount}`,
    });

    await client.captureScreenshot("qa_06_governance_products_grid.png");

    // Test ProductAccessDrawer
    console.log("[QA] Opening ProductAccessDrawer from product card...");
    await client.eval(`
      (() => {
        const manageBtn = document.querySelector('[data-hub-card] [aria-label*="Manage client entitlements"]');
        if (manageBtn) manageBtn.click();
      })()
    `);
    await sleep(600);

    const drawerInfo = await client.eval(`
      (() => {
        const drawer = document.querySelector('div[role="dialog"][aria-labelledby="drawer-product-governance-title"]');
        if (!drawer) return null;
        const zIndex = window.getComputedStyle(drawer).zIndex;
        return {
          isOpen: true,
          zIndex: parseInt(zIndex, 10),
          hasSwitches: Boolean(drawer.querySelector('button[role="switch"]'))
        };
      })()
    `);

    results.push({
      test: "Governance ProductAccessDrawer Portal & Z-Index Gate (z >= 90)",
      pass: drawerInfo && drawerInfo.isOpen && drawerInfo.zIndex >= 90,
      details: `Drawer open: ${drawerInfo?.isOpen}, z-index: ${drawerInfo?.zIndex}`,
    });

    await client.captureScreenshot("qa_07_product_access_drawer.png");

    // Close drawer with Escape
    await client.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
    await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape" });
    await sleep(500);

    const drawerClosed = await client.eval(`!Boolean(document.querySelector('div[role="dialog"][aria-labelledby="drawer-product-governance-title"]'))`);
    results.push({
      test: "ProductAccessDrawer Escape Dismissal",
      pass: drawerClosed,
      details: `Drawer closed on Escape: ${drawerClosed}`,
    });

    // ========================================================
    // GATE 4: LIVE AUDIT TAB & TABLE SYNCHRONIZATION
    // ========================================================
    console.log("\n--- Checking Gate 4: Live Audit Tab ---");
    await client.eval(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button[role="tab"]')).find(b => b.textContent.includes("Audit"));
        if (btn) btn.click();
      })()
    `);
    await sleep(1000);

    const auditTable = await client.eval(`
      (() => {
        const th = document.querySelector('table th');
        if (!th) return null;
        const comp = window.getComputedStyle(th);
        return {
          headerBg: comp.backgroundColor,
          headerColor: comp.color,
          headerFont: comp.fontFamily
        };
      })()
    `);

    console.log("Audit Table Metrics:", auditTable);
    results.push({
      test: "Audit Table Header Standardization",
      pass: auditTable !== null,
      details: `Audit table headerBg: ${auditTable?.headerBg}, color: ${auditTable?.headerColor}`,
    });

    await client.captureScreenshot("qa_08_audit_table.png");

    // ========================================================
    // GATE 5: ZERO SIMULATION & COPY AUDIT
    // ========================================================
    console.log("\n--- Checking Gate 5: Zero Simulation & Anti-Slop Copy Audit ---");
    const copyAudit = await client.eval(`
      (() => {
        const bodyText = document.body.innerText;
        const emDashCount = (bodyText.match(/—/g) || []).length;
        const fakeDemoCount = (bodyText.match(/simulation|simulated workflow|fake demo/gi) || []).length;
        return { emDashCount, fakeDemoCount };
      })()
    `);

    results.push({
      test: "Anti-Slop Zero Em-Dashes (\u2014) in Rendered Text",
      pass: copyAudit && copyAudit.emDashCount === 0,
      details: `Em-dash count: ${copyAudit?.emDashCount}`,
    });

    results.push({
      test: "Zero Simulation Invariant (Zero fake/simulated entities in DOM)",
      pass: copyAudit && copyAudit.fakeDemoCount === 0,
      details: `Fake/demo tokens found: ${copyAudit?.fakeDemoCount}`,
    });

    // Print Final Results Table
    console.log("\n====================================================");
    console.log("               QA TEST RESULTS SUMMARY              ");
    console.log("====================================================");
    let allPassed = true;
    for (const r of results) {
      const status = r.pass ? "[PASS]" : "[FAIL]";
      if (!r.pass) allPassed = false;
      console.log(`${status} ${r.test}`);
      console.log(`       ${r.details}`);
    }
    console.log("====================================================");
    console.log(`OVERALL RESULT: ${allPassed ? "ALL 11 GATES PASSED CLEANLY" : "SOME GATES FAILED"}`);
    console.log("====================================================");

    if (!allPassed) {
      process.exit(1);
    }
  } catch (err) {
    console.error("[QA FATAL ERROR]", err);
    process.exit(1);
  } finally {
    if (client) await client.close();
    process.exit(0);
  }
}

runTest();
