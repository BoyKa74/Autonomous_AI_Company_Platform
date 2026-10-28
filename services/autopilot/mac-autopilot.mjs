// Mac Autopilot — chạy nền, không cần mở tab.
// Mở trang công ty bằng trình duyệt headless, bật "Tự động", tự phục hồi khi lỗi.
//
// Chạy:  node services/autopilot/mac-autopilot.mjs
// Dừng:  pkill -f mac-autopilot.mjs

import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";
import {
  readFileSync,
  existsSync,
  openSync,
  writeSync,
  closeSync,
  unlinkSync,
} from "node:fs";
import { globSync } from "node:fs";

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const CHECK_MS = Number(process.env.AUTOPILOT_CHECK_MS || 3 * 60 * 1000);

function loadEnv(path = ".env.local") {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (!match) continue;
    if (!process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

loadEnv();

const LOCK_PATH =
  process.env.AUTOPILOT_LOCK || "/tmp/vic-autopilot.lock";

function acquireLock() {
  try {
    const fd = openSync(LOCK_PATH, "wx");
    writeSync(fd, String(process.pid));
    closeSync(fd);
  } catch {
    try {
      const pid = Number(readFileSync(LOCK_PATH, "utf8").trim());
      if (!pid) throw new Error("lock rỗng");
      process.kill(pid, 0);
      console.error(
        `[autopilot] đã có tiến trình khác đang chạy (PID ${pid}) — thoát.`
      );
      process.exit(0);
    } catch {
      try {
        unlinkSync(LOCK_PATH);
      } catch {}
      return acquireLock();
    }
  }

  const cleanup = () => {
    try {
      unlinkSync(LOCK_PATH);
    } catch {}
  };
  process.on("exit", cleanup);
  process.on("SIGINT", () => {
    cleanup();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    cleanup();
    process.exit(0);
  });
}

acquireLock();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = process.env.AUTOPILOT_EMAIL;
const PASSWORD = process.env.AUTOPILOT_PASSWORD;

if (!SUPABASE_URL || !PUBLISHABLE || !EMAIL || !PASSWORD) {
  console.error(
    "[autopilot] Thiếu env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, AUTOPILOT_EMAIL, AUTOPILOT_PASSWORD"
  );
  process.exit(1);
}

function resolveChromium() {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) {
    return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  }
  const home = process.env.HOME;
  const matches = globSync(
    `${home}/Library/Caches/ms-playwright/chromium-*/chrome-mac*/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`
  );
  return matches[0];
}

async function login() {
  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: { apikey: PUBLISHABLE, "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    }
  );
  const session = await response.json();
  if (!session.access_token) {
    throw new Error(`Login lỗi: ${JSON.stringify(session).slice(0, 200)}`);
  }
  return session;
}

function buildCookies(session) {
  const ref = new URL(SUPABASE_URL).hostname.split(".")[0];
  const payload = JSON.stringify({
    access_token: session.access_token,
    token_type: session.token_type,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    refresh_token: session.refresh_token,
    user: session.user,
  });
  const encoded = "base64-" + Buffer.from(payload).toString("base64url");
  const baseName = `sb-${ref}-auth-token`;
  const CHUNK = 3180;
  const cookies = [];
  if (encoded.length <= CHUNK) {
    cookies.push({ name: baseName, value: encoded });
  } else {
    let index = 0;
    for (let i = 0; i < encoded.length; i += CHUNK) {
      cookies.push({
        name: `${baseName}.${index}`,
        value: encoded.slice(i, i + CHUNK),
      });
      index += 1;
    }
  }
  return cookies.map((cookie) => ({
    ...cookie,
    domain: "localhost",
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
    expires: -1,
  }));
}

async function listCompanyIds() {
  const ids = (process.env.AUTOPILOT_COMPANY_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (ids.length > 0) return ids;

  if (!SERVICE) {
    throw new Error("Thiếu SUPABASE_SERVICE_ROLE_KEY để lấy danh sách công ty.");
  }
  const admin = createClient(SUPABASE_URL, SERVICE, {
    auth: { persistSession: false },
  });
  const { data, error } = await admin
    .from("companies")
    .select("id")
    .eq("status", "active");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.id);
}

async function enableAuto(page) {
  const button = page.getByRole("button", { name: /Tự động:\s*TẮT/i });
  if ((await button.count()) === 0) {
    const on = page.getByRole("button", { name: /Tự động:\s*BẬT/i });
    return (await on.count()) > 0;
  }
  await button.first().click({ timeout: 15000 });
  await page.waitForTimeout(1500);
  return true;
}

async function main() {
  const executablePath = resolveChromium();
  if (!executablePath) throw new Error("Không tìm thấy Chromium Playwright.");

  const companyIds = await listCompanyIds();
  console.log(
    `[autopilot] ${new Date().toISOString()} · công ty: ${companyIds.length} · app: ${APP_URL}`
  );

  let browser = null;
  let activeContext = null;
  let pages = [];

  async function ensureBrowser() {
    if (!browser || !browser.isConnected()) {
      browser = await chromium.launch({
        executablePath,
        headless: true,
        args: [
          "--disable-dev-shm-usage",
          "--use-angle=swiftshader",
          "--enable-unsafe-swiftshader",
          "--remote-debugging-port=9334",
        ],
      });
    }
    return browser;
  }

  async function openAll() {
    const session = await login();
    console.log("[autopilot] đăng nhập OK");
    const cookies = buildCookies(session);
    const activeBrowser = await ensureBrowser();
    if (activeContext) {
      await activeContext.close().catch(() => {});
      activeContext = null;
    }
    const context = await activeBrowser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    activeContext = context;
    await context.addCookies(cookies);

    pages = [];
    for (const id of companyIds) {
      const page = await context.newPage();
      await page.goto(`${APP_URL}/company/${id}?headless=1`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      await page.waitForTimeout(4000);
      console.log(`[autopilot] đã mở ${page.url()} | title=${await page.title()}`);
      const hasButton = await page.getByRole("button", { name: /Tự động/i }).count();
      console.log(`[autopilot] nút Tự động: ${hasButton}`);
      const enabled = await enableAuto(page);
      console.log(
        `[autopilot] company ${id}: ${enabled ? "Tự động BẬT" : "chưa bật được"}`
      );
      pages.push({ id, page });
    }
  }

  await openAll();

  setInterval(async () => {
    try {
      for (const entry of pages) {
        if (entry.page.isClosed()) {
          console.log(`[autopilot] trang ${entry.id} đóng — mở lại`);
          await openAll();
          return;
        }
        const url = entry.page.url();
        if (url.includes("/login")) {
          console.log(`[autopilot] session hết hạn — đăng nhập lại`);
          await openAll();
          return;
        }
        const on = entry.page.getByRole("button", { name: /Tự động:\s*BẬT/i });
        if ((await on.count()) === 0) {
          const enabled = await enableAuto(entry.page);
          if (enabled) {
            console.log(`[autopilot] bật lại Tự động cho ${entry.id}`);
          }
        }
      }
      console.log(`[autopilot] ${new Date().toISOString()} · heartbeat`);
    } catch (error) {
      console.error(
        `[autopilot] lỗi kiểm tra: ${error instanceof Error ? error.message : error}`
      );
      try {
        await openAll();
      } catch (inner) {
        console.error(`[autopilot] mở lại thất bại: ${inner}`);
      }
    }
  }, CHECK_MS);
}

main().catch((error) => {
  console.error("[autopilot] dừng:", error);
  process.exit(1);
});
