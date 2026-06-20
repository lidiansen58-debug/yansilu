import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

test("settings rail shows a restrained update indicator when an update is available", async () => {
  const appSource = await fs.readFile(path.join(repoRoot, "apps", "web", "src", "prototype-app.js"), "utf8");
  const htmlSource = await fs.readFile(path.join(repoRoot, "apps", "web", "src", "prototype.html"), "utf8");

  assert.match(appSource, /settingsState\.update\?\.status === UPDATE_STATUS\.UPDATE_AVAILABLE/);
  assert.match(appSource, /button\.classList\.toggle\("has-update", updateAvailable\)/);
  assert.match(appSource, /\u8bbe\u7f6e \u00b7 \u6709\u65b0\u7248\u672c/);
  assert.match(htmlSource, /\.rail-btn\.has-update::before/);
});
