import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { captureNativeSmokeWindow } from './platform-install-smoke-window.mjs';

assert.ok(['darwin', 'linux'].includes(process.platform), 'Run on a target macOS/Linux runner');
assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Installation smoke requires an isolated GitHub runner');
const bundles = path.resolve('platform-smoke-bundles');
const output = path.resolve('platform-install-smoke');
const provenance = JSON.parse(await fs.readFile('platform-publication-receipt/provenance.json', 'utf8'));
const manifest = JSON.parse(await fs.readFile(path.join(bundles, 'bundle-manifest.json'), 'utf8'));
await fs.mkdir(output, { recursive: true });
const receipt = { ...provenance, platform: process.platform, arch: process.arch, smokeRunId: process.env.GITHUB_RUN_ID, status: 'running', checks: [] };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function run(command, args, options = {}) {
  return execFileSync(command, args, { encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024, ...options }).trim();
}
async function packageFile(extension) {
  const items = manifest.items.filter(item => item.file.endsWith(extension));
  assert.equal(items.length, 1, `One ${extension} package required`);
  const item = items[0], filename = path.resolve(bundles, item.file);
  assert.ok(filename.startsWith(bundles + path.sep));
  const bytes = await fs.readFile(filename);
  assert.equal(bytes.length, item.bytes);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), item.sha256.toLowerCase());
  return { filename, asset: path.basename(filename).replaceAll('研思录', 'yansilu'), bytes: item.bytes, sha256: item.sha256.toLowerCase() };
}
async function waitForHealth(child, home) {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    assert.ok(!receipt.launchError, receipt.launchError || 'Native spawn must succeed');
    assert.equal(child.exitCode, null, 'Native application exited during startup');
    assert.equal(child.signalCode, null, 'Native application crashed during startup');
    for (let port = 3000; port <= 3020; port++) {
      try {
        const base = `http://127.0.0.1:${port}`;
        const response = await fetch(base + '/api/v1/health', { signal: AbortSignal.timeout(250) });
        const health = await response.json();
        if (health.app !== 'yansilu' || !health.ready) continue;
        assert.ok(path.resolve(health.vaultPath).startsWith(home + path.sep), 'Packaged API must use the isolated HOME');
        assert.equal(health.version, provenance.version);
        return { base, pid: health.pid, vaultPath: health.vaultPath, version: health.version };
      } catch (error) { if (error instanceof assert.AssertionError) throw error; }
    }
    await sleep(200);
  }
  throw new Error('Packaged API did not become ready');
}
async function launch(executable, args, home, directory) {
  await fs.mkdir(directory, { recursive: true });
  const log = await fs.open(path.join(directory, 'native.log'), 'a');
  const env = {
    ...process.env, HOME: home, XDG_DATA_HOME: path.join(home, '.local/share'),
    XDG_CONFIG_HOME: path.join(home, '.config'), XDG_CACHE_HOME: path.join(home, '.cache')
  };
  delete env.GH_TOKEN;
  delete env.GITHUB_TOKEN;
  if (process.platform === 'linux') {
    env.LIBGL_ALWAYS_SOFTWARE = '1';
    env.WEBKIT_DISABLE_DMABUF_RENDERER = '1';
  }
  const child = spawn(executable, args, { detached: true, stdio: ['ignore', log.fd, log.fd], env });
  child.on('error', error => { receipt.launchError = error.message; });
  await log.close();
  let health;
  const collectApiLog = async () => {
    const data = process.platform === 'darwin'
      ? path.join(home, 'Library/Application Support/com.notesprout.yansilu')
      : path.join(home, '.local/share/com.notesprout.yansilu');
    await fs.copyFile(path.join(data, 'api.log'), path.join(directory, 'api.log')).catch(() => {});
  };
  const stop = async () => {
    try {
      try { process.kill(-child.pid, 'SIGTERM'); } catch {}
      for (let i = 0; i < 50 && child.exitCode === null && child.signalCode === null; i++) await sleep(100);
      if (child.exitCode === null && child.signalCode === null) { try { process.kill(-child.pid, 'SIGKILL'); } catch {} }
      if (health?.pid) {
        for (let i = 0; i < 50; i++) { try { process.kill(health.pid, 0); } catch { return; } await sleep(100); }
        throw new Error('Packaged process group was not cleaned up');
      }
    } finally { await collectApiLog(); }
  };
  try {
    health = await waitForHealth(child, home);
    const window = await captureNativeSmokeWindow(child.pid, directory, run);
    return { health, window, stop };
  } catch (error) { await stop(); throw error; }
}
async function exercise(kind, pkg, executable, args = []) {
  const directory = path.join(output, kind);
  await fs.mkdir(directory, { recursive: true });
  const home = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), `yansilu-${kind}-home-`)));
  const first = await launch(executable, args, home, path.join(directory, 'first'));
  let note;
  const body = '# 安装启动验收\n\n保留原生安装包中的本地记录。\n';
  try {
    const created = await fetch(first.health.base + '/api/v1/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ directoryId: 'dir_fleeting_default', title: '安装启动验收', body }) });
    assert.equal(created.status, 201);
    note = (await created.json()).item;
    const saved = await fs.readFile(path.join(first.health.vaultPath, note.markdownPath), 'utf8');
    assert.ok(saved.includes('保留原生安装包中的本地记录。'));
  } finally { await first.stop(); }
  const reopened = await launch(executable, args, home, path.join(directory, 'reopened'));
  try {
    const response = await fetch(reopened.health.base + '/api/v1/notes/' + note.id);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).item.body, body);
    receipt.checks.push({ kind, ...pkg, installedExecutable: executable, nativeWindow: reopened.window, backendVersion: reopened.health.version, freshVault: true, stopMethod: 'SIGTERM process group', savedNoteReopened: true, status: 'passed' });
  } finally { await reopened.stop(); }
}
try {
  if (process.platform === 'darwin') {
    const pkg = await packageFile('.dmg');
    const mount = await fs.mkdtemp(path.join(os.tmpdir(), 'yansilu-dmg-mount-'));
    const installed = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'yansilu-installed-applications-')));
    let app;
    run('hdiutil', ['attach', pkg.filename, '-readonly', '-nobrowse', '-mountpoint', mount]);
    try {
      const apps = (await fs.readdir(mount)).filter(name => name.endsWith('.app'));
      assert.equal(apps.length, 1);
      app = path.join(installed, apps[0]);
      run('ditto', [path.join(mount, apps[0]), app]);
    } finally { run('hdiutil', ['detach', mount]); }
    run('codesign', ['--verify', '--deep', '--strict', '--verbose=2', app]);
    run('xcrun', ['stapler', 'validate', app]);
    const binary = run('plutil', ['-extract', 'CFBundleExecutable', 'raw', '-o', '-', path.join(app, 'Contents/Info.plist')]);
    await exercise('dmg', pkg, path.join(app, 'Contents/MacOS', binary));
  } else {
    const deb = await packageFile('.deb');
    run('sudo', ['apt-get', 'install', '-y', deb.filename]);
    assert.equal(run('dpkg-query', ['-W', '-f=${Version}', 'yansilu']), provenance.version);
    await exercise('deb', deb, '/usr/bin/yansilu-desktop');
    const appimage = await packageFile('.AppImage');
    await fs.chmod(appimage.filename, 0o755);
    await exercise('appimage', appimage, appimage.filename, ['--appimage-extract-and-run']);
  }
  receipt.status = 'passed';
} catch (error) { receipt.status = 'failed'; receipt.error = error.stack; throw error; }
finally { await fs.writeFile(path.join(output, 'receipt.json'), JSON.stringify(receipt, null, 2), 'utf8'); console.log(JSON.stringify(receipt)); }
