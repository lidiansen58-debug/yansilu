import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function desktopLibSource() {
  return repoFileSource("apps/desktop/src-tauri/src/lib.rs");
}

function repoFileSource(relativePath) {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("desktop API supervisor exposes status and recovery loop", () => {
  const source = desktopLibSource();

  assert.match(source, /const API_STARTUP_TIMEOUT: Duration = Duration::from_secs\(20\);/);
  assert.match(source, /const API_HEALTH_INTERVAL: Duration = Duration::from_secs\(2\);/);
  assert.match(source, /const API_MAX_RESTARTS: u32 = 5;/);
  assert.match(source, /const API_STABLE_HEALTH_CHECKS: u32 = 2;/);
  assert.match(source, /const API_LOG_TAIL_MAX_BYTES: u64 = 64 \* 1024;/);
  assert.match(source, /fn desktop_api_runtime_dir/);
  assert.match(source, /fn get_desktop_service_status/);
  assert.match(source, /fn get_desktop_service_log/);
  assert.match(source, /fn supervise_desktop_api/);
  assert.match(source, /thread::spawn/);
  assert.match(source, /spawn_desktop_api\(&config, &api_child, &shutdown\)/);
  assert.match(source, /desktop_api_log_tail/);
  assert.match(source, /SeekFrom::Start/);
  assert.doesNotMatch(source, /fs::read_to_string\(log_path\)/);
  assert.match(source, /desktop_api_error_with_log_tail/);
  assert.match(source, /truncate_desktop_api_message/);
  assert.match(source, /\.arg\("--trace-uncaught"\)/);
  assert.match(source, /\.env\("API_HOST", "0\.0\.0\.0"\)/);
  const apiSource = repoFileSource("apps/api/src/server.mjs");
  assert.match(apiSource, /requestMayAccessLan\(req, url\.pathname\)/);
  assert.match(apiSource, /LOCAL_API_LAN_FORBIDDEN/);
  assert.match(source, /\.env_remove\("NODE_OPTIONS"\)/);
  assert.match(source, /TcpListener::bind\(\("0\.0\.0\.0", port\)\)\.is_ok\(\)/);
  assert.match(source, /writeln!\(log_file, "\[\{\}\] \{message\}", now_string\(\)\)/);
  assert.match(source, /port 3000 is occupied by an unverified service; trying another port/);
  assert.doesNotMatch(source, /port 3000 is occupied; reusing/);
  assert.match(source, /fn comparable_vault_path/);
  assert.match(source, /json\.get\("app"\)[\s\S]*Some\("yansilu"\)/);
  assert.match(source, /json[\s\S]*\.get\("vaultPath"\)/);
  assert.match(source, /comparable_vault_path\(api_vault_path\)[\s\S]*==[\s\S]*comparable_vault_path\(&vault_path\.to_string_lossy\(\)\)/);
  assert.match(source, /stop_desktop_api\(&api_child\)/);
  assert.match(source, /"recovering"/);
  assert.match(source, /"blocked"/);
  assert.match(source, /"healthy"/);
  assert.match(source, /api\.log/);
  assert.match(source, /desktop_api_runtime_dir/);
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

test("desktop startup selects vacant ports before slow HTTP probes and exposes a bounded readiness handshake", () => {
  const source = desktopLibSource();
  const portSelection = source.slice(source.indexOf("fn resolve_desktop_api_port"), source.indexOf("fn desktop_api_runtime_dir"));
  assert.ok(portSelection.indexOf("api_port_is_available") < portSelection.indexOf("api_health_is_yansilu"));
  const launch = source.slice(source.indexOf("fn spawn_desktop_api"), source.indexOf("#[cfg(test)]"));
  assert.doesNotMatch(launch, /managed: false/);
  assert.match(launch, /\.stdin\(Stdio::piped\(\)\)/);
  assert.match(launch, /\.env\("YANSILU_DESKTOP_PARENT_CHANNEL", "stdin-eof"\)/);
  assert.match(source, /http:\/\/127\.0\.0\.1:\{api_port\}/);
  assert.match(source, /async fn wait_for_desktop_api_ready/);
  assert.match(source, /spawn_blocking[\s\S]*wait_for_desktop_service_status\(status, Duration::from_secs\(30\)\)/);
  assert.match(source, /"startupWaitTimedOut"/);
  assert.match(source, /API startup process-created/);
  assert.match(source, /API startup ready elapsedMs/);
});

test("desktop port availability checks loopback conflicts before the wildcard bind", () => {
  const source = desktopLibSource();
  const availability = source.slice(source.indexOf("fn api_port_is_available"), source.indexOf("fn api_health_json"));
  assert.match(availability, /if TcpListener::bind\(\("127\.0\.0\.1", port\)\)\.is_err\(\) \{\s*return false;/);
  assert.ok(availability.indexOf('"127.0.0.1"') < availability.indexOf('"0.0.0.0"'));
  assert.doesNotMatch(availability, /api_port_is_open|api_health_json/);
  assert.match(source, /fn real_packaged_api_skips_unrelated_loopback_services/);
});

test("desktop health uses decoded HTTP and exit cancels startup and retries", () => {
  const source = desktopLibSource();
  assert.match(source, /reqwest::blocking::Client::builder\(\)/);
  assert.match(source, /\.no_proxy\(\)/);
  assert.match(source, /reqwest::redirect::Policy::none\(\)/);
  assert.match(source, /response\.take\(64 \* 1024 \+ 1\)/);
  assert.doesNotMatch(source, /response\.split\("\\r\\n\\r\\n"\)/);
  assert.match(source, /shutdown\.swap\(true, Ordering::SeqCst\)/);
  assert.match(source, /Managed API shutdown completed elapsedMs/);
  assert.match(source, /drop\(child\.stdin\.take\(\)\)/);
  assert.match(source, /started.elapsed\(\) < Duration::from_secs\(2\)/);
  assert.match(source, /wait_unless_shutdown\(&shutdown, Duration::from_millis\(retry_ms\)\)/);
  assert.match(source, /health_failures >= API_MAX_HEALTH_FAILURES/);
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

test("desktop bundle guards prevent stale API runtime port binding", () => {
  const prepareSource = repoFileSource("scripts/prepare-desktop-api-runtime.mjs");
  const buildScriptSource = repoFileSource("apps/desktop/src-tauri/build.rs");

  assert.match(prepareSource, /assertDesktopApiServerHasHostBinding/);
  assert.match(prepareSource, /const HOST = String\(process\.env\.API_HOST \|\| "127\.0\.0\.1"\);/);
  assert.match(prepareSource, /server\.listen\(PORT, HOST,/);
  assert.match(buildScriptSource, /#\[cfg\(unix\)\]\s+use std::fs;/);
  assert.match(buildScriptSource, /#\[cfg\(unix\)\]\s+use std::os::unix::fs::PermissionsExt;/);
  assert.match(buildScriptSource, /#\[cfg\(unix\)\]\s+fn fix_permissions_recursive/);
});
