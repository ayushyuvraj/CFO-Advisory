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
  const profileDir = path.join(process.env.TEMP || "C:\\Temp", "chrome-catalog-qa-" + Date.now());
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

async function testCatalogGuardOnPort(port) {
  console.log(`\n======================================================`);
  console.log(`[CATALOG QA] Testing Catalog Guard on Port ${port}`);
  console.log(`======================================================`);

  const BASE_URL = `http://localhost:${port}`;

  // 1. Authenticate with KPMG Lead to inspect CreatePersonaModal
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

  await client.send("Page.navigate", { url: `${BASE_URL}/workflows` });
  await sleep(2000);

  await client.eval(`
    sessionStorage.setItem("kpmg_cfo_advisory_session_v1", JSON.stringify(${JSON.stringify(adminAuthData.user)}));
    localStorage.setItem("kpmg_cfo_user", JSON.stringify(${JSON.stringify(adminAuthData.user)}));
    window.dispatchEvent(new Event("kpmg-cfo-session-change"));
  `);
  await sleep(1000);

  // Navigate to Governance tab
  console.log(`   * Step 2: Opening Governance tab and Company Detail Drawer...`);
  await client.eval(`
    const btn = Array.from(document.querySelectorAll('button[role="tab"]')).find(b => b.textContent.includes("Governance"));
    if (btn) btn.click();
  `);
  await sleep(1500);

  // Open CompanyDetailDrawer
  await client.eval(`
    const card = document.querySelector('[data-hub-card]') || document.querySelector('tr[tabindex="0"]');
    const actionBtn = card?.querySelector('button[aria-label^="Manage access"]') || card;
    if (actionBtn) actionBtn.click();
  `);
  await sleep(1500);

  // Open CreatePersonaModal
  console.log(`   * Step 3: Opening CreatePersonaModal...`);
  await client.eval(`
    const addBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim().includes('Add Persona') || b.textContent.trim().includes('Create Persona'));
    if (addBtn) addBtn.click();
  `);
  await sleep(1500);

  // Verify "Product Catalog" switch in modal
  const modalSwitches = await client.eval(`
    const modal = document.querySelector('#persona-modal-title')?.closest('[role="dialog"]');
    if (!modal) return { error: 'Modal not found' };
    const switches = Array.from(modal.querySelectorAll('button[role="switch"]'));
    return switches.map(s => ({
      title: s.querySelector('p.font-semibold')?.textContent?.trim() || '',
      checked: s.getAttribute('aria-checked')
    }));
  `);
  console.log(`   * Modal Switches:`, modalSwitches);
  const catalogSwitch = modalSwitches.find(s => s.title === 'Product Catalog');
  if (!catalogSwitch) {
    throw new Error(`'Product Catalog' switch not found in CreatePersonaModal! Found: ${JSON.stringify(modalSwitches)}`);
  }

  // Toggle "Product Catalog" OFF and verify entitlement scope disabling & warning banner
  console.log(`   * Step 4: Toggling Product Catalog switch OFF...`);
  await client.eval(`
    const catSwitch = Array.from(document.querySelectorAll('button[role="switch"]')).find(s => s.innerText.includes('Product Catalog'));
    if (catSwitch) catSwitch.click();
  `);
  await sleep(500);

  const scopeBannerCheck = await client.eval(`
    const modal = document.querySelector('#persona-modal-title')?.closest('[role="dialog"]');
    if (!modal) return { error: 'Modal not found' };
    const banner = modal.innerText.includes('Product Catalog Disabled');
    const catSwitch = Array.from(modal.querySelectorAll('button[role="switch"]')).find(s => s.innerText.includes('Product Catalog'));
    const checked = catSwitch?.getAttribute('aria-checked');
    return { banner, checked };
  `);
  console.log(`   * Product Catalog toggled OFF check:`, scopeBannerCheck);
  if (scopeBannerCheck.checked !== 'false') {
    throw new Error(`Product Catalog switch did not toggle to false!`);
  }
  if (!scopeBannerCheck.banner) {
    throw new Error(`Warning banner for disabled Product Catalog scope not displayed!`);
  }

  // Screenshot modal with Product Catalog OFF
  await client.screenshot(`persona_modal_catalog_off_port_${port}.png`);

  // Close modal and drawer
  await client.eval(`
    const closeBtn = document.querySelector('[data-dialog-close="true"]');
    if (closeBtn) closeBtn.click();
  `);
  await sleep(600);
  await client.eval(`
    const drawerClose = document.querySelector('[data-dialog-close="true"]');
    if (drawerClose) drawerClose.click();
  `);
  await sleep(600);

  // Step 5: Sign in as persona with Catalog OFF (cfo@xyz.com)
  console.log(`   * Step 5: Logging in as client persona cfo@xyz.com (Catalog OFF, Dashboards ON, Audit ON)...`);
  const clientAuthRes = await fetch(`${BASE_URL}/api/auth/client-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "cfo@xyz.com", passcode: "CFO@123" }),
  });
  if (!clientAuthRes.ok) throw new Error(`Client login failed: ${clientAuthRes.status}`);
  const clientAuthData = await clientAuthRes.json();
  const clientRawCookie = clientAuthRes.headers.get("set-cookie") || "";
  const clientCookieMatch = clientRawCookie.match(/kpmg_cfo_session=([^;]+)/);
  const clientSessionCookie = clientCookieMatch ? clientCookieMatch[1] : "";

  if (clientSessionCookie) {
    await client.send("Network.setCookie", {
      name: "kpmg_cfo_session",
      value: clientSessionCookie,
      url: BASE_URL,
    });
  }

  await client.send("Page.navigate", { url: `${BASE_URL}/workflows` });
  await sleep(2000);

  await client.eval(`
    sessionStorage.setItem("kpmg_cfo_advisory_session_v1", JSON.stringify(${JSON.stringify(clientAuthData.user)}));
    localStorage.setItem("kpmg_cfo_user", JSON.stringify(${JSON.stringify(clientAuthData.user)}));
    window.dispatchEvent(new Event("kpmg-cfo-session-change"));
  `);
  await sleep(1500);

  // Step 6: Verify Navbar tabs for cfo@xyz.com
  console.log(`   * Step 6: Verifying Navbar tabs for cfo@xyz.com...`);
  const cfoTabs = await client.eval(`
    const nav = document.querySelector('nav[aria-label="Workflows Hub Navigation"]');
    if (!nav) return { error: 'Nav not found' };
    const tabTexts = Array.from(nav.querySelectorAll('button')).map(b => b.textContent.trim());
    return tabTexts;
  `);
  console.log(`   * Visible tabs for cfo@xyz.com:`, cfoTabs);

  const hasCatalogInNav = cfoTabs.some(t => t.toLowerCase().includes('catalog'));
  const hasDashboardsInNav = cfoTabs.some(t => t.toLowerCase().includes('dashboards'));
  const hasAuditInNav = cfoTabs.some(t => t.toLowerCase().includes('audit'));

  if (hasCatalogInNav) {
    throw new Error(`CRITICAL REGRESSION: 'Catalog' tab is visible in Navbar for persona with Catalog OFF!`);
  }
  if (!hasDashboardsInNav) {
    throw new Error(`Expected 'Dashboards' tab in Navbar for cfo@xyz.com!`);
  }
  if (!hasAuditInNav) {
    throw new Error(`Expected 'Audit' tab in Navbar for cfo@xyz.com!`);
  }

  // Step 7: Verify landing view and zero catalog products
  console.log(`   * Step 7: Verifying landing view and products isolation...`);
  const landingState = await client.eval(`
    const activeTab = Array.from(document.querySelectorAll('nav[aria-label="Workflows Hub Navigation"] button[aria-selected="true"]'))
      .map(b => b.textContent.trim())[0] || 'none';
    const catalogCards = document.querySelectorAll('[data-product-id]').length;
    const searchInputs = document.querySelectorAll('input[placeholder*="Search"]').length;
    return { activeTab, catalogCards, searchInputs };
  `);
  console.log(`   * Landing state:`, landingState);
  if (landingState.activeTab.toLowerCase().includes('catalog')) {
    throw new Error(`CRITICAL: Landing tab is Catalog! Should be Dashboards or Audit.`);
  }
  if (landingState.catalogCards > 0) {
    throw new Error(`CRITICAL: Found ${landingState.catalogCards} product cards rendered for Catalog-disabled persona!`);
  }

  // Step 8: Direct URL test: /workflows?tab=catalog must auto-correct
  console.log(`   * Step 8: Attempting direct navigation to /workflows?tab=catalog...`);
  await client.navigate(`${BASE_URL}/workflows?tab=catalog`);
  await sleep(2000);

  const directUrlCheck = await client.eval(`
    const url = window.location.href;
    const activeTab = Array.from(document.querySelectorAll('nav[aria-label="Workflows Hub Navigation"] button[aria-selected="true"]'))
      .map(b => b.textContent.trim())[0] || 'none';
    const catalogCards = document.querySelectorAll('[data-product-id]').length;
    const restrictedBanner = document.innerText ? document.innerText.includes('Catalog Access Restricted') : false;
    return { url, activeTab, catalogCards, restrictedBanner };
  `);
  console.log(`   * Direct navigation to ?tab=catalog result:`, directUrlCheck);

  if (directUrlCheck.catalogCards > 0) {
    throw new Error(`CRITICAL: Product cards leaked when directly visiting ?tab=catalog!`);
  }
  if (directUrlCheck.activeTab.toLowerCase().includes('catalog')) {
    throw new Error(`CRITICAL: Active tab stayed on Catalog for unauthorized persona!`);
  }

  // Take screenshot of cfo@xyz.com workflows view (Dashboards active, Catalog tab completely absent)
  await client.screenshot(`persona_no_catalog_nav_port_${port}.png`);

  client.close();
  console.log(`[PASS] Catalog guard verification on Port ${port} PASSED cleanly.`);
}

async function main() {
  await ensureChrome();
  await testCatalogGuardOnPort(3000);
  console.log(`\n======================================================`);
  console.log(`ALL CATALOG ACCESS GUARD QA GATES PASSED (Port 3000)`);
  console.log(`======================================================\n`);
}

main().catch((err) => {
  console.error('\n[FAIL]', err);
  process.exit(1);
});
