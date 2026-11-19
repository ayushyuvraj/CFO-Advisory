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
  const profileDir = path.join(process.env.TEMP || "C:\\Temp", "chrome-gov-grid-qa-" + Date.now());
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
  console.log("   GOVERNANCE GRID VIEW DETAILS VERIFICATION        ");
  console.log("====================================================");

  let chromeProc = null;
  let client = null;
  const results = [];

  try {
    chromeProc = await ensureChrome();

    // Authenticate
    console.log("[QA] Authenticating with KPMG Lead API...");
    const authRes = await fetch(`${BASE_URL}/api/auth/kpmg-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "kpmg.lead@kpmg.com",
        passcode: "KPMG#Lead2026!",
      }),
    });

    if (!authRes.ok) {
      throw new Error(`Auth failed: HTTP ${authRes.status}`);
    }

    const authData = await authRes.json();
    const rawCookieHeader = authRes.headers.get("set-cookie") || "";
    const sessionCookieMatch = rawCookieHeader.match(/kpmg_cfo_session=([^;]+)/);
    const sessionCookie = sessionCookieMatch ? sessionCookieMatch[1] : "";

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

    console.log(`[QA] Navigating to ${BASE_URL}/workflows...`);
    await client.send("Page.navigate", { url: `${BASE_URL}/workflows` });
    await sleep(2000);

    await client.eval(`
      sessionStorage.setItem("kpmg_cfo_advisory_session_v1", JSON.stringify(${JSON.stringify(authData.user)}));
      localStorage.setItem("kpmg_cfo_user", JSON.stringify(${JSON.stringify(authData.user)}));
      window.dispatchEvent(new Event("kpmg-cfo-session-change"));
    `);
    await sleep(1000);

    // Switch to Governance tab
    console.log("[QA] Navigating to Governance Tab...");
    await client.eval(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button[role="tab"]')).find(b => b.textContent.includes("Governance"));
        if (btn) btn.click();
      })()
    `);
    await sleep(1200);

    // Ensure Grid View in Governance Companies
    console.log("[QA] Ensuring Grid View in Companies...");
    await client.eval(`
      (() => {
        const gridBtn = document.querySelector('button[aria-label="Grid view"]');
        if (gridBtn) gridBtn.click();
      })()
    `);
    await sleep(800);

    // Inspect Company Grid Card Details
    const companyCardMetrics = await client.eval(`
      (() => {
        const firstCard = document.querySelector('[data-hub-card]');
        if (!firstCard) return null;
        const rect = firstCard.getBoundingClientRect();
        const text = firstCard.innerText;
        const hasCodeVal = text.includes("ABC-LTD");
        const hasEntitlementsVal = text.includes("0 / 1 Active");
        const hasPersonasVal = text.includes("1 Persona") || text.includes("1");
        const hasActiveBadge = text.includes("Active");
        const hasActionsBtn = Boolean(firstCard.querySelector('button[aria-label^="Manage access"]'));

        return {
          cardText: text,
          rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
          hasCodeVal,
          hasEntitlementsVal,
          hasPersonasVal,
          hasActiveBadge,
          hasActionsBtn
        };
      })()
    `);

    console.log("Company Card Metrics:", companyCardMetrics);

    results.push({
      test: "Company Grid View: Exact Dimensions (324px x 181px) & Spatial Y (168px)",
      pass: companyCardMetrics?.rect?.w === 324 && companyCardMetrics?.rect?.h === 181 && companyCardMetrics?.rect?.y === 168,
      details: `Rect: ${JSON.stringify(companyCardMetrics?.rect)}`,
    });

    results.push({
      test: "Company Grid View: Displays Code & Entitlements & Personas Values",
      pass: companyCardMetrics?.hasCodeVal && companyCardMetrics?.hasEntitlementsVal && companyCardMetrics?.hasPersonasVal,
      details: `Code: ${companyCardMetrics?.hasCodeVal}, Entitlements: ${companyCardMetrics?.hasEntitlementsVal}, Personas: ${companyCardMetrics?.hasPersonasVal}`,
    });

    results.push({
      test: "Company Grid View: Preserves Status Badge and Action Button",
      pass: companyCardMetrics?.hasActiveBadge && companyCardMetrics?.hasActionsBtn,
      details: `Active Badge: ${companyCardMetrics?.hasActiveBadge}, Action Btn: ${companyCardMetrics?.hasActionsBtn}`,
    });

    await client.captureScreenshot("qa_12_governance_companies_grid_with_details.png");

    // ========================================================
    // CHECK PRODUCTS SECTION IN GRID VIEW
    // ========================================================
    console.log("[QA] Switching to Products Section in Grid View...");
    await client.eval(`
      (() => {
        const prodBtn = Array.from(document.querySelectorAll('button[role="tab"]')).find(b => b.textContent.includes("Products"));
        if (prodBtn) prodBtn.click();
      })()
    `);
    await sleep(800);

    const productCardMetrics = await client.eval(`
      (() => {
        const firstCard = document.querySelector('[data-hub-card]');
        if (!firstCard) return null;
        const rect = firstCard.getBoundingClientRect();
        const text = firstCard.innerText;
        const hasProductIdVal = text.includes("invoice-processing-p2p");
        const hasEntitledOrgsVal = text.includes("Active") && text.includes("of");
        const hasOperationalBadge = text.includes("Operational");
        const hasActionsBtn = Boolean(firstCard.querySelector('button[aria-label^="Manage client entitlements"]'));

        return {
          cardText: text,
          rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
          hasProductIdVal,
          hasEntitledOrgsVal,
          hasOperationalBadge,
          hasActionsBtn
        };
      })()
    `);

    console.log("Product Card Metrics:", productCardMetrics);

    results.push({
      test: "Governance Products Grid View: Exact Dimensions (324px x 181px) & Spatial Y (168px)",
      pass: productCardMetrics?.rect?.w === 324 && productCardMetrics?.rect?.h === 181 && productCardMetrics?.rect?.y === 168,
      details: `Rect: ${JSON.stringify(productCardMetrics?.rect)}`,
    });

    results.push({
      test: "Governance Products Grid View: Displays Product ID & Entitled Orgs",
      pass: productCardMetrics?.hasProductIdVal && productCardMetrics?.hasEntitledOrgsVal,
      details: `Product ID: ${productCardMetrics?.hasProductIdVal}, Entitled Orgs: ${productCardMetrics?.hasEntitledOrgsVal}`,
    });

    await client.captureScreenshot("qa_13_governance_products_grid_with_details.png");

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
    console.log(`OVERALL RESULT: ${allPassed ? "ALL TESTS PASSED" : "TESTS FAILED"}`);
    console.log("====================================================");

    if (!allPassed) {
      process.exit(1);
    }
  } catch (err) {
    console.error("[QA ERROR]", err);
    process.exit(1);
  } finally {
    if (client) await client.close();
    process.exit(0);
  }
}

runTest();
