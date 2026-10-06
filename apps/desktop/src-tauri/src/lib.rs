#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::{self, OpenOptions};
use std::io::{Read, Seek, SeekFrom, Write};
use std::net::{SocketAddr, TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex, OnceLock};
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use tauri::Manager;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

const DEFAULT_API_PORT: u16 = 3000;
const API_PORT_SEARCH_END: u16 = 3020;
const API_STARTUP_TIMEOUT: Duration = Duration::from_secs(20);
const API_HEALTH_INTERVAL: Duration = Duration::from_secs(2);
const API_MAX_RESTARTS: u32 = 5;
const API_STABLE_HEALTH_CHECKS: u32 = 2;
const API_MAX_HEALTH_FAILURES: u32 = 3;
const API_LOG_TAIL_MAX_BYTES: u64 = 64 * 1024;

struct DesktopApiState {
    service_status: Arc<Mutex<serde_json::Value>>,
}

#[tauri::command]
fn get_desktop_api_base(state: tauri::State<DesktopApiState>) -> String {
    state
        .service_status
        .lock()
        .ok()
        .and_then(|value| value.pointer("/services/api/baseUrl").and_then(|item| item.as_str()).map(String::from))
        .unwrap_or_default()
}

#[tauri::command]
fn get_desktop_api_status(state: tauri::State<DesktopApiState>) -> serde_json::Value {
    let status = desktop_service_status_snapshot(&state);
    let api = status.get("services").and_then(|value| value.get("api"));
    serde_json::json!({
        "baseUrl": api.and_then(|value| value.get("baseUrl")).and_then(|value| value.as_str()).unwrap_or(""),
        "running": api.and_then(|value| value.get("status")).and_then(|value| value.as_str()) == Some("healthy"),
        "launchError": api.and_then(|value| value.get("lastError")).and_then(|value| value.as_str()).unwrap_or(""),
        "serviceStatus": status
    })
}

#[tauri::command]
fn get_desktop_service_status(state: tauri::State<DesktopApiState>) -> serde_json::Value {
    desktop_service_status_snapshot(&state)
}

fn wait_for_desktop_service_status(
    service_status: Arc<Mutex<serde_json::Value>>,
    timeout: Duration,
) -> serde_json::Value {
    let started = Instant::now();
    loop {
        let mut snapshot = service_status.lock().map(|value| value.clone())
            .unwrap_or_else(|_| default_service_status());
        match snapshot.pointer("/services/api/status").and_then(|value| value.as_str()) {
            Some("healthy") | Some("blocked") => return snapshot,
            _ => {}
        }
        if started.elapsed() >= timeout {
            snapshot["startupWaitTimedOut"] = serde_json::json!(true);
            return snapshot;
        }
        thread::sleep(Duration::from_millis(100));
    }
}

#[tauri::command]
async fn wait_for_desktop_api_ready(state: tauri::State<'_, DesktopApiState>) -> Result<serde_json::Value, String> {
    let status = Arc::clone(&state.service_status);
    tauri::async_runtime::spawn_blocking(move || {
        wait_for_desktop_service_status(status, Duration::from_secs(30))
    }).await.map_err(|error| format!("Cannot wait for desktop API: {error}"))
}

#[tauri::command]
fn get_desktop_service_log(state: tauri::State<DesktopApiState>) -> serde_json::Value {
    let status = desktop_service_status_snapshot(&state);
    let log_path = status
        .pointer("/services/api/logPath")
        .and_then(|value| value.as_str())
        .unwrap_or("");
    let lines = desktop_api_log_tail_lines(Path::new(log_path), 80);
    serde_json::json!({
        "path": log_path,
        "lines": lines
    })
}

fn desktop_service_status_snapshot(state: &tauri::State<DesktopApiState>) -> serde_json::Value {
    state
        .service_status
        .lock()
        .map(|value| value.clone())
        .unwrap_or_else(|_| default_service_status())
}

#[tauri::command]
fn open_in_explorer(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err(format!("Path does not exist: {path}"));
    }

    let mut cmd = platform_file_reveal_command(p, &path);

    cmd.spawn()
        .map(|_| ())
        .map_err(|e| format!("Failed to reveal path: {e}"))
}

#[cfg(windows)]
fn platform_file_reveal_command(p: &Path, path: &str) -> Command {
    let mut cmd = Command::new("explorer.exe");
    if p.is_dir() {
        cmd.arg(path);
    } else {
        // explorer.exe expects /select,"C:\path\file.ext"
        cmd.arg(format!("/select,\"{path}\""));
    }
    cmd
}

#[cfg(target_os = "macos")]
fn platform_file_reveal_command(p: &Path, path: &str) -> Command {
    let mut cmd = Command::new("open");
    if p.is_dir() {
        cmd.arg(path);
    } else {
        cmd.arg("-R").arg(path);
    }
    cmd
}

