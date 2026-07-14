#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::{self, OpenOptions};
use std::io::{Read, Write};
use std::net::{SocketAddr, TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use tauri::Manager;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

const DEFAULT_API_PORT: u16 = 3000;
const API_PORT_SEARCH_END: u16 = 3020;
const API_STARTUP_TIMEOUT: Duration = Duration::from_secs(45);
const API_HEALTH_INTERVAL: Duration = Duration::from_secs(2);
const API_MAX_RESTARTS: u32 = 5;
const API_STABLE_HEALTH_CHECKS: u32 = 2;

struct DesktopApiState {
    service_status: Arc<Mutex<serde_json::Value>>,
}

#[tauri::command]
fn get_desktop_api_base(state: tauri::State<DesktopApiState>) -> String {
    state
        .service_status
        .lock()
        .ok()
        .and_then(|value| {
            value
                .pointer("/services/api/baseUrl")
                .and_then(|item| item.as_str())
                .map(String::from)
        })
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

#[tauri::command]
fn get_desktop_service_log(state: tauri::State<DesktopApiState>) -> serde_json::Value {
    let status = desktop_service_status_snapshot(&state);
    let log_path = status
        .pointer("/services/api/logPath")
        .and_then(|value| value.as_str())
        .unwrap_or("");
    let content = fs::read_to_string(log_path).unwrap_or_default();
    let lines: Vec<&str> = content.lines().rev().take(80).collect();
    serde_json::json!({
        "path": log_path,
        "lines": lines.into_iter().rev().collect::<Vec<&str>>()
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
    TcpListener::bind(("127.0.0.1", port)).is_ok()
}

fn api_health_response(port: u16) -> Option<String> {
    let address: SocketAddr = match format!("127.0.0.1:{port}").parse() {
        Ok(value) => value,
        Err(_) => return None,
    };
    let mut stream = match TcpStream::connect_timeout(&address, Duration::from_millis(300)) {
        Ok(value) => value,
        Err(_) => return None,
    };
    let _ = stream.set_read_timeout(Some(Duration::from_millis(500)));
    let _ = stream.set_write_timeout(Some(Duration::from_millis(500)));

    if stream
        .write_all(
            format!("GET /health HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nConnection: close\r\n\r\n")
                .as_bytes(),
        )
        .is_err()
    {
        return None;
    }

    let mut response = String::new();
    if stream.read_to_string(&mut response).is_err() {
        return None;
    }

    Some(response)
}

fn api_health_json(port: u16) -> Option<serde_json::Value> {
    let Some(response) = api_health_response(port) else {
        return None;
    };
    if !response.starts_with("HTTP/1.1 200") {
        return None;
    }
    let body = response.split("\r\n\r\n").nth(1)?;
    serde_json::from_str(body).ok()
}

fn api_health_is_yansilu(port: u16) -> bool {
    let Some(json) = api_health_json(port) else {
        return false;
    };
    json.get("ok").and_then(|value| value.as_bool()) == Some(true)
        && json.get("service").and_then(|value| value.as_str()) == Some("api")
}

fn api_health_matches_vault(port: u16, vault_path: &PathBuf) -> bool {
    let Some(json) = api_health_json(port) else {
        return false;
    };
    json.get("ok").and_then(|value| value.as_bool()) == Some(true)
        && json.get("service").and_then(|value| value.as_str()) == Some("api")
        && json.get("vaultPath").and_then(|value| value.as_str())
            == Some(vault_path.to_string_lossy().as_ref())
}

fn wait_for_api_port(
    port: u16,
    vault_path: &PathBuf,
    child: &mut Child,
    timeout: Duration,
) -> Result<(), String> {
    let started = Instant::now();
    while started.elapsed() < timeout {
        if api_health_matches_vault(port, vault_path) {
            return Ok(());
        }
        match child.try_wait() {
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
        if api_port_is_available(port) {
            return Some(port);
        }
        if port == DEFAULT_API_PORT && api_port_is_open(port) {
            append_desktop_api_log(
                app_data_dir,
                "Yansilu desktop API port 3000 is occupied by a non-Yansilu service; trying another port.",
            );
        }
    }
    append_desktop_api_log(
        app_data_dir,
        "Yansilu desktop API could not find an available port between 3000 and 3020.",
    );
    None
}

fn candidate_desktop_api_runtime_roots(app: &tauri::App) -> Vec<(PathBuf, String)> {
    let mut roots: Vec<(PathBuf, String)> = Vec::new();

    if let Ok(resource_dir) = app.path().resource_dir() {
        roots.push((
            resource_dir.join("desktop-api-runtime"),
            "tauri resource_dir".to_string(),
        ));
    }

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            roots.push((
                exe_dir.join("desktop-api-runtime"),
                "executable directory".to_string(),
            ));

            #[cfg(target_os = "macos")]
            if let Some(contents_dir) = exe_dir.parent() {
                roots.push((
                    contents_dir.join("Resources").join("desktop-api-runtime"),
                    "macOS Contents/Resources".to_string(),
                ));
            }
        }
    }

    if let Ok(cwd) = std::env::current_dir() {
        roots.push((
            cwd.join("apps")
                .join("desktop")
                .join("src-tauri")
                .join("desktop-api-runtime"),
            "repo src-tauri runtime".to_string(),
        ));
    }

    let mut deduped: Vec<(PathBuf, String)> = Vec::new();
    for (root, label) in roots {
        if deduped.iter().any(|(existing, _)| existing == &root) {
            continue;
        }
        deduped.push((root, label));
    }
    deduped
}

fn desktop_api_runtime_candidates(app: &tauri::App) -> Vec<DesktopApiRuntime> {
    let mut runtimes = Vec::new();
    for (root, label) in candidate_desktop_api_runtime_roots(app) {
        let bundled_node_path = if cfg!(windows) {
            root.join("node").join("node.exe")
        } else {
            root.join("node").join("node")
        };
        let server_path = root.join("apps").join("api").join("src").join("server.mjs");
        if !server_path.exists() {
            continue;
        }

        if bundled_node_path.exists() {
            runtimes.push(DesktopApiRuntime {
                root: root.clone(),
                node_path: bundled_node_path,
                label: format!("{label}; bundled node"),
            });
        }
        runtimes.push(DesktopApiRuntime {
            root,
            node_path: PathBuf::from(if cfg!(windows) { "node.exe" } else { "node" }),
            label: format!("{label}; system node fallback"),
        });
    }
    runtimes
}

fn append_desktop_api_log(app_data_dir: &PathBuf, message: &str) {
    let _ = fs::create_dir_all(app_data_dir);
    let log_path = app_data_dir.join("api.log");
    if let Ok(mut log_file) = OpenOptions::new().create(true).append(true).open(log_path) {
        let _ = writeln!(log_file, "{message}");
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
struct DesktopApiRuntime {
    root: PathBuf,
    node_path: PathBuf,
    label: String,
}

#[derive(Clone)]
struct DesktopApiConfig {
    app_data_dir: PathBuf,
    vault_path: PathBuf,
    runtimes: Vec<DesktopApiRuntime>,
}

struct DesktopApiLaunch {
    child: Option<Child>,
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
    let runtimes = desktop_api_runtime_candidates(app);
    if runtimes.is_empty() {
        append_desktop_api_log(
            &app_data_dir,
            "Yansilu desktop API runtime was not found in any known location.",
        );
        for (root, label) in candidate_desktop_api_runtime_roots(app) {
            append_desktop_api_log(
                &app_data_dir,
                &format!("Checked runtime candidate ({label}): {}", root.display()),
            );
        }
    } else {
        for runtime in &runtimes {
            append_desktop_api_log(
                &app_data_dir,
                &format!(
                    "API runtime candidate: label={}, root={}, node={}",
                    runtime.label,
                    runtime.root.display(),
                    runtime.node_path.display()
                ),
            );
        }
    }
    Ok(DesktopApiConfig {
        app_data_dir,
        vault_path,
        runtimes,
    })
}

fn spawn_desktop_api_with_runtime(
    config: &DesktopApiConfig,
    runtime: &DesktopApiRuntime,
    api_port: u16,
    base_url: &str,
) -> Result<DesktopApiLaunch, String> {
    let server_path = runtime
        .root
        .join("apps")
        .join("api")
        .join("src")
        .join("server.mjs");
    if !server_path.exists() {
        return Err(format!(
            "Yansilu desktop API server entry is missing: {}",
            server_path.display()
        ));
    }
    if runtime.node_path.exists() {
        if let Err(message) = ensure_executable(&runtime.node_path) {
            return Err(message);
        }
    }

    append_desktop_api_log(
        &config.app_data_dir,
        &format!(
            "Starting Yansilu desktop API with runtime label={}, root={}, node={}, port={}, vault={}",
            runtime.label,
            runtime.root.display(),
            runtime.node_path.display(),
            api_port,
            config.vault_path.display()
        ),
    );

    let log_path = config.app_data_dir.join("api.log");

    let mut command = Command::new(&runtime.node_path);
    command
        .arg("apps/api/src/server.mjs")
        .current_dir(&runtime.root)
        .env("API_PORT", api_port.to_string())
        .env("WEB_PORT", "5173")
        .env("VAULT_PATH", &config.vault_path)
        .env("YANSILU_DESKTOP_API", "1");

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

    let mut child = command.spawn().map_err(|error| {
        format!(
            "Failed to spawn desktop API runtime via {}: {error}",
            runtime.node_path.display()
        )
    })?;
    let pid = child.id();
    if let Err(message) = wait_for_api_port(
        api_port,
        &config.vault_path,
        &mut child,
        API_STARTUP_TIMEOUT,
    ) {
        let _ = child.kill();
        let _ = child.wait();
        return Err(message);
    }
    Ok(DesktopApiLaunch {
        child: Some(child),
        base_url: base_url.to_string(),
        pid: Some(pid),
        managed: true,
    })
}

fn spawn_desktop_api(config: &DesktopApiConfig) -> Result<DesktopApiLaunch, String> {
    let api_port = resolve_desktop_api_port(&config.app_data_dir, &config.vault_path)
        .ok_or_else(|| "No available API port between 3000 and 3020.".to_string())?;
    let base_url = format!("http://localhost:{api_port}");
    if api_health_matches_vault(api_port, &config.vault_path) {
        return Ok(DesktopApiLaunch {
            child: None,
            base_url,
            pid: api_health_json(api_port).and_then(|json| {
                json.get("pid")
                    .and_then(|value| value.as_u64())
                    .map(|value| value as u32)
            }),
            managed: false,
        });
    }

    if config.runtimes.is_empty() {
        let message = "Yansilu desktop API runtime directory was not found.";
        append_desktop_api_log(&config.app_data_dir, message);
        return Err(message.to_string());
    }

    let mut errors = Vec::new();
    for runtime in &config.runtimes {
        match spawn_desktop_api_with_runtime(config, runtime, api_port, &base_url) {
            Ok(launch) => return Ok(launch),
            Err(error) => {
                let message = format!("Runtime candidate failed ({}): {error}", runtime.label);
                append_desktop_api_log(&config.app_data_dir, &message);
                errors.push(message);
            }
        }
    }

    Err(format!(
        "Yansilu desktop API failed to start from all runtime candidates. {}",
        errors.join(" | ")
    ))
}

fn stop_desktop_api(api_child: &Arc<Mutex<Option<Child>>>) {
    if let Ok(mut guard) = api_child.lock() {
        if let Some(mut child) = guard.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

fn supervise_desktop_api(
    config: DesktopApiConfig,
    api_child: Arc<Mutex<Option<Child>>>,
    service_status: Arc<Mutex<serde_json::Value>>,
) {
    let log_path = config.app_data_dir.join("api.log");
    update_service_status(
        &service_status,
        serde_json::json!({
            "status": "starting",
            "logPath": log_path.to_string_lossy()
        }),
        "recovering",
    );

    let mut restart_count: u32 = 0;
    let mut consecutive_failures: u32 = 0;
    let backoffs = [0_u64, 1_000, 3_000, 10_000, 30_000];
    loop {
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
            append_desktop_api_log(
                &config.app_data_dir,
                "Yansilu desktop API supervisor stopped after repeated failures.",
            );
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
                    "restartCount": restart_count,
                    "consecutiveFailures": consecutive_failures
                }),
                "recovering",
            );
            thread::sleep(Duration::from_millis(retry_ms));
        }

        match spawn_desktop_api(&config) {
            Ok(launch) => {
                let mut stable_health_checks: u32 = 0;
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
                append_desktop_api_log(
                    &config.app_data_dir,
                    "Yansilu desktop API supervisor marked API healthy.",
                );
                if let Ok(mut guard) = api_child.lock() {
                    *guard = launch.child;
                }

                loop {
                    thread::sleep(API_HEALTH_INTERVAL);
                    let exited = if let Ok(mut guard) = api_child.lock() {
                        match guard
                            .as_mut()
                            .and_then(|child| child.try_wait().ok())
                            .flatten()
                        {
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
                                "baseUrl": "",
                                "pid": null
                            }),
                            "recovering",
                        );
                        break;
                    }
                    if !api_health_matches_vault(port, &config.vault_path) {
                        restart_count += 1;
                        consecutive_failures += 1;
                        let message = format!(
                            "API health check failed on port {port}; restarting managed service."
                        );
                        append_desktop_api_log(&config.app_data_dir, &message);
                        stop_desktop_api(&api_child);
                        update_service_status(
                            &service_status,
                            serde_json::json!({
                                "status": "recovering",
                                "lastError": message,
                                "restartCount": restart_count,
                                "consecutiveFailures": consecutive_failures,
                                "baseUrl": "",
                                "pid": null
                            }),
                            "recovering",
                        );
                        break;
                    }
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
                        "baseUrl": "",
                        "pid": null,
                        "managed": false
                    }),
                    if consecutive_failures >= API_MAX_RESTARTS {
                        "blocked"
                    } else {
                        "recovering"
                    },
                );
            }
        }
    }
}

pub fn run() {
    let api_child: Arc<Mutex<Option<Child>>> = Arc::new(Mutex::new(None));
    let service_status: Arc<Mutex<serde_json::Value>> =
        Arc::new(Mutex::new(default_service_status()));
    let api_child_for_setup = Arc::clone(&api_child);
    let service_status_for_setup = Arc::clone(&service_status);
    let api_child_for_run = Arc::clone(&api_child);

    tauri::Builder::default()
        .manage(DesktopApiState { service_status })
        .setup(move |app| {
            match desktop_api_config(app) {
                Ok(config) => {
                    thread::spawn(move || {
                        supervise_desktop_api(
                            config,
                            api_child_for_setup,
                            service_status_for_setup,
                        );
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
        .run(move |_app_handle, event| match event {
            tauri::RunEvent::Exit | tauri::RunEvent::ExitRequested { .. } => {
                stop_desktop_api(&api_child_for_run);
            }
            _ => {}
        });
}
