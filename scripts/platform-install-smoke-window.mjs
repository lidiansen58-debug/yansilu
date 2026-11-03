import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

export async function captureNativeSmokeWindow(pid, directory, run) {
  await new Promise(resolve => setTimeout(resolve, 1500));
  if (process.platform === 'linux') {
    const tree = run('xwininfo', ['-root', '-tree']);
    await fs.writeFile(path.join(directory, 'windows.txt'), tree, 'utf8');
    assert.match(tree, /研思录/, 'Native X11 window must exist');
    run('import', ['-window', 'root', path.join(directory, 'window.png')]);
    return { windowTitle: '研思录', screenshot: 'window.png' };
  }
  const swift = path.join(directory, 'windows.swift');
  await fs.writeFile(swift, `import Foundation
import CoreGraphics
let pid = Int(CommandLine.arguments[1])!
let all = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] ?? []
let windows = all.filter { ($0[kCGWindowOwnerPID as String] as? Int) == pid && ($0[kCGWindowLayer as String] as? Int) == 0 }
print(String(data: try JSONSerialization.data(withJSONObject: windows), encoding: .utf8)!)
`, 'utf8');
  const windows = JSON.parse(run('swift', [swift, String(pid)]));
  await fs.writeFile(path.join(directory, 'windows.json'), JSON.stringify(windows, null, 2), 'utf8');
  assert.ok(windows.length, 'Installed macOS application must show a native window');
  let screenshot = false;
  try { run('screencapture', ['-x', path.join(directory, 'window.png')]); screenshot = true; } catch {}
  return { nativeWindowCount: windows.length, screenshotCaptured: screenshot };
}