#[cfg(all(unix, not(target_os = "macos")))]
fn platform_file_reveal_command(p: &Path, path: &str) -> Command {
    let mut cmd = Command::new("xdg-open");
    if p.is_dir() {
        cmd.arg(path);
    } else if let Some(parent) = p.parent() {
        cmd.arg(parent);
    } else {
        cmd.arg(path);
    }
    cmd
}

fn api_port_is_open(port: u16) -> bool {
    let address: SocketAddr = match format!("127.0.0.1:{port}").parse() {
        Ok(value) => value,
        Err(_) => return false,
    };
    TcpStream::connect_timeout(&address, Duration::from_millis(180)).is_ok()
}

fn api_port_is_available(port: u16) -> bool {
    // Match API_HOST: a loopback bind can succeed beside a wildcard listener on Windows.
    TcpListener::bind(("0.0.0.0", port)).is_ok()
}

fn api_health_json(port: u16) -> Option<serde_json::Value> {
    // Decode HTTP framing with the existing HTTP library, not raw socket text.
    static CLIENT: OnceLock<Option<reqwest::blocking::Client>> = OnceLock::new();
    let client = CLIENT.get_or_init(|| {
        // The updater enables rustls without a default provider in the shared crate.
        if rustls::crypto::CryptoProvider::get_default().is_none() {
            let _ = rustls::crypto::ring::default_provider().install_default();
        }
        reqwest::blocking::Client::builder()
            .no_proxy()
            .redirect(reqwest::redirect::Policy::none())
            .connect_timeout(Duration::from_millis(250))
            .timeout(Duration::from_secs(1))
            .build()
            .ok()
    }).as_ref()?;
    let response = client.get(format!("http://127.0.0.1:{port}/health")).send().ok()?;
    if response.status() != reqwest::StatusCode::OK {
        return None;
    }
    let mut body = Vec::new();
    response.take(64 * 1024 + 1).read_to_end(&mut body).ok()?;
    if body.len() > 64 * 1024 {
        return None;
    }
    serde_json::from_slice(&body).ok()
}

fn api_health_is_yansilu(port: u16) -> bool {
    let Some(json) = api_health_json(port) else {
        return false;
    };
    json.get("ok").and_then(|value| value.as_bool()) == Some(true)
        && json.get("service").and_then(|value| value.as_str()) == Some("api")
}

fn comparable_vault_path(path: &str) -> String {
    let normalized = path.trim().replace('\\', "/");
    let trimmed = normalized.trim_end_matches('/').to_string();
    #[cfg(windows)]
    {
        trimmed.to_lowercase()
    }
    #[cfg(not(windows))]
    {
        trimmed
    }
}

fn api_health_matches_vault(port: u16, vault_path: &PathBuf) -> bool {
    let Some(json) = api_health_json(port) else {
        return false;
    };
    api_json_is_ready(&json, vault_path)
}

fn api_json_is_ready(json: &serde_json::Value, vault_path: &PathBuf) -> bool {
    api_json_matches_vault(json, vault_path)
        && json.get("ok").and_then(|value| value.as_bool()) == Some(true)
        && json.get("ready").and_then(|value| value.as_bool()) == Some(true)
}

fn api_json_matches_vault(json: &serde_json::Value, vault_path: &PathBuf) -> bool {
    if json.get("app").and_then(|value| value.as_str()) != Some("yansilu")
        || json.get("service").and_then(|value| value.as_str()) != Some("api")
    {
        return false;
    }
    let api_vault_path = json
        .get("vaultPath")
        .and_then(|value| value.as_str())
        .unwrap_or("");
    comparable_vault_path(api_vault_path)
        == comparable_vault_path(&vault_path.to_string_lossy())
}

fn wait_for_api_port(
    port: u16,
    vault_path: &PathBuf,
    api_child: &Arc<Mutex<Option<Child>>>,
    shutdown: &AtomicBool,
    timeout: Duration,
) -> Result<(), String> {
    let started = Instant::now();
    while started.elapsed() < timeout {
        if shutdown.load(Ordering::SeqCst) {
            return Err("Desktop API startup cancelled during application exit.".to_string());
        }
        let ready = api_port_is_open(port) && api_health_json(port).map(|json| {
            api_json_is_ready(&json, vault_path)
        }).unwrap_or(false);
        if ready {
            return Ok(());
        }
        let child_status = api_child.lock()
            .map_err(|_| "API supervisor could not lock process state.".to_string())?
            .as_mut()
            .ok_or_else(|| "Desktop API process stopped during startup.".to_string())?
            .try_wait();
        match child_status {
            Ok(Some(status)) => {
                return Err(format!(
                    "Yansilu desktop API exited before it became ready on port {port}: {status}."
                ));
            }
            Ok(None) => {}
            Err(error) => {
                return Err(format!("Yansilu desktop API process check failed: {error}"));
            }
        }
        std::thread::sleep(Duration::from_millis(120));
    }
    Err(format!(
        "Yansilu desktop API did not become ready on port {port} within {} seconds.",
        timeout.as_secs()
    ))
}

