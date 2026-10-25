import { existsSync } from "node:fs";
import { chromium } from "playwright-core";

const base = (process.env.QA_BASE_URL ?? "http://localhost:3100").replace(/\/$/, "");
const chromeCandidates = [
  process.env.CHROME_BIN,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

const executablePath = chromeCandidates.find((candidate) => existsSync(candidate));

if (!executablePath) {
  console.error("[qa] Chrome/Chromium not found. Set CHROME_BIN and rerun.");
  process.exit(1);
}

const routes = [
  { path: "/", expect: "SOMANADH" },
  { path: "/privacy", expect: "Evidence, not" },
  { path: "/projects/somanadh-os", expect: "SOMANADH.OS" },
  { path: "/projects/studentos", expect: "Record sealed" },
  { path: "/admin", expect: "SOMANADH.OS" },
];

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
];

const browser = await chromium.launch({ headless: true, executablePath });
let failures = 0;

for (const viewport of viewports) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = [];

  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));

  for (const route of routes) {
    errors.length = 0;
    const response = await page.goto(`${base}${route.path}`, {
      waitUntil: "networkidle",
      timeout: 30_000,
    });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(350);

    const status = response?.status() ?? 0;
    const body = await page.locator("body").innerText();
    const widths = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));

    const problems = [];
    if (status !== 200) problems.push(`HTTP ${status}`);
    if (!body.toLowerCase().includes(route.expect.toLowerCase())) {
      problems.push(`missing text: ${route.expect}`);
    }
    if (widths.scroll > widths.viewport + 1) {
      problems.push(`horizontal overflow ${widths.scroll}px > ${widths.viewport}px`);
    }
    // The studio probes /api/admin/me on load; a 401 is the expected
    // unauthenticated state, not a page failure.
    const unexpectedErrors =
      route.path === "/admin"
        ? errors.filter((error) => !error.includes("401"))
        : errors;
    problems.push(...unexpectedErrors);

    if (problems.length) {
      failures += 1;
      console.error(`[qa] FAIL ${viewport.name} ${route.path}`);
      for (const problem of problems) console.error(`      ${problem}`);
    } else {
      console.log(`[qa] ok   ${viewport.name} ${route.path}`);
    }
  }

  await context.close();
}

await browser.close();

if (failures) {
  console.error(`[qa] ${failures} route/viewport checks failed.`);
  process.exit(1);
}

console.log("[qa] all route/viewport checks passed.");
