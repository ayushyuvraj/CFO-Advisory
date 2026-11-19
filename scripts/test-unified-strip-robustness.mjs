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
  const profileDir = path.join(process.env.TEMP || "C:\\Temp", "chrome-audit-" + Date.now());
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
    this.consoleLogs = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new globalThis.WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.method === "Runtime.consoleAPICalled") {
          this.consoleLogs.push({
            type: msg.params.type,
            text: msg.params.args?.map((a) => a.value || a.description).join(" ") || "",
          });
        }
        if (msg.method === "Runtime.exceptionThrown") {
          this.consoleLogs.push({
            type: "exception",
            text: msg.params.exceptionDetails?.text || JSON.stringify(msg.params),
          });
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
    await sleep(2000);
  }

  async setViewport(width, height) {
    await this.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
    await sleep(400);
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function main() {
  await ensureChrome();

  // 1. Authenticate
  const authRes = await fetch(`${baseUrl}/api/auth/kpmg-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "kpmg.lead@kpmg.com",
      passcode: "KPMG#Lead2026!",
    }),
  });

  const authData = await authRes.json();
  const rawCookieHeader = authRes.headers.get("set-cookie") || "";
  const sessionCookieMatch = rawCookieHeader.match(/kpmg_cfo_session=([^;]+)/);
  const sessionCookie = sessionCookieMatch ? sessionCookieMatch[1] : "";

  // 2. Open page
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
  await sleep(2000);

  const report = {
    test1_long_inputs: {},
    test2_empty_states: {},
    test3_keyboard_nav: {},
    test4_responsive_viewports: {},
    test5_fast_tab_switching: {},
  };

  const tabs = [
    { id: "catalog", name: "Solution Catalog", placeholder: "Search platforms" },
    { id: "audit", name: "Audit & Observability", placeholder: "Search actions" },
    { id: "dashboards", name: "Executive Dashboards", placeholder: "Search executive" },
    { id: "governance", name: "Client Governance", placeholder: "Search client" },
  ];

  async function switchTab(tabId) {
    await client.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll("button, a"));
        const target = buttons.find(b => {
          const txt = b.innerText.toLowerCase();
          if ("${tabId}" === "catalog") return txt.includes("catalog");
          if ("${tabId}" === "audit") return txt.includes("audit");
          if ("${tabId}" === "dashboards") return txt.includes("dashboard");
          if ("${tabId}" === "governance") return txt.includes("governance") || txt.includes("client");
          return false;
        });
        if (target) target.click();
      })()
    `);
    await sleep(600);
  }

  // ==========================================
  // TEST 1: Long search inputs & special characters
  // ==========================================
  console.log("Running Test 1: Long search inputs & special characters...");
  const extremeStrings = [
    "A".repeat(250),
    "!@#$%^&*()_+-=[]{}|;':\",./<>?`~",
    "🚀🔥✨📊🤖🧪 Unicode 测试 テスト تجربة",
    "<script>alert('xss')</script>",
    "' OR '1'='1' --",
    "https://example.kpmg.com/workflows/api/v1?filter=true&query=all#hash-anchor",
  ];

  for (const tab of tabs) {
    await switchTab(tab.id);
    const tabResult = { tests: [] };

    for (const str of extremeStrings) {
      const res = await client.eval(`
        (() => {
          const input = document.querySelector("input[placeholder*='${tab.placeholder}']");
          if (!input) return { error: "input not found" };

          // Find bar container
          let bar = input;
          while (bar && bar !== document.body) {
            if (bar.classList.contains("border") && bar.classList.contains("rounded-sm") && bar.classList.contains("bg-white")) {
              break;
            }
            bar = bar.parentElement;
          }

          // Native input dispatch
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          nativeInputValueSetter.call(input, ${JSON.stringify(str)});
          input.dispatchEvent(new Event('input', { bubbles: true }));

          const barRect = bar.getBoundingClientRect();
          const inputRect = input.getBoundingClientRect();
          const containerOverflow = bar.scrollWidth > bar.clientWidth + 1; // 1px rounding margin
          const inputOverflowsBar = inputRect.right > barRect.right || inputRect.left < barRect.left;

          // Check if clear button is present and visible
          const clearBtn = input.parentElement ? input.parentElement.querySelector("button[aria-label='Clear search']") : null;
          const clearBtnVisible = clearBtn ? clearBtn.getBoundingClientRect().width > 0 : false;

          return {
            stringPreview: ${JSON.stringify(str.slice(0, 30))},
            barWidth: barRect.width,
            barHeight: barRect.height,
            inputWidth: inputRect.width,
            containerOverflow,
            inputOverflowsBar,
            clearBtnVisible,
          };
        })()
      `);
      tabResult.tests.push(res);
      await sleep(150);

      // Clear input
      await client.eval(`
        (() => {
          const input = document.querySelector("input[placeholder*='${tab.placeholder}']");
          if (!input) return;
          const clearBtn = input.parentElement ? input.parentElement.querySelector("button[aria-label='Clear search']") : null;
          if (clearBtn) clearBtn.click();
          else {
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            nativeSetter.call(input, "");
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
        })()
      `);
      await sleep(100);
    }
    report.test1_long_inputs[tab.id] = tabResult;
  }

  // ==========================================
  // TEST 2: Empty states
  // ==========================================
  console.log("Running Test 2: Empty states...");
  for (const tab of tabs) {
    await switchTab(tab.id);
    const emptyResult = await client.eval(`
      (() => {
        const input = document.querySelector("input[placeholder*='${tab.placeholder}']");
        if (!input) return { error: "input not found" };

        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        nativeSetter.call(input, "___NONEXISTENT_QUERY_FOR_EMPTY_STATE_12345___");
        input.dispatchEvent(new Event('input', { bubbles: true }));

        return true;
      })()
    `);
    await sleep(800);

    const emptyStateMetrics = await client.eval(`
      (() => {
        const input = document.querySelector("input[placeholder*='${tab.placeholder}']");
        let bar = input;
        while (bar && bar !== document.body) {
          if (bar.classList.contains("border") && bar.classList.contains("rounded-sm") && bar.classList.contains("bg-white")) {
            break;
          }
          bar = bar.parentElement;
        }

        const barRect = bar ? bar.getBoundingClientRect() : null;
        const pageText = document.body.innerText;
        
        // Find empty state elements
        const hasEmptyIndicator = 
          pageText.includes("No platforms match") ||
          pageText.includes("No live telemetry events recorded") ||
          pageText.includes("No Dashboards Available Yet") ||
          pageText.includes("No companies match");

        // Counter label
        const countBadge = bar ? bar.querySelector("span.font-mono") : null;

        return {
          barStillRendered: Boolean(bar),
          barHeight: barRect?.height,
          hasEmptyIndicator,
          countText: countBadge?.innerText || null,
        };
      })()
    `);
    report.test2_empty_states[tab.id] = emptyStateMetrics;

    // Reset input
    await client.eval(`
      (() => {
        const input = document.querySelector("input[placeholder*='${tab.placeholder}']");
        if (!input) return;
        const clearBtn = input.parentElement ? input.parentElement.querySelector("button[aria-label='Clear search']") : null;
        if (clearBtn) clearBtn.click();
      })()
    `);
    await sleep(400);
  }

  // ==========================================
  // TEST 3: Keyboard Accessibility (Tab, Enter, Space, Escape)
  // ==========================================
  console.log("Running Test 3: Keyboard Accessibility...");
  for (const tab of tabs) {
    await switchTab(tab.id);

    const a11yResult = await client.eval(`
      (() => {
        const input = document.querySelector("input[placeholder*='${tab.placeholder}']");
        if (!input) return { error: "input not found" };

        let bar = input;
        while (bar && bar !== document.body) {
          if (bar.classList.contains("border") && bar.classList.contains("rounded-sm") && bar.classList.contains("bg-white")) {
            break;
          }
          bar = bar.parentElement;
        }

        const filterBtn = bar.querySelector("button[aria-label='Filter records']");
        const sortBtn = bar.querySelector("button[aria-label='Sort records']");

        // Test 3a: Enter/Space opens Filter popover
        let filterOpensOnEnter = false;
        if (filterBtn) {
          filterBtn.click();
          filterOpensOnEnter = bar.querySelectorAll(".absolute.z-30").length > 0;
        }

        // Test 3b: Escape closes popover
        let escapeCloses = false;
        if (filterOpensOnEnter) {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          escapeCloses = bar.querySelectorAll(".absolute.z-30").length === 0;
        }

        // Test 3c: Sort button aria attributes
        const sortAriaExpanded = sortBtn ? sortBtn.getAttribute("aria-expanded") : null;

        // Test 3d: Focusable elements order
        const focusable = Array.from(bar.querySelectorAll("input, button, select, [tabindex='0']")).map(el => ({
          tag: el.tagName,
          ariaLabel: el.getAttribute("aria-label") || el.innerText?.trim() || null,
        }));

        return {
          hasFilterBtn: Boolean(filterBtn),
          hasSortBtn: Boolean(sortBtn),
          filterOpensOnClick: filterOpensOnEnter,
          escapeClosesPopover: escapeCloses,
          sortAriaExpanded,
          focusableElementsCount: focusable.length,
          focusableElements: focusable,
        };
      })()
    `);
    report.test3_keyboard_nav[tab.id] = a11yResult;
  }

  // ==========================================
  // TEST 4: Mobile & Responsive Viewports
  // ==========================================
  console.log("Running Test 4: Mobile & Responsive Viewports...");
  const viewports = [
    { label: "desktop_1440", w: 1440, h: 900 },
    { label: "tablet_1024", w: 1024, h: 768 },
    { label: "small_tablet_768", w: 768, h: 1024 },
    { label: "mobile_large_480", w: 480, h: 844 },
    { label: "mobile_standard_375", w: 375, h: 667 },
    { label: "mobile_compact_320", w: 320, h: 568 },
  ];

  for (const tab of tabs) {
    await switchTab(tab.id);
    const vpResults = [];

    for (const vp of viewports) {
      await client.setViewport(vp.w, vp.h);
      await sleep(350);

      const metrics = await client.eval(`
        (() => {
          const input = document.querySelector("input[placeholder*='${tab.placeholder}']");
          if (!input) return { error: "input not found" };

          let bar = input;
          while (bar && bar !== document.body) {
            if (bar.classList.contains("border") && bar.classList.contains("rounded-sm") && bar.classList.contains("bg-white")) {
              break;
            }
            bar = bar.parentElement;
          }

          const barRect = bar.getBoundingClientRect();
          const bodyOverflow = document.body.scrollWidth > window.innerWidth;
          const barOverflow = bar.scrollWidth > bar.clientWidth + 1;

          // Check if children inside bar overflow
          const children = Array.from(bar.querySelectorAll("*"));
          let maxChildRight = 0;
          for (const c of children) {
            const r = c.getBoundingClientRect();
            if (r.right > maxChildRight) maxChildRight = r.right;
          }
          const childrenClipped = maxChildRight > barRect.right + 2;

          return {
            viewport: "${vp.label}",
            width: ${vp.w},
            barHeight: barRect.height,
            barWidth: barRect.width,
            barOverflow,
            bodyOverflow,
            childrenClipped,
            maxChildRight,
            barRight: barRect.right,
          };
        })()
      `);
      vpResults.push(metrics);
    }
    report.test4_responsive_viewports[tab.id] = vpResults;
  }

  // Restore desktop viewport
  await client.setViewport(1440, 900);

  // ==========================================
  // TEST 5: Fast Tab Switching & Memory / Unmount Warnings
  // ==========================================
  console.log("Running Test 5: Fast Tab Switching...");
  client.consoleLogs = []; // Reset logs

  const switchDelays = [50, 100, 250];
  const tabSequence = ["catalog", "audit", "dashboards", "governance", "catalog", "dashboards", "audit", "governance"];

  for (const delay of switchDelays) {
    for (const tabId of tabSequence) {
      await client.eval(`
        (() => {
          const buttons = Array.from(document.querySelectorAll("button, a"));
          const target = buttons.find(b => {
            const txt = b.innerText.toLowerCase();
            if ("${tabId}" === "catalog") return txt.includes("catalog");
            if ("${tabId}" === "audit") return txt.includes("audit");
            if ("${tabId}" === "dashboards") return txt.includes("dashboard");
            if ("${tabId}" === "governance") return txt.includes("governance") || txt.includes("client");
            return false;
          });
          if (target) target.click();
        })()
      `);
      await sleep(delay);
    }
  }

  // Wait 1.5s after hammering tabs to collect any late async errors or warnings
  await sleep(1500);

  const errorsAndWarnings = client.consoleLogs.filter(
    (log) =>
      log.type === "error" ||
      log.type === "warning" ||
      log.type === "exception" ||
      log.text.includes("unmounted") ||
      log.text.includes("memory leak") ||
      log.text.includes("state update")
  );

  report.test5_fast_tab_switching = {
    totalLogsCollected: client.consoleLogs.length,
    criticalErrorsOrWarningsCount: errorsAndWarnings.length,
    errorsAndWarnings,
  };

  client.close();
  console.log("=== AUDIT RUN COMPLETED ===");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
