#[cfg(unix)]
use std::fs;
#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;
#[cfg(unix)]
use std::path::Path;

#[cfg(unix)]
fn fix_permissions_recursive(path: &Path) {
    if !path.exists() {
        return;
    }
    if path.is_dir() {
        // Directories need execute (+x) permission to be traversable
        let _ = fs::set_permissions(path, fs::Permissions::from_mode(0o755));
        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten() {
                fix_permissions_recursive(&entry.path());
            }
        }
    } else {
        let _ = fs::set_permissions(path, fs::Permissions::from_mode(0o644));
    }
}

fn main() {
    #[cfg(unix)]
    {
        let runtime_dir = Path::new("desktop-api-runtime");
        if runtime_dir.exists() {
            fix_permissions_recursive(runtime_dir);
            let node_bin = runtime_dir.join("node").join("node");
            let _ = fs::set_permissions(&node_bin, fs::Permissions::from_mode(0o755));
        }
    }
    tauri_build::build()
}
