#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::{self, OpenOptions};
use std::io::{Read, Write};
use std::net::{SocketAddr, TcpListener, TcpStream};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use tauri::Manager;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

const DEFAULT_API_PORT: u16 = 3000;
const API_PORT_SEARCH_END: u16 = 3020;

struct DesktopApiState {
    base_url: Arc<Mutex<String>>,
    launch_error: Arc<Mutex<String>>,
}

#[tauri::command]
fn get_desktop_api_base(state: tauri::State<DesktopApiState>) -> String {
    state
        .base_url
        .lock()
        .map(|value| value.clone())
        .unwrap_or_default()
}

#[tauri::command]
fn get_desktop_api_status(state: tauri::State<DesktopApiState>) -> serde_json::Value {
    let base_url = state
        .base_url
        .lock()
        .map(|value| value.clone())
        .unwrap_or_default();
    let launch_error = state
        .launch_error
        .lock()
        .map(|value| value.clone())
        .unwrap_or_default();
    serde_json::json!({
        "baseUrl": base_url,
        "running": !base_url.is_empty() && launch_error.is_empty(),
        "launchError": launch_error
    })
}

#[tauri::command]
fn open_in_explorer(path: String) -> Result<(), String> {
    use std::path::Path;

    let p = Path::new(&path);
    if !p.exists() {
        return Err(format!("Path does not exist: {path}"));
    }

    // Use Windows Explorer directly instead of tauri_plugin_opener for local paths.
    // This avoids sporadic hangs we observed with non-ASCII (CJK) directory names.
    let mut cmd = Command::new("explorer.exe");
    if p.is_dir() {
        cmd.arg(&path);
    } else {
        // explorer.exe expects /select,"C:\path\file.ext"
        cmd.arg(format!("/select,\"{path}\""));
    }

    cmd.spawn()
        .map(|_| ())
        .map_err(|e| format!("Failed to spawn explorer.exe: {e}"))
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
    let _ = stream.set_read_timeout(Some(Duration::from_millis(2000)));
    let _ = stream.set_write_timeout(Some(Duration::from_millis(2000)));

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

fn api_health_is_yansilu(port: u16) -> bool {
    let Some(response) = api_health_response(port) else {
        return false;
    };
    let compact_response: String = response.chars().filter(|ch| !ch.is_whitespace()).collect();
    response.starts_with("HTTP/1.1 200")
        && compact_response.contains("\"ok\":true")
        && compact_response.contains("\"service\":\"api\"")
}

fn api_health_matches_vault(port: u16, vault_path: &PathBuf) -> bool {
    let Some(response) = api_health_response(port) else {
        return false;
    };
    let compact_response: String = response.chars().filter(|ch| !ch.is_whitespace()).collect();
    let expected_vault_path = vault_path.to_string_lossy().replace('\\', "\\\\");
    let expected_vault_fragment = format!("\"vaultPath\":\"{expected_vault_path}\"");
    response.starts_with("HTTP/1.1 200")
        && compact_response.contains("\"ok\":true")
        && compact_response.contains("\"service\":\"api\"")
        && compact_response.contains(&expected_vault_fragment)
}

fn wait_for_api_port(port: u16, _vault_path: &PathBuf, timeout: Duration) -> bool {
    let started = Instant::now();
    while started.elapsed() < timeout {
        // Use the simpler check — just verify this is a yansilu API on this port.
        // vaultPath matching is unreliable due to path escaping differences.
        if api_health_is_yansilu(port) {
            return true;
        }
        std::thread::sleep(Duration::from_millis(80));
    }
    false
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
        let _ = writeln!(log_file, "{message}");
    }
}

struct DesktopApiLaunch {
    child: Option<Child>,
    base_url: String,
}

fn spawn_desktop_api(app: &tauri::App) -> Result<DesktopApiLaunch, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Cannot resolve app data directory: {error}"))?;
    let vault_path = app_data_dir.join("vault");
    let _ = fs::create_dir_all(&vault_path);
    let _ = fs::create_dir_all(&app_data_dir);

    let api_port = resolve_desktop_api_port(&app_data_dir, &vault_path)
        .ok_or_else(|| "No available API port between 3000 and 3020.".to_string())?;
    let base_url = format!("http://localhost:{api_port}");
    if api_health_matches_vault(api_port, &vault_path) {
        return Ok(DesktopApiLaunch {
            child: None,
            base_url,
        });
    }

    let runtime_dir = match desktop_api_runtime_dir(app) {
        Some(value) => value,
        None => {
            let message = "Yansilu desktop API runtime directory was not found.";
            append_desktop_api_log(&app_data_dir, message);
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
        let message = "Yansilu desktop API runtime is incomplete.";
        append_desktop_api_log(&app_data_dir, message);
        return Err(message.to_string());
    }

    let log_path = app_data_dir.join("api.log");

    let mut command = Command::new(node_path);
    command
        .arg("apps/api/src/server.mjs")
        .current_dir(runtime_dir)
        .env("API_PORT", api_port.to_string())
        .env("WEB_PORT", "5173")
        .env("VAULT_PATH", &vault_path)
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

    let mut child = command
        .spawn()
        .map_err(|error| format!("Failed to spawn desktop API runtime: {error}"))?;
    if !wait_for_api_port(api_port, &vault_path, Duration::from_secs(15)) {
        let _ = child.kill();
        let _ = child.wait();
        let message = format!(
            "Yansilu desktop API did not become ready on port {api_port} within 15 seconds."
        );
        append_desktop_api_log(&app_data_dir, &message);
        return Err(message);
    }
    Ok(DesktopApiLaunch {
        child: Some(child),
        base_url,
    })
}

fn stop_desktop_api(api_child: &Arc<Mutex<Option<Child>>>) {
    if let Ok(mut guard) = api_child.lock() {
        if let Some(mut child) = guard.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

pub fn run() {
    let api_child: Arc<Mutex<Option<Child>>> = Arc::new(Mutex::new(None));
    let api_base_url: Arc<Mutex<String>> = Arc::new(Mutex::new(String::new()));
    let api_launch_error: Arc<Mutex<String>> = Arc::new(Mutex::new(String::new()));
    let api_child_for_setup = Arc::clone(&api_child);
    let api_base_url_for_setup = Arc::clone(&api_base_url);
    let api_launch_error_for_setup = Arc::clone(&api_launch_error);
    let api_child_for_run = Arc::clone(&api_child);

    tauri::Builder::default()
        .manage(DesktopApiState {
            base_url: api_base_url,
            launch_error: api_launch_error,
        })
        .setup(move |app| {
            match spawn_desktop_api(app) {
                Ok(launch) => {
                    if let Ok(mut guard) = api_base_url_for_setup.lock() {
                        *guard = launch.base_url;
                    }
                    if let Ok(mut guard) = api_launch_error_for_setup.lock() {
                        guard.clear();
                    }
                    if let Ok(mut guard) = api_child_for_setup.lock() {
                        *guard = launch.child;
                    }
                }
                Err(error) => {
                    if let Ok(mut guard) = api_launch_error_for_setup.lock() {
                        *guard = error;
                    }
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
