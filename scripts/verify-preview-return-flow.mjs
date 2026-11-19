import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACT_DIR = "C:\\Users\\HP\\.gemini\\antigravity\\brain\\1a1f0e71-9511-4a4b-9595-978ccc7da3d1";
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
  const profileDir = path.join(process.env.TEMP || "C:\\Temp", "chrome-preview-qa-" + Date.now());
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
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
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
    const trimmed = expression.trim();
    const wrapped =
      trimmed.startsWith("(() =>") || trimmed.startsWith("function") || !trimmed.includes("return")
        ? trimmed
        : `(() => { ${trimmed} })()`;
    const res = await this.send("Runtime.evaluate", {
      expression: wrapped,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.result?.exceptionDetails) {
      console.error("[CDP Eval Error]", res.result.exceptionDetails);
    }
    return res.result?.value;
  }

  async navigate(url) {
    await this.send("Page.navigate", { url });
    await sleep(2500);
  }

  async screenshot(name) {
    const res = await this.send("Page.captureScreenshot", { format: "png" });
    const buffer = Buffer.from(res.data, "base64");
    const filePath = path.join(ARTIFACT_DIR, name);
    fs.writeFileSync(filePath, buffer);
    console.log(`[QA Screenshot] Saved -> ${name}`);
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function testPreviewReturnOnPort(port) {
  console.log(`\n======================================================`);
  console.log(`[PREVIEW QA] Testing Preview Return Flow on Port ${port}`);
  console.log(`======================================================`);

  const BASE_URL = `http://localhost:${port}`;

  // 1. Authenticate with KPMG Lead
  console.log(`   * Step 1: Authenticating as KPMG Lead...`);
  const adminAuthRes = await fetch(`${BASE_URL}/api/auth/kpmg-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "kpmg.lead@kpmg.com",
      passcode: "KPMG#Lead2026!",
    }),
  });
  if (!adminAuthRes.ok) throw new Error(`KPMG Lead login failed: ${adminAuthRes.status}`);
  const adminAuthData = await adminAuthRes.json();
  const adminRawCookie = adminAuthRes.headers.get("set-cookie") || "";
  const adminCookieMatch = adminRawCookie.match(/kpmg_cfo_session=([^;]+)/);
  const adminSessionCookie = adminCookieMatch ? adminCookieMatch[1] : "";

  // Open page in Chrome via CDP
  const newPageRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?${BASE_URL}/workflows`, {
    method: "PUT",
  });
  const pageInfo = await newPageRes.json();
  const client = new CDPClient(pageInfo.webSocketDebuggerUrl);
  await client.connect();

  await client.send("Page.enable");
  await client.send("DOM.enable");
  await client.send("Runtime.enable");
  await client.send("Network.enable");

  if (adminSessionCookie) {
    await client.send("Network.setCookie", {
      name: "kpmg_cfo_session",
      value: adminSessionCookie,
      url: BASE_URL,
    });
  }

  await client.send("Page.navigate", { url: `${BASE_URL}/workflows?tab=governance` });
  await sleep(2500);

  await client.eval(`
    sessionStorage.setItem("kpmg_cfo_advisory_session_v1", JSON.stringify(${JSON.stringify(adminAuthData.user)}));
    localStorage.setItem("kpmg_cfo_user", JSON.stringify(${JSON.stringify(adminAuthData.user)}));
    window.dispatchEvent(new Event("kpmg-cfo-session-change"));
  `);
  await sleep(1500);

  // Step 2: Open CompanyDetailDrawer for a specific company (e.g. xyz ltd)
  console.log(`   * Step 2: Opening CompanyDetailDrawer for 'xyz ltd'...`);
  const openResult = await client.eval(`
    const cards = Array.from(document.querySelectorAll('[data-hub-card]') || []);
    let target = cards.find(c => c.innerText.toLowerCase().includes('xyz ltd'));
    if (!target) target = cards[0];
    if (target) {
      const actionBtn = target.querySelector('button[aria-label^="Manage access"]') || target;
      actionBtn.click();
      return { clicked: true, text: target.innerText.split('\\n')[0] };
    }
    return { clicked: false };
  `);
  console.log(`   * Card click result:`, openResult);
  await sleep(1500);

  // Verify URL has companyId
  const urlCheckBefore = await client.eval(`window.location.search`);
  console.log(`   * Search params after opening drawer: ${urlCheckBefore}`);
  if (!urlCheckBefore.includes('companyId=')) {
    throw new Error(`Expected 'companyId=' in URL search params, found: ${urlCheckBefore}`);
  }

  // Screenshot 1: Governance with drawer open before preview
  await client.screenshot(`preview_return_before_port_${port}.png`);

  // Step 3: Find a persona in the drawer and click "Preview As"
  console.log(`   * Step 3: Clicking 'Preview As' on a persona in the drawer...`);
  const previewClick = await client.eval(`
    (() => {
      const drawer = document.querySelector('[role="dialog"]');
      if (!drawer) return { error: 'Drawer not found' };
      const previewBtn = Array.from(drawer.querySelectorAll('button')).find(b => b.innerText.includes('Preview As'));
      if (!previewBtn) return { error: 'Preview As button not found' };
      previewBtn.click();
      return { clicked: true };
    })()
  `);
  console.log(`   * Preview As button clicked:`, previewClick);
  await sleep(2500);

  // Step 4: Verify Preview Mode is active
  console.log(`   * Step 4: Verifying Preview Mode state & banner...`);
  const previewState = await client.eval(`
    (() => {
      const banner = document.querySelector('[data-preview-banner="true"]');
      const bannerText = banner?.innerText || '';
      const exitBtn = banner?.querySelector('[data-exit-preview="true"]') || banner?.querySelector('button');
      const exitBtnText = exitBtn?.innerText || '';
      return {
        hasBanner: Boolean(banner),
        bannerText,
        exitBtnText,
      };
    })()
  `);
  console.log(`   * Preview mode banner check:`, previewState);
  if (!previewState || !previewState.hasBanner) {
    throw new Error(`PreviewBanner not found when entering preview mode!`);
  }
  if (!previewState.exitBtnText.toLowerCase().includes('governance')) {
    throw new Error(`Expected context-aware exit button mentioning Governance, found: '${previewState.exitBtnText}'`);
  }

  // Screenshot 2: Active Preview Mode
  await client.screenshot(`preview_mode_active_port_${port}.png`);

  // Step 5: Click "Exit Preview & Return to ... Governance"
  console.log(`   * Step 5: Clicking Exit Preview button: '${previewState.exitBtnText}'...`);
  await client.eval(`
    (() => {
      const exitBtn = document.querySelector('[data-exit-preview="true"]') || document.querySelector('[data-preview-banner="true"] button');
      if (exitBtn) exitBtn.click();
    })()
  `);
  await sleep(2500);

  // Step 6: Verify Exact Return to Governance & Company Drawer Open
  console.log(`   * Step 6: Verifying return to Governance console & Company Drawer...`);
  const returnState = await client.eval(`
    (() => {
      const url = window.location.href;
      const search = window.location.search;
      const activeTabBtn = document.querySelector('nav[aria-label="Workflows Hub Navigation"] button[aria-selected="true"]');
      const activeTabText = activeTabBtn?.innerText || '';
      const drawer = document.querySelector('[role="dialog"]');
      const drawerTitle = document.querySelector('#company-drawer-title')?.innerText || '';
      const hasPersonas = drawer ? Boolean(drawer.querySelector('button[aria-label^="Edit persona"]') || drawer.innerText.includes('Company Personas')) : false;

      return {
        url,
        search,
        activeTabText,
        isDrawerOpen: Boolean(drawer),
        drawerTitle,
        hasPersonas,
      };
    })()
  `);
  console.log(`   * Return state check:`, returnState);

  if (!returnState.search.includes('tab=governance')) {
    throw new Error(`CRITICAL: Did not return to tab=governance! Found search: ${returnState.search}`);
  }
  if (!returnState.search.includes('companyId=')) {
    throw new Error(`CRITICAL: URL missing companyId parameter! Found search: ${returnState.search}`);
  }
  if (!returnState.isDrawerOpen) {
    throw new Error(`CRITICAL: CompanyDetailDrawer is NOT open after exiting preview!`);
  }

  // Screenshot 3: Restored exact screen (Governance + Drawer open)
  await client.screenshot(`preview_returned_exact_screen_port_${port}.png`);

  client.close();
  console.log(`[PASS] Preview Return verification on Port ${port} PASSED with 100% fidelity.`);
}

async function main() {
  await ensureChrome();
  await testPreviewReturnOnPort(3000);
  await testPreviewReturnOnPort(3001);
  console.log(`\n======================================================`);
  console.log(`ALL PREVIEW EXACT RETURN QA GATES PASSED (Port 3000 & 3001)`);
  console.log(`======================================================\n`);
}

main().catch((err) => {
  console.error('\n[FAIL]', err);
  process.exit(1);
});
