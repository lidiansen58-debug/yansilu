import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { desktopBuildConfig } from "../../scripts/desktop-build-config.mjs";
import { verifyLinuxDebBundle } from "../../scripts/desktop-linux-bundle.mjs";

const source = JSON.parse(fs.readFileSync(new URL("../../apps/desktop/src-tauri/tauri.conf.json", import.meta.url), "utf8"));

for (const platform of ["linux", "win32", "darwin"]) {
  for (const updaterArtifacts of [true, false]) {
    test(`${platform} build preserves branding and identity, updater=${updaterArtifacts}`, () => {
      const original = structuredClone(source);
      const config = desktopBuildConfig(source, { platform, updaterArtifacts });
      assert.equal(config.productName, platform === "linux" ? "yansilu" : "研思录");
      assert.equal(config.identifier, source.identifier);
      assert.deepEqual(config.app, source.app);
      assert.deepEqual(config.plugins, source.plugins);
      assert.deepEqual(config.bundle.resources, source.bundle.resources);
      assert.equal(config.bundle.createUpdaterArtifacts, updaterArtifacts);
      if (platform === "linux") assert.equal(config.bundle.linux.deb.desktopTemplate, "linux/yansilu.desktop.hbs");
      assert.deepEqual(source, original);
    });
  }
}

test("Linux config preserves existing package dependencies and other Linux bundle settings", () => {
  const custom = structuredClone(source);
  custom.bundle.linux = { appimage: { bundleMediaFramework: true }, deb: { depends: ["libgtk-3-0"] } };
  const config = desktopBuildConfig(custom, { platform: "linux", updaterArtifacts: false });
  assert.deepEqual(config.bundle.linux.appimage, custom.bundle.linux.appimage);
  assert.deepEqual(config.bundle.linux.deb.depends, ["libgtk-3-0"]);
});

function fixtureCommand({ metadata = {}, omit = "", desktopEntry, nodeVersion = "v22.22.0" } = {}) {
  const fields = { Package: "yansilu", Version: source.version, Architecture: "amd64", ...metadata };
  const calls = [];
  let extracted = "";
  const runCommand = (command, args) => {
    calls.push({ command, args });
    if (command === "dpkg") return "";
    if (command === "dpkg-deb" && args[0] === "--field") return fields[args[2]];
    if (command === "dpkg-deb" && args[0] === "--extract") {
      extracted = args[2];
      const entries = {
        "usr/share/applications/yansilu.desktop": desktopEntry ?? "Name=研思录\nExec=yansilu-desktop\nIcon=yansilu-desktop\nType=Application\n",
        "usr/bin/yansilu-desktop": "binary",
        "usr/lib/yansilu/desktop-api-runtime/node/node": "node",
        "usr/lib/yansilu/desktop-api-runtime/apps/api/src/server.mjs": "server"
      };
      for (const [relative, content] of Object.entries(entries)) {
        if (relative === omit) continue;
        const file = path.join(extracted, relative);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, content);
      }
      return "";
    }
    return nodeVersion;
  };
  return { runCommand, calls, get extracted() { return extracted; } };
}

function verify(fixture) {
  return verifyLinuxDebBundle({ filePath: "test.deb", version: source.version, architecture: "amd64", runCommand: fixture.runCommand });
}

test("Debian verifier validates actual fields, branding, resource layout and embedded Node", () => {
  const fixture = fixtureCommand();
  verify(fixture);
  assert.ok(fixture.calls.some(call => call.command === "dpkg" && call.args[0] === "--validate-pkgname"));
  assert.ok(fixture.calls.some(call => call.command === "dpkg" && call.args[0] === "--validate-version"));
  assert.ok(fixture.calls.some(call => call.command.endsWith(`${path.sep}node`) && call.args[0] === "--version"));
  assert.equal(fs.existsSync(fixture.extracted), false);
});

for (const [field, value] of [["Package", "研思录"], ["Version", "0.1.1-beta.1"], ["Architecture", "arm64"]]) {
  test(`Debian verifier rejects wrong ${field} before extraction`, () => {
    const fixture = fixtureCommand({ metadata: { [field]: value } });
    assert.throws(() => verify(fixture), new RegExp(field));
    assert.equal(fixture.extracted, "");
  });
}

for (const options of [
  { omit: "usr/lib/yansilu/desktop-api-runtime/apps/api/src/server.mjs" },
  { desktopEntry: "Name=yansilu\nExec=yansilu-desktop\nIcon=yansilu-desktop\nType=Application\n" },
  { nodeVersion: "not executable" }
]) {
  test(`Debian verifier fails closed and cleans extraction: ${JSON.stringify(options)}`, () => {
    const fixture = fixtureCommand(options);
    assert.throws(() => verify(fixture));
    assert.equal(fs.existsSync(fixture.extracted), false);
    assert.ok(fixture.extracted.startsWith(path.join(os.tmpdir(), "yansilu-deb-check-")));
  });
}

test("all desktop build workflows run Linux packaging regressions before packaging", () => {
  for (const workflow of ["desktop-bundles.yml", "desktop-release.yml", "release-readiness.yml"]) {
    const text = fs.readFileSync(new URL(`../../.github/workflows/${workflow}`, import.meta.url), "utf8");
    const check = text.indexOf("- name: Test Linux packaging regressions");
    assert.ok(check >= 0 && check < text.indexOf("- name: Build desktop bundles"));
    assert.match(text, /if: runner\.os == 'Linux'\r?\n\s+run: node --test tests\/unit\/desktop-linux-bundle\.test\.mjs tests\/integration\/linux-deb-package\.test\.mjs/);
  }
  const build = fs.readFileSync(new URL("../../scripts/build-desktop.mjs", import.meta.url), "utf8");
  assert.ok(build.indexOf("verifyLinuxDebBundle({") < build.indexOf('"./scripts/desktop-bundle-manifest.mjs"'));
  assert.match(build, /desktopBuildConfig\(/);
});