fn resolve_desktop_api_port(app_data_dir: &PathBuf, vault_path: &PathBuf) -> Option<u16> {
    for port in DEFAULT_API_PORT..=API_PORT_SEARCH_END {
        // Bind first: HTTP probes of a vacant Windows port can each wait for a timeout.
        if api_port_is_available(port) {
            return Some(port);
        }
        if api_health_matches_vault(port, vault_path) {
            return Some(port);
        }
        if api_health_is_yansilu(port) {
            append_desktop_api_log(
                app_data_dir,
                &format!("Yansilu desktop API port {port} belongs to another vault; trying another port."),
            );
            continue;
        }
        if port == DEFAULT_API_PORT && api_port_is_open(port) {
            append_desktop_api_log(
                app_data_dir,
                "Yansilu desktop API port 3000 is occupied by an unverified service; trying another port.",
            );
            continue;
        }
    }
    append_desktop_api_log(
        app_data_dir,
        "Yansilu desktop API could not find an available port between 3000 and 3020.",
    );
    None
}

fn desktop_api_runtime_dir(app: &tauri::App) -> Option<PathBuf> {
    app.path()
        .resource_dir()
        .ok()
        .map(|path| path.join("desktop-api-runtime"))
        .filter(|path| path.exists())
}

fn append_desktop_api_log(app_data_dir: &PathBuf, message: &str) {
    let _ = fs::create_dir_all(app_data_dir);
    let log_path = app_data_dir.join("api.log");
    if let Ok(mut log_file) = OpenOptions::new().create(true).append(true).open(log_path) {
        let _ = writeln!(log_file, "[{}] {message}", now_string());
    }
}

fn desktop_api_log_tail_lines(log_path: &Path, max_lines: usize) -> Vec<String> {
    let Ok(mut file) = fs::File::open(log_path) else {
        return Vec::new();
    };
    let Ok(metadata) = file.metadata() else {
        return Vec::new();
    };
    let file_len = metadata.len();
    let start = file_len.saturating_sub(API_LOG_TAIL_MAX_BYTES);
    if file.seek(SeekFrom::Start(start)).is_err() {
        return Vec::new();
    }
    let mut bytes = Vec::new();
    if file.read_to_end(&mut bytes).is_err() {
        return Vec::new();
    }
    let content = String::from_utf8_lossy(&bytes);
    let lines: Vec<String> = content
        .lines()
        .rev()
        .filter(|line| !line.trim().is_empty())
        .take(max_lines)
        .map(String::from)
        .collect();
    lines.into_iter().rev().collect()
}

fn desktop_api_log_tail(app_data_dir: &PathBuf, max_lines: usize) -> String {
    let log_path = app_data_dir.join("api.log");
    desktop_api_log_tail_lines(&log_path, max_lines).join(" / ")
}

fn truncate_desktop_api_message(message: String, max_chars: usize) -> String {
    let mut result: String = message.chars().take(max_chars).collect();
    if result.chars().count() < message.chars().count() {
        result.push_str("...");
    }
    result
}

fn desktop_api_error_with_log_tail(app_data_dir: &PathBuf, message: String) -> String {
    let tail = truncate_desktop_api_message(desktop_api_log_tail(app_data_dir, 8), 1600);
    if tail.is_empty() {
        message
    } else {
        format!("{message} Recent API log: {tail}")
    }
}

fn now_string() -> String {
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_secs())
        .unwrap_or_default();
    seconds.to_string()
}

fn default_service_status() -> serde_json::Value {
    serde_json::json!({
        "overall": "recovering",
        "updatedAt": now_string(),
        "services": {
            "api": {
                "status": "starting",
                "baseUrl": "",
                "pid": null,
                "managed": false,
                "vaultPath": "",
                "restartCount": 0,
                "consecutiveFailures": 0,
                "lastError": "",
                "lastStartedAt": "",
                "lastRecoveredAt": "",
                "nextRetryMs": 0,
                "logPath": ""
            },
            "ollama": {
                "status": "external_unknown",
                "managed": false,
                "requiresUserAction": false,
                "message": "Ollama is checked by the local API when AI settings need it."
            }
        }
    })
}

fn update_service_status(
    service_status: &Arc<Mutex<serde_json::Value>>,
    api_patch: serde_json::Value,
    overall: &str,
) {
    if let Ok(mut status) = service_status.lock() {
        if !status.is_object() {
            *status = default_service_status();
        }
        status["overall"] = serde_json::json!(overall);
        status["updatedAt"] = serde_json::json!(now_string());
        let api = &mut status["services"]["api"];
        if let Some(entries) = api_patch.as_object() {
            for (key, value) in entries {
                api[key] = value.clone();
            }
        }
    }
}

#[cfg(unix)]
fn ensure_executable(path: &Path) -> Result<(), String> {
    use std::os::unix::fs::PermissionsExt;

    let metadata = fs::metadata(path)
        .map_err(|error| format!("Cannot inspect executable {}: {error}", path.display()))?;
    let mut permissions = metadata.permissions();
    permissions.set_mode(permissions.mode() | 0o755);
    fs::set_permissions(path, permissions)
        .map_err(|error| format!("Cannot mark executable {}: {error}", path.display()))
}

