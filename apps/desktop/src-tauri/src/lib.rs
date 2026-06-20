#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tauri::command]
fn open_in_explorer(path: String) -> Result<(), String> {
    use std::path::Path;
    use std::process::Command;

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

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![open_in_explorer])
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .run(tauri::generate_context!())
        .expect("failed to run yansilu desktop app");
}
