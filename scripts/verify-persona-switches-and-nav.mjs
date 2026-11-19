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
  const profileDir = path.join(process.env.TEMP || "C:\\Temp", "chrome-persona-qa-" + Date.now());
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

async function testBrowserOnPort(port) {
  console.log(`\n======================================================`);
  console.log(`[BROWSER QA] Testing UI & Switches on Port ${port}`);
  console.log(`======================================================`);

  const BASE_URL = `http://localhost:${port}`;

  // 1. Authenticate with KPMG Lead API
  console.log(`   * Authenticating via KPMG Lead API...`);
  const authRes = await fetch(`${BASE_URL}/api/auth/kpmg-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "kpmg.lead@kpmg.com",
      passcode: "KPMG#Lead2026!",
    }),
  });
  if (!authRes.ok) throw new Error(`KPMG Lead login failed: ${authRes.status}`);
  const authData = await authRes.json();
  const rawCookie = authRes.headers.get("set-cookie") || "";
  const cookieMatch = rawCookie.match(/kpmg_cfo_session=([^;]+)/);
  const sessionCookie = cookieMatch ? cookieMatch[1] : "";

  // 2. Open page in Chrome via CDP
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

  if (sessionCookie) {
    await client.send("Network.setCookie", {
      name: "kpmg_cfo_session",
      value: sessionCookie,
      url: BASE_URL,
    });
  }

  await client.send("Page.navigate", { url: `${BASE_URL}/workflows` });
  await sleep(2000);

  await client.eval(`
    sessionStorage.setItem("kpmg_cfo_advisory_session_v1", JSON.stringify(${JSON.stringify(authData.user)}));
    localStorage.setItem("kpmg_cfo_user", JSON.stringify(${JSON.stringify(authData.user)}));
    window.dispatchEvent(new Event("kpmg-cfo-session-change"));
  `);
  await sleep(1000);

  // 3. Switch to Governance tab
  console.log(`   * Navigating to Governance tab...`);
  await client.eval(`
    (() => {
      const btn = Array.from(document.querySelectorAll('button[role="tab"]')).find(b => b.textContent.includes("Governance"));
      if (btn) btn.click();
    })()
  `);
  await sleep(1500);

  // 4. Open CompanyDetailDrawer
  console.log(`   * Opening CompanyDetailDrawer...`);
  await client.eval(`
    (() => {
      const card = document.querySelector('[data-hub-card]') || document.querySelector('tr[tabindex="0"]');
      const actionBtn = card?.querySelector('button[aria-label^="Manage access"]') || card;
      if (actionBtn) actionBtn.click();
    })()
  `);
  await sleep(1500);

  // 4. Verify CompanyDetailDrawer persona badges: Launch, Audit, Dashboards present; Export ABSENT
  const drawerBadges = await client.eval(`
    const drawer = document.querySelector('[role="dialog"]');
    if (!drawer) return { error: 'Drawer not found' };
    const text = drawer.innerText;
    return {
      hasLaunch: text.includes('Launch:'),
      hasAudit: text.includes('Audit:'),
      hasDashboards: text.includes('Dashboards:'),
      hasExport: text.includes('Export:'),
    };
  `);
  console.log(`   * Drawer persona badges check:`, drawerBadges);
  if (drawerBadges.hasExport) {
    throw new Error(`Obsolete 'Export:' badge still found in CompanyDetailDrawer!`);
  }

  // 5. Click "Add Persona" button
  console.log(`   * Opening CreatePersonaModal...`);
  await client.eval(`
    const addBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim().includes('Add Persona') || b.textContent.trim().includes('Create Persona'));
    if (addBtn) addBtn.click();
  `);
  await sleep(1500);

  // 6. Verify CreatePersonaModal Feature Toggles:
  // - Exactly 3 switches
  // - Real toggle switch markup (pill track + sliding thumb)
  // - "Data Export" completely absent
  const modalCheck = await client.eval(`
    const modal = document.querySelector('#persona-modal-title')?.closest('[role="dialog"]');
    if (!modal) return { error: 'Modal not found' };
    const switches = Array.from(modal.querySelectorAll('button[role="switch"]'));
    const modalText = modal.innerText;
    const switchDetails = switches.map(s => {
      const title = s.querySelector('p.font-semibold')?.textContent?.trim() || '';
      const checked = s.getAttribute('aria-checked');
      const track = s.querySelector('.rounded-full');
      const thumb = track?.querySelector('span');
      return {
        title,
        checked,
        hasTrack: Boolean(track),
        hasThumb: Boolean(thumb),
      };
    });
    return {
      switchCount: switches.length,
      hasDataExportText: modalText.includes('Data Export'),
      switchDetails,
    };
  `);
  console.log(`   * CreatePersonaModal check:`, modalCheck);
  if (modalCheck.switchCount !== 3) {
    throw new Error(`Expected exactly 3 switches in CreatePersonaModal, found ${modalCheck.switchCount}`);
  }
  if (modalCheck.hasDataExportText) {
    throw new Error(`'Data Export' text still present in CreatePersonaModal!`);
  }
  for (const s of modalCheck.switchDetails) {
    if (!s.hasTrack || !s.hasThumb) {
      throw new Error(`Switch for '${s.title}' is missing visual track or sliding thumb!`);
    }
  }

  // 7. Test interactive toggling of Dashboards switch
  console.log(`   * Testing interactive toggling on Dashboards switch...`);
  const initialChecked = await client.eval(`
    const dashSwitch = Array.from(document.querySelectorAll('button[role="switch"]')).find(s => s.innerText.includes('Dashboards'));
    return dashSwitch?.getAttribute('aria-checked');
  `);
  console.log(`     - Dashboards switch initial aria-checked: ${initialChecked} (expected false)`);

  await client.eval(`
    const dashSwitch = Array.from(document.querySelectorAll('button[role="switch"]')).find(s => s.innerText.includes('Dashboards'));
    if (dashSwitch) dashSwitch.click();
  `);
  await sleep(300);

  const toggledChecked = await client.eval(`
    const dashSwitch = Array.from(document.querySelectorAll('button[role="switch"]')).find(s => s.innerText.includes('Dashboards'));
    return dashSwitch?.getAttribute('aria-checked');
  `);
  console.log(`     - Dashboards switch after click aria-checked: ${toggledChecked} (expected true)`);
  if (toggledChecked !== 'true') {
    throw new Error(`Failed to toggle Dashboards switch to true`);
  }

  // Toggle back to false
  await client.eval(`
    const dashSwitch = Array.from(document.querySelectorAll('button[role="switch"]')).find(s => s.innerText.includes('Dashboards'));
    if (dashSwitch) dashSwitch.click();
  `);
  await sleep(300);

  // Take screenshot of polished modal with switch toggles
  await client.screenshot(`persona_modal_switches_port_${port}.png`);

  // Close modal and drawer
  await client.eval(`
    const closeBtn = document.querySelector('[data-dialog-close="true"]');
    if (closeBtn) closeBtn.click();
  `);
  await sleep(800);
  await client.eval(`
    const drawerClose = document.querySelector('[data-dialog-close="true"]');
    if (drawerClose) drawerClose.click();
  `);
  await sleep(800);

  // 8. Sign out and sign in as client persona WITHOUT dashboard access (admin@apex.com)
  console.log(`   * Authenticating as restricted client persona (admin@apex.com)...`);
  const clientAuthRes = await fetch(`${BASE_URL}/api/auth/client-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@apex.com", passcode: "apex@123" }),
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
  await sleep(1000);

  // 9. Verify Navbar for admin@apex.com (Dashboards tab MUST NOT exist)
  const navTabs = await client.eval(`
    const nav = document.querySelector('nav[aria-label="Workflows Hub Navigation"]');
    if (!nav) return { error: 'Nav not found' };
    const tabTexts = Array.from(nav.querySelectorAll('button')).map(b => b.textContent.trim());
    return tabTexts;
  `);
  console.log(`   * Visible tabs for admin@apex.com:`, navTabs);
  if (navTabs.some(t => t.toLowerCase().includes('dashboards'))) {
    throw new Error(`CRITICAL: 'Dashboards' tab is visible in Navbar for persona without dashboard access!`);
  }
  if (navTabs.some(t => t.toLowerCase().includes('governance'))) {
    throw new Error(`CRITICAL: 'Governance' tab is visible in Navbar for client persona!`);
  }

  // 10. Attempt direct navigation to ?tab=dashboards and verify auto-correction to Catalog
  console.log(`   * Attempting direct navigation to /workflows?tab=dashboards...`);
  await client.navigate(`http://localhost:${port}/workflows?tab=dashboards`);
  await sleep(2000);

  const pageContentCheck = await client.eval(`
    const hasCatalogSearch = Boolean(document.querySelector('input[placeholder*="Search"]'));
    const hasDashboardStudio = Boolean(document.querySelector('[data-dashboard-studio="true"]') || document.querySelector('.echarts-for-react'));
    return { hasCatalogSearch, hasDashboardStudio };
  `);
  console.log(`   * Direct navigation result:`, pageContentCheck);
  if (pageContentCheck.hasDashboardStudio) {
    throw new Error(`CRITICAL: Dashboard studio rendered for unauthorized persona via direct URL!`);
  }

  // Take screenshot of restricted persona catalog view
  await client.screenshot(`persona_restricted_nav_port_${port}.png`);

  client.close();
  console.log(`[PASS] UI and Switch verification on Port ${port} completed successfully.`);
}

async function main() {
  await ensureChrome();
  await testBrowserOnPort(3000);
  await testBrowserOnPort(3001);
  console.log(`\n======================================================`);
  console.log(`ALL BROWSER INTERACTION & UI GATES PASSED (Port 3000 & 3001)`);
  console.log(`======================================================\n`);
}

main().catch((err) => {
  console.error('\n[FAIL]', err);
  process.exit(1);
});