#[cfg(not(unix))]
fn ensure_executable(_path: &Path) -> Result<(), String> {
    Ok(())
}

#[derive(Clone)]
struct DesktopApiConfig {
    app_data_dir: PathBuf,
    vault_path: PathBuf,
    runtime_dir: Option<PathBuf>,
}

struct DesktopApiLaunch {
    base_url: String,
    pid: Option<u32>,
    managed: bool,
}

fn desktop_api_config(app: &tauri::App) -> Result<DesktopApiConfig, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Cannot resolve app data directory: {error}"))?;
    let vault_path = app_data_dir.join("vault");
    let _ = fs::create_dir_all(&vault_path);
    let _ = fs::create_dir_all(&app_data_dir);
    Ok(DesktopApiConfig {
        app_data_dir,
        vault_path,
        runtime_dir: desktop_api_runtime_dir(app),
    })
}

fn spawn_desktop_api(
    config: &DesktopApiConfig,
    api_child: &Arc<Mutex<Option<Child>>>,
    shutdown: &AtomicBool,
) -> Result<DesktopApiLaunch, String> {
    if shutdown.load(Ordering::SeqCst) {
        return Err("Desktop API startup cancelled during application exit.".to_string());
    }
    let started = Instant::now();
    let api_port = resolve_desktop_api_port(&config.app_data_dir, &config.vault_path)
        .ok_or_else(|| "No available API port between 3000 and 3020.".to_string())?;
    append_desktop_api_log(&config.app_data_dir, &format!("API startup port-selected port={api_port} elapsedMs={}", started.elapsed().as_millis()));
    let base_url = format!("http://127.0.0.1:{api_port}");
    if api_port_is_open(api_port) && api_health_matches_vault(api_port, &config.vault_path) {
        return Ok(DesktopApiLaunch {
            base_url,
            pid: api_health_json(api_port).and_then(|json| json.get("pid").and_then(|value| value.as_u64()).map(|value| value as u32)),
            managed: false,
        });
    }

    let runtime_dir = match config.runtime_dir.clone() {
        Some(value) => value,
        None => {
            let message = "Yansilu desktop API runtime directory was not found.";
            append_desktop_api_log(&config.app_data_dir, message);
            return Err(message.to_string());
        }
    };
    let node_path = if cfg!(windows) {
        runtime_dir.join("node").join("node.exe")
    } else {
        runtime_dir.join("node").join("node")
    };
    let server_path = runtime_dir
        .join("apps")
        .join("api")
        .join("src")
        .join("server.mjs");
    if !node_path.exists() || !server_path.exists() {
        let message = format!(
            "Yansilu desktop API runtime is incomplete. node={}, server={}",
            node_path.display(),
            server_path.display()
        );
        append_desktop_api_log(&config.app_data_dir, &message);
        return Err(message);
    }
    if let Err(message) = ensure_executable(&node_path) {
        append_desktop_api_log(&config.app_data_dir, &message);
        return Err(message);
    }

    let log_path = config.app_data_dir.join("api.log");

    let mut command = Command::new(node_path);
    command
        .arg("--trace-uncaught")
        .arg("apps/api/src/server.mjs")
        .current_dir(runtime_dir)
        .env("API_HOST", "0.0.0.0")
        .env("API_PORT", api_port.to_string())
        .env("WEB_PORT", "5173")
        .env("VAULT_PATH", &config.vault_path)
        .env("YANSILU_DESKTOP_API", "1")
        .env_remove("NODE_OPTIONS");

    if let Ok(log_file) = OpenOptions::new().create(true).append(true).open(log_path) {
        if let Ok(stdout_file) = log_file.try_clone() {
            command.stdout(Stdio::from(stdout_file));
        }
        command.stderr(Stdio::from(log_file));
    } else {
        command.stdout(Stdio::null()).stderr(Stdio::null());
    }

    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);

    // Register before readiness polling, under the same lock used by exit cleanup.
    let pid = {
        let mut guard = api_child.lock()
            .map_err(|_| "API supervisor could not lock process state.".to_string())?;
        if shutdown.load(Ordering::SeqCst) {
            return Err("Desktop API startup cancelled during application exit.".to_string());
        }
        let child = command.spawn()
            .map_err(|error| format!("Failed to spawn desktop API runtime: {error}"))?;
        let pid = child.id();
        *guard = Some(child);
        pid
    };
    append_desktop_api_log(&config.app_data_dir, &format!("API startup process-created pid={pid} elapsedMs={}", started.elapsed().as_millis()));
    if let Err(message) = wait_for_api_port(api_port, &config.vault_path, api_child, shutdown, API_STARTUP_TIMEOUT) {
        stop_desktop_api(api_child);
        append_desktop_api_log(&config.app_data_dir, &message);
        return Err(desktop_api_error_with_log_tail(&config.app_data_dir, message));
    }
    append_desktop_api_log(&config.app_data_dir, &format!("API startup ready elapsedMs={}", started.elapsed().as_millis()));
    Ok(DesktopApiLaunch {
        base_url,
        pid: Some(pid),
        managed: true,
    })
}

