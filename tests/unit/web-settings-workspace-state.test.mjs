import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(
  path.resolve(__dirname, "../../apps/web/src/prototype-app.js"),
  "utf8"
);

test("workspace settings badge distinguishes missing vault paths from pending sync", () => {
  assert.match(
    source,
    /const workspaceBadge = missingPath\s*\?\s*"路径失效"\s*:\s*vault\s*\?\s*\(vault\.initialized \? "已初始化" : "待初始化"\)\s*:\s*"待同步";/
  );
  assert.match(
    source,
    /const workspaceMeta = missingPath\s*\?\s*"当前路径失效，请重新选择"\s*:\s*\(vault\?\.vaultPath \? settingsLeafLabel\(vault\.vaultPath\) : "选择或切换笔记库"\);/
  );
});
