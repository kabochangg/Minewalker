import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import process from "node:process";

const ROOTS = ["src", "tests", "scripts"];
const TEXT_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
]);
const BROKEN_PATTERNS = [
  /\uFFFD/u,
  /(?:繝|縺|譁|蜊|謗|髫|鬆|逶|螟|荳|莠|驥|陦|蝗|螟|霑|蛯){2,}/u,
];

const decoder = new TextDecoder("utf-8", { fatal: true });
const failures = [];

for (const root of ROOTS) {
  for (const path of await walk(root)) {
    if (!TEXT_EXTENSIONS.has(extname(path))) continue;
    const bytes = await readFile(path);
    let text;
    try {
      text = decoder.decode(bytes);
    } catch {
      failures.push(`${relative(".", path)}: UTF-8として読み込めません`);
      continue;
    }
    if (text.includes(String.fromCharCode(0))) {
      failures.push(`${relative(".", path)}: NUL文字を検出しました`);
    }
    for (const pattern of BROKEN_PATTERNS) {
      if (pattern.test(text)) {
        failures.push(
          `${relative(".", path)}: 文字化けまたは不正文字を検出しました (${pattern.source})`,
        );
      }
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("UTF-8文字コード検査: PASS");
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      paths.push(...(await walk(path)));
    } else {
      paths.push(path);
    }
  }
  return paths;
}
