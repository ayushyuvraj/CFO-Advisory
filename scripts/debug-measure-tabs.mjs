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
  const profileDir = path.join(process.env.TEMP || "C:\\Temp", "chrome-debug-" + Date.now());
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
    await sleep(2500);
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function main() {
  const proc = await ensureChrome();

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

  await client.eval(`
    sessionStorage.setItem("kpmg_cfo_advisory_session_v1", JSON.stringify(${JSON.stringify(authData.user)}));
    localStorage.setItem("kpmg_cfo_user", JSON.stringify(${JSON.stringify(authData.user)}));
  `);

  await client.navigate(`${baseUrl}/workflows`);
  await sleep(2500);

  const tabSelectors = [
    { name: "catalog", searchPlaceholder: "Search platforms" },
    { name: "audit", searchPlaceholder: "Search actions" },
    { name: "dashboards", searchPlaceholder: "Search executive" },
    { name: "governance", searchPlaceholder: "Search organizations" },
  ];

  const results = [];

  for (const t of tabSelectors) {
    // Click tab
    await client.eval(`
      (() => {
        const tabs = Array.from(document.querySelectorAll("button, a"));
        const target = tabs.find(b => {
          const txt = b.innerText.toLowerCase();
          if ("${t.name}" === "catalog") return txt.includes("catalog");
          if ("${t.name}" === "audit") return txt.includes("audit");
          if ("${t.name}" === "dashboards") return txt.includes("dashboard");
          if ("${t.name}" === "governance") return txt.includes("governance") || txt.includes("client");
          return false;
        });
        if (target) target.click();
      })()
    `);
    await sleep(1500);

    const measurement = await client.eval(`
      (() => {
        const input = document.querySelector("input[placeholder*='${t.searchPlaceholder}']");
        if (!input) return { error: "input not found for tab ${t.name}" };
        
        let bar = input;
        while (bar && bar !== document.body) {
          if (bar.classList.contains("border") && bar.classList.contains("rounded-sm") && bar.classList.contains("bg-white")) {
            break;
          }
          bar = bar.parentElement;
        }

        if (!bar) bar = input.closest(".border");
        if (!bar) return { error: "bar container not found" };

        const barRect = bar.getBoundingClientRect();
        const inputRect = input.getBoundingClientRect();
        const parentRect = bar.parentElement ? bar.parentElement.getBoundingClientRect() : null;
        
        const childrenInfo = Array.from(bar.children).map(c => {
          const r = c.getBoundingClientRect();
          const innerChildren = Array.from(c.children).map(ic => {
            const ir = ic.getBoundingClientRect();
            return {
              tag: ic.tagName,
              text: ic.innerText ? ic.innerText.trim().slice(0, 30) : "",
              className: ic.className,
              height: Math.round(ir.height * 100) / 100,
              top: Math.round(ir.top * 100) / 100,
            };
          });
          return {
            tag: c.tagName,
            className: c.className,
            height: Math.round(r.height * 100) / 100,
            top: Math.round(r.top * 100) / 100,
            innerChildren,
          };
        });

        const style = window.getComputedStyle(bar);

        return {
          tab: "${t.name}",
          bar: {
            top: Math.round(barRect.top * 100) / 100,
            bottom: Math.round(barRect.bottom * 100) / 100,
            height: Math.round(barRect.height * 100) / 100,
            width: Math.round(barRect.width * 100) / 100,
            paddingTop: style.paddingTop,
            paddingBottom: style.paddingBottom,
            boxSizing: style.boxSizing,
          },
          parent: parentRect ? {
            tag: bar.parentElement.tagName,
            className: bar.parentElement.className,
            top: Math.round(parentRect.top * 100) / 100,
          } : null,
          input: {
            top: Math.round(inputRect.top * 100) / 100,
            height: Math.round(inputRect.height * 100) / 100,
          },
          children: childrenInfo,
        };
      })()
    `);

    results.push(measurement);
  }

  console.log(JSON.stringify(results, null, 2));
  client.close();
  if (proc) {
    try {
      proc.kill();
    } catch {}
  }
}

main().catch(console.error);
