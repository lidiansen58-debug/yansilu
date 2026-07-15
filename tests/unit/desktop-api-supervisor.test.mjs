import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function desktopLibSource() {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  return fs.readFileSync(path.join(repoRoot, "apps/desktop/src-tauri/src/lib.rs"), "utf8");
}

test("desktop API supervisor exposes status and recovery loop", () => {
  const source = desktopLibSource();

  assert.match(source, /const API_STARTUP_TIMEOUT: Duration = Duration::from_secs\(45\);/);
  assert.match(source, /const API_HEALTH_INTERVAL: Duration = Duration::from_secs\(2\);/);
  assert.match(source, /const API_MAX_RESTARTS: u32 = 5;/);
  assert.match(source, /const API_STABLE_HEALTH_CHECKS: u32 = 2;/);
  assert.match(source, /fn candidate_desktop_api_runtime_roots/);
  assert.match(source, /fn desktop_api_runtime_candidates/);
  assert.match(source, /fn get_desktop_service_status/);
  assert.match(source, /fn get_desktop_service_log/);
  assert.match(source, /fn supervise_desktop_api/);
  assert.match(source, /thread::spawn/);
  assert.match(source, /spawn_desktop_api\(&config\)/);
  assert.match(source, /spawn_desktop_api_with_runtime/);
  assert.match(source, /api_health_matches_vault/);
  assert.match(source, /stop_desktop_api\(&api_child\)/);
  assert.match(source, /"recovering"/);
  assert.match(source, /"blocked"/);
  assert.match(source, /"healthy"/);
  assert.match(source, /api\.log/);
  assert.match(source, /macOS Contents\/Resources/);
  assert.match(source, /system node fallback/);
  assert.match(source, /Runtime candidate failed/);
  assert.match(source, /"vaultPath": config\.vault_path\.to_string_lossy\(\)/);
  assert.ok(
    (source.match(/"vaultPath": config\.vault_path\.to_string_lossy\(\)/g) || []).length >= 6,
    "expected every desktop API status transition to preserve vaultPath"
  );
});

test("desktop API supervisor blocks only on consecutive failures", () => {
  const source = desktopLibSource();
  const supervisorStart = source.indexOf("fn supervise_desktop_api");
  assert.ok(supervisorStart >= 0, "expected supervisor source");
  const supervisorSource = source.slice(supervisorStart, source.indexOf("pub fn run()", supervisorStart));

  assert.match(supervisorSource, /let mut restart_count: u32 = 0;/);
  assert.match(supervisorSource, /let mut consecutive_failures: u32 = 0;/);
  assert.match(supervisorSource, /let mut stable_health_checks: u32 = 0;/);
  assert.match(supervisorSource, /if consecutive_failures >= API_MAX_RESTARTS/);
  assert.match(supervisorSource, /stable_health_checks >= API_STABLE_HEALTH_CHECKS/);
  assert.match(supervisorSource, /consecutive_failures = 0;/);
  assert.match(supervisorSource, /restart_count \+= 1;/);
  assert.match(supervisorSource, /consecutive_failures \+= 1;/);
  assert.match(supervisorSource, /stable_health_checks \+= 1;/);
  assert.match(supervisorSource, /"consecutiveFailures"/);
  assert.doesNotMatch(supervisorSource, /Ok\(launch\) => \{\s*consecutive_failures = 0;/);
  assert.doesNotMatch(supervisorSource, /if restart_count >= API_MAX_RESTARTS/);
});

test("desktop service status keeps Ollama external by default", () => {
  const source = desktopLibSource();
  const statusStart = source.indexOf("fn default_service_status()");
  assert.ok(statusStart >= 0, "expected default_service_status");
  const statusSource = source.slice(statusStart, source.indexOf("fn update_service_status", statusStart));

  assert.match(statusSource, /"ollama"/);
  assert.match(statusSource, /"external_unknown"/);
  assert.match(statusSource, /"managed": false/);
  assert.doesNotMatch(source, /pkill/);
  assert.doesNotMatch(source, /taskkill/);
});