#[cfg(test)]
mod startup_tests {
    use super::*;

    struct RunningApiFixture {
        shutdown: Arc<AtomicBool>,
        child: Arc<Mutex<Option<Child>>>,
        status: Arc<Mutex<serde_json::Value>>,
        worker: Option<thread::JoinHandle<()>>,
    }

    impl RunningApiFixture {
        fn start(label: &str) -> Self {
            let runtime = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("desktop-api-runtime");
            assert!(runtime.join("apps/api/src/server.mjs").exists(), "Prepare the desktop API runtime before native integration tests");
            let directory = std::env::temp_dir().join(format!("yansilu-native-{label}-{}-{}", std::process::id(), SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos()));
            let vault = directory.join("vault");
            fs::create_dir_all(&vault).unwrap();
            let config = DesktopApiConfig { app_data_dir: directory, vault_path: vault, runtime_dir: Some(runtime) };
            let shutdown = Arc::new(AtomicBool::new(false));
            let child = Arc::new(Mutex::new(None));
            let status = Arc::new(Mutex::new(default_service_status()));
            let worker = {
                let shutdown = Arc::clone(&shutdown);
                let child = Arc::clone(&child);
                let status = Arc::clone(&status);
                thread::spawn(move || supervise_desktop_api(config, child, status, shutdown))
            };
            Self { shutdown, child, status, worker: Some(worker) }
        }

        fn wait_for_healthy(&self, previous_pid: Option<u64>) -> serde_json::Value {
            let started = Instant::now();
            while started.elapsed() < Duration::from_secs(15) {
                let status = self.status.lock().unwrap().clone();
                let api = &status["services"]["api"];
                if api["status"] == "healthy" && api["pid"].as_u64() != previous_pid {
                    return api.clone();
                }
                thread::sleep(Duration::from_millis(20));
            }
            panic!("API did not become healthy: {}", self.status.lock().unwrap());
        }
    }

    impl Drop for RunningApiFixture {
        fn drop(&mut self) {
            self.shutdown.store(true, Ordering::SeqCst);
            stop_desktop_api(&self.child);
            if let Some(worker) = self.worker.take() { worker.join().unwrap(); }
        }
    }

    #[test]
    fn real_packaged_api_starts_recovers_and_exits_without_residual_listener() {
        let started = Instant::now();
        let fixture = RunningApiFixture::start("lifecycle");
        let api = fixture.wait_for_healthy(None);
        println!("Real packaged API first ready: {} ms", started.elapsed().as_millis());
        assert!(started.elapsed() < Duration::from_secs(10));
        let port: u16 = api["baseUrl"].as_str().unwrap().rsplit(':').next().unwrap().parse().unwrap();
        let health = api_health_json(port).unwrap();
        assert_eq!(health["ready"], true);
        assert_eq!(health["pid"], api["pid"]);
        assert_eq!(api["restartCount"], 0);
        thread::sleep(Duration::from_secs(5));
        assert_eq!(fixture.status.lock().unwrap()["services"]["api"]["restartCount"], 0);
        let other_vault = RunningApiFixture::start("port-conflict");
        let other_api = other_vault.wait_for_healthy(None);
        let other_port: u16 = other_api["baseUrl"].as_str().unwrap().rsplit(':').next().unwrap().parse().unwrap();
        assert_ne!(other_port, port);
        assert_ne!(other_api["vaultPath"], api["vaultPath"]);
        assert_eq!(api_health_json(port).unwrap()["pid"], api["pid"]);
        drop(other_vault);
        assert!(api_port_is_available(other_port));
        assert_eq!(api_health_json(port).unwrap()["pid"], api["pid"]);
        {
            let mut child = fixture.child.lock().unwrap();
            child.as_mut().unwrap().kill().unwrap();
        }
        let recovered = fixture.wait_for_healthy(api["pid"].as_u64());
        assert_eq!(recovered["restartCount"], 1);
        let recovered_port: u16 = recovered["baseUrl"].as_str().unwrap().rsplit(':').next().unwrap().parse().unwrap();
        let child = Arc::clone(&fixture.child);
        drop(fixture);
        assert!(child.lock().unwrap().is_none());
        assert!(api_port_is_available(port));
        assert!(api_port_is_available(recovered_port));

        let startup_fixture = RunningApiFixture::start("cancel-startup");
        let deadline = Instant::now();
        while startup_fixture.child.lock().unwrap().is_none() && deadline.elapsed() < Duration::from_secs(5) {
            thread::sleep(Duration::from_millis(1));
        }
        assert!(startup_fixture.child.lock().unwrap().is_some());
        let child = Arc::clone(&startup_fixture.child);
        drop(startup_fixture);
        assert!(child.lock().unwrap().is_none());
        assert!(api_port_is_available(port));
    }

