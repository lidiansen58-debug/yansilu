import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const root = new URL("../../", import.meta.url);
const read = file => fs.readFileSync(new URL(file, root), "utf8");
const version = JSON.parse(read("package.json")).version;

test("desktop, browser and lockfile versions match the release version", () => {
  const lock = JSON.parse(read("package-lock.json"));
  assert.equal(lock.version, version);
  assert.equal(lock.packages[""].version, version);
  assert.equal(JSON.parse(read("apps/desktop/src-tauri/tauri.conf.json")).version, version);
  const cargoPackage = read("apps/desktop/src-tauri/Cargo.toml").split(/\r?\n\[/)[0];
  assert.equal(cargoPackage.match(/^version\s*=\s*"([^"]+)"/m)?.[1], version);
  const desktopPackage = read("apps/desktop/src-tauri/Cargo.lock").split("[[package]]")
    .find(block => /^name = "yansilu-desktop"$/m.test(block));
  assert.equal(desktopPackage?.match(/^version = "([^"]+)"/m)?.[1], version);
  assert.equal(read("apps/web/src/prototype-app.js").match(/const APP_VERSION = "([^"]+)";/)?.[1], version);
});

test("release tag validation accepts the candidate and rejects a different version", () => {
  const run = tag => spawnSync(process.execPath, ["scripts/release-validate-tag.mjs", tag], {
    cwd: root, encoding: "utf8"
  });
  const candidate = run(`v${version}`);
  assert.equal(candidate.status, 0, candidate.stderr);
  assert.equal(run("v0.0.0").status, 1);
});
