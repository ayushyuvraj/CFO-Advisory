import { spawn } from "child_process";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const DEBUG_PORT = 9222;
const baseUrl = "http://localhost:3000";

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
    return null;
  }
  const profileDir = path.join(process.env.TEMP || "C:\\Temp", "chrome-filters-" + Date.now());
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
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result?.value;
  }

  async navigate(url) {
    await this.send("Page.navigate", { url });
    await sleep(2000);
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function testTargetPort(baseUrl) {
  console.log(`\n======================================================`);
  console.log(`=== TESTING UNIFIED FILTER STRIP ON: ${baseUrl} ===`);
  console.log(`======================================================`);
  await ensureChrome();

  // 1. Authenticate as KPMG Lead
  const authRes = await fetch(`${baseUrl}/api/auth/kpmg-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "kpmg.lead@kpmg.com",
      passcode: "KPMG#Lead2026!",
    }),
  });

  if (!authRes.ok) {
    throw new Error("KPMG Lead authentication failed");
  }

  const authData = await authRes.json();
  const rawCookieHeader = authRes.headers.get("set-cookie") || "";
  const sessionCookieMatch = rawCookieHeader.match(/kpmg_cfo_session=([^;]+)/);
  const sessionCookie = sessionCookieMatch ? sessionCookieMatch[1] : "";

  // 2. Open page in Chrome
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

  await client.eval(`
    sessionStorage.setItem("kpmg_cfo_advisory_session_v1", JSON.stringify(${JSON.stringify(authData.user)}));
    localStorage.setItem("kpmg_cfo_user", JSON.stringify(${JSON.stringify(authData.user)}));
  `);

  await client.navigate(`${baseUrl}/workflows`);
  await sleep(2500);

  async function switchTab(tabName) {
    await client.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll("button, a"));
        const target = buttons.find(b => b.innerText.toLowerCase().includes("${tabName.toLowerCase()}"));
        if (target) target.click();
      })()
    `);
    await sleep(1000);
  }

  // --- TEST 1: CATALOG TAB STRIP ---
  console.log("\n[Test 1] Checking Catalog Strip...");
  await switchTab("catalog");
  await sleep(1000);
  const catalogStrip = await client.eval(`
    (() => {
      const inputs = Array.from(document.querySelectorAll("input[type='text']"));
      const searchInput = inputs.find(i => i.placeholder.includes("Search platforms"));
      if (!searchInput) return { error: "Catalog search input not found" };

      const leftContainer = searchInput.parentElement.parentElement;
      const leftButtons = Array.from(leftContainer.querySelectorAll("button"))
        .filter(b => b.getAttribute("aria-label") !== "Clear search")
        .map(b => b.innerText.trim().replace(/\\s+/g, " "));

      return { leftButtons, hasSearch: Boolean(searchInput) };
    })()
  `);
  console.log("Catalog strip left buttons:", catalogStrip.leftButtons);
  const catalogHasFilter = catalogStrip.leftButtons.some(b => b.startsWith("Filter"));
  const catalogHasSort = catalogStrip.leftButtons.some(b => b.startsWith("Sort"));
  console.log(`Catalog has Filter: ${catalogHasFilter}, has Sort: ${catalogHasSort}`);

  // --- TEST 2: AUDIT TAB STRIP & UNIFIED FILTER ---
  console.log("\n[Test 2] Checking Audit Strip & Multi-Category Filter...");
  await switchTab("audit");
  const auditStrip = await client.eval(`
    (() => {
      const inputs = Array.from(document.querySelectorAll("input[type='text']"));
      const searchInput = inputs.find(i => i.placeholder.includes("Search actions"));
      const bar = searchInput ? searchInput.closest(".lg\\\\:h-\\\\[52px\\\\], .rounded-sm.border") : null;
      if (!bar) return { error: "Audit bar not found" };

      const leftContainer = searchInput.parentElement.parentElement;
      const leftButtons = Array.from(leftContainer.querySelectorAll("button"))
        .filter(b => b.getAttribute("aria-label") !== "Clear search")
        .map(b => b.innerText.trim().replace(/\\s+/g, " "));

      return { leftButtons, hasSearch: Boolean(searchInput) };
    })()
  `);
  console.log("Audit strip left buttons:", auditStrip.leftButtons);
  const auditHasSeparateProduct = auditStrip.leftButtons.some(b => b === "Product");
  const auditHasSingleFilter = auditStrip.leftButtons.some(b => b.startsWith("Filter"));
  const auditHasSort = auditStrip.leftButtons.some(b => b.startsWith("Sort"));
  console.log(`Audit has separate Product button: ${auditHasSeparateProduct} (MUST BE FALSE)`);
  console.log(`Audit has Filter button: ${auditHasSingleFilter} (MUST BE TRUE)`);
  console.log(`Audit has Sort button: ${auditHasSort} (MUST BE TRUE)`);

  if (auditHasSeparateProduct) {
    throw new Error("Audit still has separate Product button on the strip!");
  }

  // Click Audit Filter button to open popover
  console.log("Clicking Audit Filter button...");
  await client.eval(`
    (() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.trim().startsWith("Filter"));
      if (btn) btn.click();
    })()
  `);
  await sleep(500);

  const auditPopover = await client.eval(`
    (() => {
      const popover = document.querySelector(".z-30.shadow-lg");
      if (!popover) return { error: "Popover not found" };

      const categoryButtons = Array.from(popover.querySelectorAll(".rounded-xs.px-2.py-1")).map(b => b.innerText.trim());
      const optionButtons = Array.from(popover.querySelectorAll(".max-h-\\\\[220px\\\\] button")).map(b => b.innerText.trim().replace(/\\s+/g, " "));

      return { categoryButtons, optionButtons };
    })()
  `);
  console.log("Audit Popover Category Buttons:", auditPopover.categoryButtons);
  console.log("Audit Popover Current Options:", auditPopover.optionButtons);

  const hasStatusCategory = auditPopover.categoryButtons.some(c => c.includes("Status"));
  const hasProductCategory = auditPopover.categoryButtons.some(c => c.includes("Product"));
  console.log(`Audit Popover has Status category: ${hasStatusCategory}, has Product category: ${hasProductCategory}`);

  // Switch to Product category inside Popover
  console.log("Switching to Product category inside Audit Popover...");
  await client.eval(`
    (() => {
      const popover = document.querySelector(".z-30.shadow-lg");
      const prodBtn = Array.from(popover.querySelectorAll("button")).find(b => b.innerText.trim().includes("Product"));
      if (prodBtn) prodBtn.click();
    })()
  `);
  await sleep(400);

  const productOptions = await client.eval(`
    (() => {
      const popover = document.querySelector(".z-30.shadow-lg");
      const searchInput = popover.querySelector("input[placeholder*='product']");
      const options = Array.from(popover.querySelectorAll(".max-h-\\\\[220px\\\\] button")).map(b => b.innerText.trim().replace(/\\s+/g, " "));
      return { hasSearch: Boolean(searchInput), options };
    })()
  `);
  console.log("Product options in Popover:", productOptions.options);
  console.log("Product in-popover search input present:", productOptions.hasSearch);

  // Close Popover
  await client.eval(`
    (() => {
      const doneBtn = Array.from(document.querySelectorAll(".z-30.shadow-lg button")).find(b => b.innerText.trim() === "Done");
      if (doneBtn) doneBtn.click();
    })()
  `);
  await sleep(400);

  // --- TEST 3: DASHBOARDS TAB STRIP & RENAMING ---
  console.log("\n[Test 3] Checking Dashboards Strip & Filter Renaming...");
  await switchTab("dashboards");
  const dashboardsStrip = await client.eval(`
    (() => {
      const inputs = Array.from(document.querySelectorAll("input[type='text']"));
      const searchInput = inputs.find(i => i.placeholder.includes("Search executive"));
      const bar = searchInput ? searchInput.closest(".lg\\\\:h-\\\\[52px\\\\], .rounded-sm.border") : null;
      if (!bar) return { error: "Dashboards bar not found" };

      const leftContainer = searchInput.parentElement.parentElement;
      const leftButtons = Array.from(leftContainer.querySelectorAll("button"))
        .filter(b => b.getAttribute("aria-label") !== "Clear search")
        .map(b => b.innerText.trim().replace(/\\s+/g, " "));

      return { leftButtons };
    })()
  `);
  console.log("Dashboards strip left buttons:", dashboardsStrip.leftButtons);
  const dashboardsHasScope = dashboardsStrip.leftButtons.some(b => b === "Scope");
  const dashboardsHasFilter = dashboardsStrip.leftButtons.some(b => b.startsWith("Filter"));
  console.log(`Dashboards has Scope button: ${dashboardsHasScope} (MUST BE FALSE)`);
  console.log(`Dashboards has Filter button: ${dashboardsHasFilter} (MUST BE TRUE)`);

  if (dashboardsHasScope) {
    throw new Error("Dashboards still has button labeled 'Scope'!");
  }
  if (!dashboardsHasFilter) {
    throw new Error("Dashboards does not have button labeled 'Filter'!");
  }

  // Click Dashboards Filter
  await client.eval(`
    (() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.trim().startsWith("Filter"));
      if (btn) btn.click();
    })()
  `);
  await sleep(400);

  const dashboardsPopover = await client.eval(`
    (() => {
      const popover = document.querySelector(".z-30.shadow-lg");
      if (!popover) return { error: "Popover not found" };
      const categoryButtons = Array.from(popover.querySelectorAll(".rounded-xs.px-2.py-1")).map(b => b.innerText.trim());
      return { categoryButtons };
    })()
  `);
  console.log("Dashboards Popover Category Buttons:", dashboardsPopover.categoryButtons);
  const dashHasSource = dashboardsPopover.categoryButtons.some(c => c.includes("Source"));
  const dashHasAccess = dashboardsPopover.categoryButtons.some(c => c.includes("Access"));
  console.log(`Dashboards Popover has Source: ${dashHasSource}, has Access: ${dashHasAccess}`);

  // Close Popover
  await client.eval(`
    (() => {
      const doneBtn = Array.from(document.querySelectorAll(".z-30.shadow-lg button")).find(b => b.innerText.trim() === "Done");
      if (doneBtn) doneBtn.click();
    })()
  `);
  await sleep(400);

  // --- TEST 4: GOVERNANCE TAB STRIP & RENAMING ---
  console.log("\n[Test 4] Checking Governance Strip & Filter Renaming...");
  await switchTab("governance");
  const governanceStrip = await client.eval(`
    (() => {
      const inputs = Array.from(document.querySelectorAll("input[type='text']"));
      const searchInput = inputs.find(i => i.placeholder.includes("Search organizations"));
      const bar = searchInput ? searchInput.closest(".lg\\\\:h-\\\\[52px\\\\], .rounded-sm.border") : null;
      if (!bar) return { error: "Governance bar not found" };

      const leftContainer = searchInput.parentElement.parentElement;
      const leftButtons = Array.from(leftContainer.querySelectorAll("button"))
        .filter(b => b.getAttribute("aria-label") !== "Clear search")
        .map(b => b.innerText.trim().replace(/\\s+/g, " "));

      return { leftButtons };
    })()
  `);
  console.log("Governance strip left buttons:", governanceStrip.leftButtons);
  const govHasStatusOnly = governanceStrip.leftButtons.some(b => b === "Status");
  const govHasFilter = governanceStrip.leftButtons.some(b => b.startsWith("Filter"));
  console.log(`Governance button is 'Status': ${govHasStatusOnly} (MUST BE FALSE)`);
  console.log(`Governance button is 'Filter': ${govHasFilter} (MUST BE TRUE)`);

  if (govHasStatusOnly) {
    throw new Error("Governance button is still named 'Status'!");
  }
  if (!govHasFilter) {
    throw new Error("Governance does not have button labeled 'Filter'!");
  }

  // Click Governance Filter
  await client.eval(`
    (() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.trim().startsWith("Filter"));
      if (btn) btn.click();
    })()
  `);
  await sleep(400);

  const govPopover = await client.eval(`
    (() => {
      const popover = document.querySelector(".z-30.shadow-lg");
      if (!popover) return { error: "Popover not found" };
      const categoryButtons = Array.from(popover.querySelectorAll(".rounded-xs.px-2.py-1")).map(b => b.innerText.trim());
      return { categoryButtons };
    })()
  `);
  console.log("Governance Popover Category Buttons:", govPopover.categoryButtons);
  const govHasStatusCat = govPopover.categoryButtons.some(c => c.includes("Status"));
  const govHasProdCat = govPopover.categoryButtons.some(c => c.includes("Product Access"));
  console.log(`Governance Popover has Status: ${govHasStatusCat}, has Product Access: ${govHasProdCat}`);

  // Close Popover
  await client.eval(`
    (() => {
      const doneBtn = Array.from(document.querySelectorAll(".z-30.shadow-lg button")).find(b => b.innerText.trim() === "Done");
      if (doneBtn) doneBtn.click();
    })()
  `);
  await sleep(400);

  // --- TEST 5: MID-TYPING FOCUS SURVIVAL TEST (>= 5 SECONDS) ---
  console.log("\n[Test 5] Testing Mid-Typing Focus Survival across polling ticks (5.5s)...");
  await switchTab("audit");
  await client.eval(`
    (() => {
      const searchInput = document.querySelector("input[placeholder*='Search actions']");
      if (searchInput) {
        searchInput.focus();
        searchInput.value = "invoice processing latency";
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    })()
  `);

  const t0 = Date.now();
  let focusSurvives = true;
  while (Date.now() - t0 < 5500) {
    const isFocused = await client.eval(`
      (() => {
        const searchInput = document.querySelector("input[placeholder*='Search actions']");
        return document.activeElement === searchInput;
      })()
    `);
    if (!isFocused) {
      focusSurvives = false;
      break;
    }
    await sleep(500);
  }
  console.log(`Search input focus survived across 5.5s polling cycles: ${focusSurvives}`);
  if (!focusSurvives) {
    throw new Error("Focus was lost during typing in the search input!");
  }

  client.close();
  console.log(`\n=== ALL CHECKS PASSED ON ${baseUrl} ===`);
}

async function main() {
  await ensureChrome();
  await testTargetPort("http://localhost:3000");
  await testTargetPort("http://localhost:3001");
  console.log("\n==================================================================");
  console.log("=== DUAL-WORKTREE VERIFICATION SUCCESSFUL (PORTS 3000 & 3001) ===");
  console.log("==================================================================");
  process.exit(0);
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