    #[test]
    fn shutdown_interrupts_restart_backoff() {
        let shutdown = Arc::new(AtomicBool::new(false));
        let trigger = Arc::clone(&shutdown);
        let worker = thread::spawn(move || {
            thread::sleep(Duration::from_millis(25));
            trigger.store(true, Ordering::SeqCst);
        });
        let started = Instant::now();
        assert!(!wait_unless_shutdown(&shutdown, Duration::from_secs(30)));
        worker.join().unwrap();
        assert!(started.elapsed() < Duration::from_secs(1));
    }

    fn read_health_fixture(response: Vec<u8>) -> Option<serde_json::Value> {
        let listener = TcpListener::bind(("127.0.0.1", 0)).unwrap();
        let port = listener.local_addr().unwrap().port();
        let server = thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            stream.set_read_timeout(Some(Duration::from_secs(5))).unwrap();
            let mut request = Vec::new();
            let mut byte = [0];
            while !request.ends_with(b"\r\n\r\n") && request.len() < 8192 {
                if stream.read(&mut byte).unwrap() == 0 { break; }
                request.push(byte[0]);
            }
            assert!(request.starts_with(b"GET /health HTTP/1.1\r\n"));
            let _ = stream.write_all(&response);
        });
        let result = api_health_json(port);
        server.join().unwrap();
        result
    }

    #[test]
    fn health_probe_decodes_real_chunked_http_framing() {
        let body = serde_json::to_vec(&serde_json::json!({
            "app": "yansilu", "service": "api", "ok": true, "ready": true,
            "vaultPath": "C:\\Users\\test\\研思录\\vault"
        })).unwrap();
        let mut response = b"HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\nConnection: close\r\n\r\n".to_vec();
        for chunk in body.chunks(17) {
            response.extend_from_slice(format!("{:x};fixture=yes\r\n", chunk.len()).as_bytes());
            response.extend_from_slice(chunk);
            response.extend_from_slice(b"\r\n");
        }
        response.extend_from_slice(b"0\r\n\r\n");
        let health = read_health_fixture(response).unwrap();
        assert_eq!(health["ready"], true);
        assert!(api_json_matches_vault(&health, &PathBuf::from("C:\\Users\\test\\研思录\\vault")));
    }

    #[test]
    fn health_probe_accepts_content_length_http() {
        let body = b"{\"ok\":true,\"ready\":true}";
        let mut response = format!("HTTP/1.0 200 OK\r\nContent-Length: {}\r\n\r\n", body.len()).into_bytes();
        response.extend_from_slice(body);
        assert_eq!(read_health_fixture(response).unwrap()["ready"], true);
    }

    #[test]
    fn health_probe_rejects_non_success_and_redirects() {
        for status in ["503 Service Unavailable", "302 Found"] {
            let response = format!("HTTP/1.1 {status}\r\nLocation: http://127.0.0.1:1/health\r\nContent-Length: 2\r\n\r\n{{}}").into_bytes();
            assert!(read_health_fixture(response).is_none());
        }
    }

    #[test]
    fn health_probe_rejects_malformed_or_oversized_bodies() {
        for body in [b"not json".to_vec(), vec![b' '; 64 * 1024 + 1]] {
            let mut response = format!("HTTP/1.1 200 OK\r\nContent-Length: {}\r\nConnection: close\r\n\r\n", body.len()).into_bytes();
            response.extend_from_slice(&body);
            assert!(read_health_fixture(response).is_none());
        }
    }

    #[test]
    fn readiness_wait_observes_a_late_service_without_caching_starting() {
        let status = Arc::new(Mutex::new(default_service_status()));
        let publisher = Arc::clone(&status);
        let worker = thread::spawn(move || {
            thread::sleep(Duration::from_millis(25));
            update_service_status(&publisher, serde_json::json!({"status": "healthy", "baseUrl": "http://127.0.0.1:3001"}), "healthy");
        });
        let result = wait_for_desktop_service_status(status, Duration::from_secs(1));
        worker.join().unwrap();
        assert_eq!(result.pointer("/services/api/status").unwrap(), "healthy");
        assert_eq!(result.pointer("/services/api/baseUrl").unwrap(), "http://127.0.0.1:3001");
        assert!(result.get("startupWaitTimedOut").is_none());
    }

    #[test]
    fn readiness_wait_is_bounded_and_preserves_starting_status() {
        let status = Arc::new(Mutex::new(default_service_status()));
        let result = wait_for_desktop_service_status(status, Duration::ZERO);
        assert_eq!(result["startupWaitTimedOut"], true);
        assert_eq!(result.pointer("/services/api/status").unwrap(), "starting");
    }

    #[test]
    fn readiness_wait_returns_blocked_error_without_waiting() {
        let status = Arc::new(Mutex::new(default_service_status()));
        update_service_status(&status, serde_json::json!({"status": "blocked", "lastError": "runtime missing"}), "blocked");
        let result = wait_for_desktop_service_status(status, Duration::from_secs(30));
        assert_eq!(result.pointer("/services/api/lastError").unwrap(), "runtime missing");
        assert!(result.get("startupWaitTimedOut").is_none());
    }

    #[test]
    fn health_identity_rejects_another_vault_or_service() {
        let vault = PathBuf::from("test-vault");
        let mut health = serde_json::json!({"app": "yansilu", "service": "api", "vaultPath": "test-vault"});
        assert!(api_json_matches_vault(&health, &vault));
        health["vaultPath"] = serde_json::json!("other-vault");
        assert!(!api_json_matches_vault(&health, &vault));
        health["vaultPath"] = serde_json::json!("test-vault");
        health["app"] = serde_json::json!("other-app");
        assert!(!api_json_matches_vault(&health, &vault));
    }

    #[test]
    fn existing_service_is_not_reused_before_ready() {
        let vault = PathBuf::from("test-vault");
        let mut health = serde_json::json!({"app": "yansilu", "service": "api", "vaultPath": "test-vault", "ok": true, "ready": false});
        assert!(!api_json_is_ready(&health, &vault));
        health["ready"] = serde_json::json!(true);
        assert!(api_json_is_ready(&health, &vault));
        health["ok"] = serde_json::json!(false);
        assert!(!api_json_is_ready(&health, &vault));
    }
}

