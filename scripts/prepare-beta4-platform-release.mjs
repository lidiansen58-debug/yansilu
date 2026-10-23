import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const repo = 'lidiansen58-debug/yansilu';
const source = '4e9e2db4120cc06430a8bfb7624f68a0e937d954';
const version = '0.1.1-beta.4';
const tag = 'beta4-mac-linux-ci-4e9e2db4-20261023';
const runId = process.env.BUILD_RUN_ID;
assert(/^\d+$/.test(runId || ''), 'Numeric build run required');
const api = route => JSON.parse(execFileSync('gh', ['api', `repos/${repo}/${route}`], { encoding: 'utf8' }));
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const receiptDir = path.resolve('platform-publication-receipt');
await fs.mkdir(receiptDir, { recursive: true });
const run = api(`actions/runs/${runId}`);
assert.equal(run.head_sha, source);
assert.equal(run.event, 'workflow_dispatch');
assert.equal(run.path, '.github/workflows/desktop-release.yml');
const jobs = api(`actions/runs/${runId}/jobs?per_page=100`).jobs;
const builds = ['build (ubuntu-24.04,', 'build (macos-latest,'].map(prefix => {
  const matches = jobs.filter(job => job.name.startsWith(prefix));
  assert.equal(matches.length, 1); assert.equal(matches[0].conclusion, 'success');
  const required = prefix.startsWith('build (macos')
    ? ['Import Apple Developer ID certificate', 'Build signed and notarized Universal macOS bundle', 'Stage final desktop assets', 'Upload desktop bundles']
    : ['Test Linux packaging regressions', 'Build desktop bundles', 'Stage final desktop assets', 'Upload desktop bundles'];
  for (const name of required) assert.equal(matches[0].steps.find(step => step.name === name)?.conclusion, 'success', `Required build step: ${name}`);
  return { id: matches[0].id, name: matches[0].name, conclusion: matches[0].conclusion };
});
const provenance = { sourceCommit: source, version, buildRunId: Number(runId), builds, releaseTag: tag };
await fs.writeFile(path.join(receiptDir, 'provenance.json'), JSON.stringify(provenance, null, 2));
if (process.argv[2] === 'provenance') { console.log(JSON.stringify(provenance)); process.exit(0); }
assert.equal(process.argv[2], 'draft');
const configResult = api(`contents/apps/desktop/src-tauri/tauri.conf.json?ref=${source}`);
const config = JSON.parse(Buffer.from(configResult.content, 'base64').toString('utf8'));
assert.equal(config.version, version);
const support = path.resolve('signature-support'); await fs.mkdir(support);
const publicKey = path.join(support, 'public-key.txt');
await fs.writeFile(publicKey, Buffer.from(config.plugins.updater.pubkey, 'base64'));
const output = path.resolve('platform-release-assets'); await fs.mkdir(output);
const records = [];
for (const platform of ['linux', 'macos']) {
  const directory = path.resolve('platform-bundles', platform);
  const manifest = JSON.parse(await fs.readFile(path.join(directory, 'bundle-manifest.json'), 'utf8'));
  assert.equal(manifest.items.length, manifest.totalFiles);
  const actual = [];
  async function walk(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      assert(!entry.isSymbolicLink()); const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full); else actual.push(path.relative(directory, full).split(path.sep).join('/'));
    }
  }
  await walk(directory);
  assert.deepEqual(actual.filter(file => !['bundle-manifest.json', 'bundle-manifest.md', 'bundle-manifest.sha256.txt'].includes(file)).sort(), manifest.items.map(item => item.file).sort());
  for (const item of manifest.items) {
    const filename = path.resolve(directory, item.file);
    assert(filename.startsWith(directory + path.sep));
    const bytes = await fs.readFile(filename);
    assert.equal(bytes.length, item.bytes); assert.equal(hash(bytes), item.sha256.toLowerCase());
    if (item.file.endsWith('.sig')) continue;
    const name = path.basename(item.file).replaceAll('研思录', 'yansilu');
    assert(!records.some(record => record.file === name));
    assert(platform === 'linux' ? /_0\.1\.1-beta\.4_amd64\.(AppImage|deb)$/.test(name) : /(_0\.1\.1-beta\.4_universal\.dmg|_universal\.app\.tar\.gz)$/.test(name));
    const signed = manifest.items.some(candidate => candidate.file === `${item.file}.sig`);
    assert(signed || name.endsWith('.deb'), 'Missing updater signature');
    if (signed) {
      const rawSignature = await fs.readFile(`${filename}.sig`, 'utf8');
      const decoded = path.join(support, `${name}.txt`);
      await fs.writeFile(decoded, Buffer.from(rawSignature.trim(), 'base64'));
      execFileSync('signature-verifier/target/debug/release-signature-verifier', [filename, decoded, publicKey], { stdio: 'inherit' });
      await fs.copyFile(`${filename}.sig`, path.join(output, `${name}.sig`));
      records.push({ file: `${name}.sig`, platform, bytes: Buffer.byteLength(rawSignature), sha256: hash(Buffer.from(rawSignature)), signature: true });
    }
    await fs.copyFile(filename, path.join(output, name));
    records.push({ file: name, platform, bytes: bytes.length, sha256: hash(bytes), updaterSignatureVerified: signed, byteFlipRejected: signed });
  }
}
assert.equal(records.filter(record => record.file.endsWith('.dmg')).length, 1);
assert.equal(records.filter(record => record.file.endsWith('.app.tar.gz')).length, 1);
assert.equal(records.filter(record => record.file.endsWith('.AppImage')).length, 1);
assert.equal(records.filter(record => record.file.endsWith('.deb')).length, 1);
const receipt = { ...provenance, verifiedAt: new Date().toISOString(), records, nativeMachineAcceptanceClaimed: false, updaterChannelsChanged: false, publicReleaseChanged: false };
await fs.writeFile(path.join(output, 'platform-bundle-manifest.json'), JSON.stringify(receipt, null, 2));
await fs.writeFile(path.join(output, 'SHA256SUMS.txt'), [...records.map(record => `${record.sha256}  ${record.file}`), `${hash(await fs.readFile(path.join(output, 'platform-bundle-manifest.json')))}  platform-bundle-manifest.json`].join('\n') + '\n');
const notes = `研思录 macOS / Linux ${version}。\n\nmacOS 为 Intel 与 Apple Silicon 共用的 Universal 包，已通过 Apple 签名、公证和装订检查；Linux 提供 x64 AppImage 与 DEB，CI 打包回归通过。\n\n本轮尚未完成 Mac/Linux 实机安装与主流程验收；保留 Beta 预发布及手动安装。Windows 包和既有自动更新入口保持原样。\n\n来源：${source}，构建：${run.html_url}。提供更新公钥签名及 SHA-256；DEB 提供 SHA-256。\n`;
await fs.writeFile(path.join(receiptDir, 'release-notes.md'), notes);
await fs.writeFile(path.join(receiptDir, 'verification.json'), JSON.stringify(receipt, null, 2));
execFileSync('gh', ['release', 'create', tag, '--repo', repo, '--target', source, '--draft', '--prerelease', '--latest=false', '--title', `macOS / Linux ${version}`, '--notes-file', path.join(receiptDir, 'release-notes.md')], { stdio: 'inherit' });
execFileSync('gh', ['release', 'upload', tag, '--repo', repo, ...(await fs.readdir(output)).map(file => path.join(output, file))], { stdio: 'inherit' });
console.log(JSON.stringify({ draftPrepared: true, tag, ...provenance }));
