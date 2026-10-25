import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = path.join(root, "scripts", "resume.html");
const target = path.join(root, "web", "public", "resume", "Somanadh-K-Resume.pdf");

const candidates = [
  process.env.CHROME_BIN,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].filter(Boolean);

const chrome = candidates.find((candidate) => existsSync(candidate));

if (!chrome) {
  console.error(
    "[resume] Chrome/Chromium not found. Set CHROME_BIN to the browser executable and rerun.",
  );
  process.exit(1);
}

if (!existsSync(source)) {
  console.error(`[resume] Missing source: ${source}`);
  process.exit(1);
}

mkdirSync(path.dirname(target), { recursive: true });

console.log(`[resume] Rendering ${path.relative(root, source)} with ${chrome}`);
execFileSync(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-pdf-header-footer",
    "--run-all-compositor-stages-before-draw",
    "--virtual-time-budget=2000",
    `--print-to-pdf=${target}`,
    pathToFileURL(source).href,
  ],
  { stdio: "inherit" },
);

const { size } = statSync(target);
if (size < 10_000) {
  console.error(`[resume] PDF looks too small (${size} bytes). Check ${target}.`);
  process.exit(1);
}

console.log(`[resume] Wrote ${path.relative(root, target)} (${Math.round(size / 1024)} KB)`);