fn stop_desktop_api(api_child: &Arc<Mutex<Option<Child>>>) {
    if let Ok(mut guard) = api_child.lock() {
        if let Some(mut child) = guard.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

fn wait_unless_shutdown(shutdown: &AtomicBool, duration: Duration) -> bool {
    let started = Instant::now();
    while started.elapsed() < duration {
        if shutdown.load(Ordering::SeqCst) { return false; }
        thread::sleep(Duration::from_millis(50).min(duration.saturating_sub(started.elapsed())));
    }
    !shutdown.load(Ordering::SeqCst)
}

fn supervise_desktop_api(
    config: DesktopApiConfig,
    api_child: Arc<Mutex<Option<Child>>>,
    service_status: Arc<Mutex<serde_json::Value>>,
    shutdown: Arc<AtomicBool>,
) {
    let log_path = config.app_data_dir.join("api.log");
    update_service_status(
        &service_status,
        serde_json::json!({
            "status": "starting",
            "vaultPath": config.vault_path.to_string_lossy(),
            "logPath": log_path.to_string_lossy()
        }),
        "recovering",
    );

    let mut restart_count: u32 = 0;
    let mut consecutive_failures: u32 = 0;
    let backoffs = [0_u64, 1_000, 3_000, 10_000, 30_000];
    loop {
        if shutdown.load(Ordering::SeqCst) { break; }
        if consecutive_failures >= API_MAX_RESTARTS {
            update_service_status(
                &service_status,
                serde_json::json!({
                    "status": "blocked",
                    "nextRetryMs": 0,
                    "restartCount": restart_count,
                    "consecutiveFailures": consecutive_failures
                }),
                "blocked",
            );
            append_desktop_api_log(&config.app_data_dir, "Yansilu desktop API supervisor stopped after repeated failures.");
            break;
        }

        let retry_ms = backoffs
            .get(usize::try_from(consecutive_failures).unwrap_or_default())
            .copied()
            .unwrap_or(30_000);
        if retry_ms > 0 {
            update_service_status(
                &service_status,
                serde_json::json!({
                    "status": "recovering",
                    "nextRetryMs": retry_ms,
                    "vaultPath": config.vault_path.to_string_lossy(),
                    "restartCount": restart_count,
                    "consecutiveFailures": consecutive_failures
                }),
                "recovering",
            );
            if !wait_unless_shutdown(&shutdown, Duration::from_millis(retry_ms)) { break; }
        }

        match spawn_desktop_api(&config, &api_child, &shutdown) {
            Ok(launch) => {
                if shutdown.load(Ordering::SeqCst) {
                    stop_desktop_api(&api_child);
                    break;
                }
                let mut stable_health_checks: u32 = 0;
                let mut health_failures: u32 = 0;
                let port = launch
                    .base_url
                    .rsplit(':')
                    .next()
                    .and_then(|value| value.parse::<u16>().ok())
                    .unwrap_or(DEFAULT_API_PORT);
                update_service_status(
                    &service_status,
                    serde_json::json!({
                        "status": "healthy",
                        "baseUrl": launch.base_url,
                        "pid": launch.pid,
                        "managed": launch.managed,
                        "vaultPath": config.vault_path.to_string_lossy(),
                        "restartCount": restart_count,
                        "consecutiveFailures": consecutive_failures,
                        "lastError": "",
                        "lastStartedAt": now_string(),
                        "lastRecoveredAt": now_string(),
                        "nextRetryMs": 0,
                        "logPath": log_path.to_string_lossy()
                    }),
                    "healthy",
                );
                append_desktop_api_log(&config.app_data_dir, "Yansilu desktop API supervisor marked API healthy.");
                loop {
                    if !wait_unless_shutdown(&shutdown, API_HEALTH_INTERVAL) { return; }
                    let exited = if let Ok(mut guard) = api_child.lock() {
                        match guard.as_mut().and_then(|child| child.try_wait().ok()).flatten() {
                            Some(status) => {
                                *guard = None;
                                Some(format!("API process exited: {status}."))
                            }
                            None => None,
                        }
                    } else {
                        Some("API supervisor could not lock process state.".to_string())
                    };
                    if let Some(message) = exited {
                        restart_count += 1;
                        consecutive_failures += 1;
                        append_desktop_api_log(&config.app_data_dir, &message);
                        update_service_status(
                            &service_status,
                            serde_json::json!({
                                "status": "recovering",
                                "lastError": message,
                                "restartCount": restart_count,
                                "consecutiveFailures": consecutive_failures,
                                "vaultPath": config.vault_path.to_string_lossy(),
                                "baseUrl": "",
                                "pid": null
                            }),
                            "recovering",
                        );
                        break;
                    }
                    let healthy = api_health_json(port).map(|json| {
                        api_json_is_ready(&json, &config.vault_path)
                    }).unwrap_or(false);
                    if shutdown.load(Ordering::SeqCst) { return; }
                    health_failures = if healthy { 0 } else { health_failures + 1 };
                    if health_failures >= API_MAX_HEALTH_FAILURES {
                        restart_count += 1;
                        consecutive_failures += 1;
                        let message = format!("API health check failed on port {port}; restarting managed service.");
                        append_desktop_api_log(&config.app_data_dir, &message);
                        stop_desktop_api(&api_child);
                        update_service_status(
                            &service_status,
                            serde_json::json!({
                                "status": "recovering",
                                "lastError": message,
                                "restartCount": restart_count,
                                "consecutiveFailures": consecutive_failures,
                                "vaultPath": config.vault_path.to_string_lossy(),
                                "baseUrl": "",
                                "pid": null
                            }),
                            "recovering",
                        );
                        break;
                    }
                    if !healthy { continue; }
                    if consecutive_failures > 0 {
                        stable_health_checks += 1;
                        if stable_health_checks >= API_STABLE_HEALTH_CHECKS {
                            consecutive_failures = 0;
                            update_service_status(
                                &service_status,
                                serde_json::json!({
                                    "consecutiveFailures": consecutive_failures,
                                    "lastRecoveredAt": now_string()
                                }),
                                "healthy",
                            );
                        }
                    }
                }
            }
            Err(error) => {
                if shutdown.load(Ordering::SeqCst) { break; }
                restart_count += 1;
                consecutive_failures += 1;
                append_desktop_api_log(&config.app_data_dir, &error);
                update_service_status(
                    &service_status,
                    serde_json::json!({
                        "status": if consecutive_failures >= API_MAX_RESTARTS { "blocked" } else { "recovering" },
                        "lastError": error,
                        "restartCount": restart_count,
                        "consecutiveFailures": consecutive_failures,
                        "vaultPath": config.vault_path.to_string_lossy(),
                        "baseUrl": "",
                        "pid": null,
                        "managed": false
                    }),
                    if consecutive_failures >= API_MAX_RESTARTS { "blocked" } else { "recovering" },
                );
            }
        }
    }
}

pub fn run() {
    let api_child: Arc<Mutex<Option<Child>>> = Arc::new(Mutex::new(None));
    let shutdown = Arc::new(AtomicBool::new(false));
    let service_status: Arc<Mutex<serde_json::Value>> = Arc::new(Mutex::new(default_service_status()));
    let api_child_for_setup = Arc::clone(&api_child);
    let service_status_for_setup = Arc::clone(&service_status);
    let api_child_for_run = Arc::clone(&api_child);
    let shutdown_for_setup = Arc::clone(&shutdown);

    tauri::Builder::default()
        .manage(DesktopApiState {
            service_status,
        })
        .setup(move |app| {
            match desktop_api_config(app) {
                Ok(config) => {
                    thread::spawn(move || {
                        supervise_desktop_api(config, api_child_for_setup, service_status_for_setup, shutdown_for_setup);
                    });
                }
                Err(error) => {
                    update_service_status(
                        &service_status_for_setup,
                        serde_json::json!({
                            "status": "blocked",
                            "lastError": error
                        }),
                        "blocked",
                    );
                }
            }

            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_desktop_api_base,
            wait_for_desktop_api_ready,
            get_desktop_api_status,
            get_desktop_service_status,
            get_desktop_service_log,
            open_in_explorer
        ])
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .build(tauri::generate_context!())
        .expect("failed to build yansilu desktop app")
        .run(move |app_handle, event| match event {
            tauri::RunEvent::Exit | tauri::RunEvent::ExitRequested { .. } => {
                if !shutdown.swap(true, Ordering::SeqCst) {
                    let started = Instant::now();
                    stop_desktop_api(&api_child_for_run);
                    if let Ok(directory) = app_handle.path().app_data_dir() {
                        append_desktop_api_log(&directory, &format!("Managed API shutdown completed elapsedMs={}", started.elapsed().as_millis()));
                    }
                }
            }
            _ => {}
        });
}
