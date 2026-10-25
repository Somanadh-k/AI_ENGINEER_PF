import fs from "node:fs";
import path from "node:path";

// Single source of truth lives at /content/portfolio.json. This script copies
// it into the web app so it can be bundled as an offline fallback.
const root = path.resolve(process.cwd(), "..");
const source = path.join(root, "content", "portfolio.json");
const targetDir = path.join(process.cwd(), "src", "content");
const target = path.join(targetDir, "portfolio.json");

if (!fs.existsSync(source)) {
  // Some hosts deploy only the web/ directory. In that case the committed
  // fallback is the source of truth; keep it rather than failing the build.
  if (fs.existsSync(target)) {
    console.warn(
      `[sync-content] ${source} is not available; keeping the existing bundled fallback.`,
    );
    process.exit(0);
  }
  console.error(`[sync-content] missing ${source} and no bundled fallback at ${target}`);
  process.exit(1);
}

fs.mkdirSync(targetDir, { recursive: true });
const raw = fs.readFileSync(source, "utf8");
JSON.parse(raw); // fail fast on invalid JSON
fs.writeFileSync(target, raw);
console.log(`[sync-content] ${path.relative(process.cwd(), target)} updated`);
