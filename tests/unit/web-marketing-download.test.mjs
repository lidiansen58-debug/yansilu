import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { detectDownloadPlatform, downloadChoices, downloadVersionText, recommendedDownload, versionForDownload } from "../../apps/web/src/marketing-download-model.js";

test("published marketing manifest pins each platform's actual version and release asset", async () => {
  const manifest = JSON.parse(await readFile(new URL("../../apps/web/src/marketing-download-manifest.json", import.meta.url), "utf8"));
  assert.equal(manifest.ok, true);
  assert.equal(manifest.item.bundleReady, true);
  assert.equal(manifest.item.totalFiles, manifest.item.items.length);
  assert.equal(manifest.item.items.length, 4);
  assert.match(manifest.item.notice, /Beta.*手动安装/);
  const choices = downloadChoices(manifest.item.items);
  assert.equal(choices.length, manifest.item.items.length);
  assert.equal(new Set(choices.map(choice => choice.key)).size, 3);
  assert.equal(recommendedDownload(choices, "windows").architecture, "x64");
  assert.equal(recommendedDownload(choices, "macos").architecture, "universal");
  assert.equal(recommendedDownload(choices, "linux").format, "AppImage");
  assert.equal(recommendedDownload(choices, "linux").architecture, "x64");
  assert.ok(choices.some(choice => choice.key === "linux" && choice.format === "deb" && choice.architecture === "x64"));
  for (const item of manifest.item.items) {
    assert.ok(item.file.includes(item.version || manifest.item.version));
    assert.ok(item.bytes > 0);
    assert.match(item.sha256, /^[a-f0-9]{64}$/);
    assert.notEqual(item.sha256, "85766d3c1b14d7fba7463aa0cbf1d36f279c10423f01754517a0e8eff62f4e92", "The CI DEB with an invalid package name must not be published");
    assert.equal(item.downloadUrl, `https://github.com/lidiansen58-debug/yansilu/releases/download/${item.releaseTag || manifest.item.releaseTag}/${item.file}`);
  }
});

test("download versions use explicit platform metadata, then the asset filename, then the legacy version", () => {
  assert.equal(versionForDownload({ version: "0.1.1-beta.3", file: "installer.dmg" }, "0.1.1-beta.4"), "0.1.1-beta.3");
  assert.equal(versionForDownload({ file: "yansilu_0.1.1-beta.3_universal.dmg" }, "0.1.1-beta.4"), "0.1.1-beta.3");
  assert.equal(versionForDownload({ file: "installer.exe" }, "0.1.1-beta.4"), "0.1.1-beta.4");
  assert.equal(downloadVersionText([], "unknown"), "来自已发布版本");
  const choices = downloadChoices([
    { file: "yansilu_0.1.1-beta.4_x64-setup.exe", version: "0.1.1-beta.4", downloadUrl: "/windows.exe" },
    { file: "yansilu_0.1.1-beta.3_universal.dmg", version: "0.1.1-beta.3", downloadUrl: "/mac.dmg" },
    { file: "yansilu_0.1.1-beta.3_amd64.AppImage", version: "0.1.1-beta.3", downloadUrl: "/linux.AppImage" }
  ]);
  assert.equal(downloadVersionText(choices, "windows", "0.1.1-beta.4"), "当前版本 0.1.1-beta.4");
  assert.equal(downloadVersionText(choices, "macos", "0.1.1-beta.4"), "当前版本 0.1.1-beta.3");
  assert.equal(downloadVersionText(choices, "mobile", "0.1.1-beta.4"), "Windows 0.1.1-beta.4 · macOS 0.1.1-beta.3 · Linux 0.1.1-beta.3");
});

function createDocument() {
  const container = {
    children: [],
    replaceChildren(...children) {
      this.children = children;
    },
    appendChild(child) {
      this.children.push(child);
    }
  };
  const otherContainer = { ...container, children: [] };
  const options = { hidden: true, open: false };
  return {
    container,
    otherContainer,
    options,
    document: {
      querySelector(selector) {
        if (selector === "[data-download-buttons]") return container;
        if (selector === "[data-download-other-buttons]") return otherContainer;
        if (selector === "[data-download-other-options]") return options;
        return null;
      },
      createElement() {
        return { className: "", href: "", textContent: "" };
      }
    }
  };
}

function createDownloadPageDocument() {
  const fixture = createDocument();
  const status = { dataset: {}, textContent: "" };
  const note = { textContent: "" };
  const releaseNote = { textContent: "", hidden: true };
  fixture.document.querySelector = (selector) => {
    if (selector === "[data-download-buttons]") return fixture.container;
    if (selector === "[data-download-other-buttons]") return fixture.otherContainer;
    if (selector === "[data-download-other-options]") return fixture.options;
    if (selector === "[data-download-status]") return status;
    if (selector === "[data-download-primary-note]") return note;
    if (selector === "[data-download-release-note]") return releaseNote;
    return null;
  };
  return { ...fixture, status, note, releaseNote };
}

test("a Windows-only new release keeps older Mac and Linux installers when the primary manifest is unavailable", async () => {
  const originalDocument = globalThis.document, originalFetch = globalThis.fetch;
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  globalThis.document = createDocument().document;
  const releases = [
    { tag_name: "v0.1.1-beta.4", draft: false, prerelease: true, assets: [
      { name: "yansilu_0.1.1-beta.4_x64-setup.exe", browser_download_url: "/beta4/windows.exe" }
    ] },
    { tag_name: "beta3-mac-ci-f41c0627-20261019", draft: false, prerelease: true, assets: [
      { name: "yansilu_0.1.1-beta.3_x64-setup.exe", browser_download_url: "/beta3/windows.exe" },
      { name: "yansilu_0.1.1-beta.3_universal.dmg", browser_download_url: "/beta3/mac.dmg" },
      { name: "yansilu_0.1.1-beta.3_amd64.AppImage", browser_download_url: "/beta3/linux.AppImage" },
      { name: "yansilu_0.1.1-beta.3_amd64.deb", browser_download_url: "/beta3/linux.deb" }
    ] }
  ];
  try {
    const module = await import(`../../apps/web/src/marketing-download.js?retained-platform-fallback=${Date.now()}`);
    globalThis.fetch = async url => {
      if (url.endsWith("/api/download-manifest")) throw new Error("Primary manifest unavailable");
      const count = Number(new URL(url).searchParams.get("per_page") || 1);
      return { ok: true, json: async () => releases.slice(0, count) };
    };
    for (const [platform, href, version] of [["MacIntel", "/beta3/mac.dmg", "0.1.1-beta.3"], ["Linux x86_64", "/beta3/linux.AppImage", "0.1.1-beta.3"], ["Win32", "/beta4/windows.exe", "0.1.1-beta.4"]]) {
      const fixture = createDownloadPageDocument(); globalThis.document = fixture.document;
      Object.defineProperty(globalThis, "navigator", { configurable: true, value: { platform } });
      await module.initDownloadPage();
      assert.equal(fixture.container.children[0].href, href, `${platform} must retain its own latest available installer`);
      assert.match(fixture.note.textContent, new RegExp(`当前版本 ${version.replaceAll(".", "\\.")}`));
      assert.doesNotMatch(fixture.note.textContent, platform === "Win32" ? /beta\.3/ : /beta\.4/);
      assert.match(fixture.releaseNote.textContent, /Beta/);
      const links = [...fixture.container.children, ...fixture.otherContainer.children].map(item => item.href);
      assert.equal(links.includes("/beta3/windows.exe"), false, "fallback must not downgrade Windows while retaining other platforms");
      assert.equal(links.includes("/beta3/linux.deb"), true);
    }
  } finally {
    globalThis.document = originalDocument; globalThis.fetch = originalFetch;
    if (navigatorDescriptor) Object.defineProperty(globalThis, "navigator", navigatorDescriptor);
    else delete globalThis.navigator;
  }
});

test("Windows can advance while pinned Mac and Linux downloads keep their actual versions without GitHub access", async () => {
  const originalDocument = globalThis.document, originalFetch = globalThis.fetch;
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  globalThis.document = createDocument().document;
  const mixed = { version: "0.1.1-beta.4", releaseTag: "windows-beta4-test", bundleReady: true,
    notice: "Beta 测试版。", platformNotices: { windows: "Windows beta.4", macos: "Mac beta.3 保留已验收版本。", linux: "Linux beta.3 需手动安装。" }, items: [
      { file: "yansilu_0.1.1-beta.4_x64-setup.exe", version: "0.1.1-beta.4", releaseTag: "windows-beta4-test", downloadUrl: "/verified-windows-beta4.exe" },
      { file: "yansilu_0.1.1-beta.3_universal.dmg", version: "0.1.1-beta.3", releaseTag: "verified-mac-beta3", downloadUrl: "/verified-mac-beta3.dmg" },
      { file: "yansilu_0.1.1-beta.3_amd64.AppImage", version: "0.1.1-beta.3", releaseTag: "retained-linux-beta3", downloadUrl: "/retained-linux-beta3.AppImage" }
    ] };
  try {
    const module = await import(`../../apps/web/src/marketing-download.js?platform-versions=${Date.now()}`);
    const requests = [];
    globalThis.fetch = async url => {
      requests.push(url);
      if (url.endsWith("/api/download-manifest")) return { ok: true, json: async () => ({ item: mixed }) };
      assert.match(url, /releases\/tags\/windows-beta4-test$/);
      throw new Error("GitHub unavailable");
    };
    for (const [platform, href, version] of [["Win32", "/verified-windows-beta4.exe", "0.1.1-beta.4"], ["MacIntel", "/verified-mac-beta3.dmg", "0.1.1-beta.3"], ["Linux x86_64", "/retained-linux-beta3.AppImage", "0.1.1-beta.3"]]) {
      const fixture = createDownloadPageDocument(); globalThis.document = fixture.document;
      Object.defineProperty(globalThis, "navigator", { configurable: true, value: { platform } });
      await module.initDownloadPage();
      assert.equal(fixture.container.children[0].href, href);
      assert.match(fixture.note.textContent, new RegExp(`当前版本 ${version.replaceAll(".", "\\.")}`));
      if (platform !== "Win32") assert.doesNotMatch(fixture.note.textContent, /beta\.4/);
      assert.equal(fixture.releaseNote.textContent, mixed.platformNotices[platform === "Win32" ? "windows" : platform === "MacIntel" ? "macos" : "linux"]);
    }
    const fixture = createDownloadPageDocument(); globalThis.document = fixture.document;
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: { userAgent: "iPhone" } });
    await module.initDownloadPage();
    assert.equal(fixture.note.textContent, "Windows 0.1.1-beta.4 · macOS 0.1.1-beta.3 · Linux 0.1.1-beta.3");
    assert.equal(requests.filter(url => url.endsWith("/api/download-manifest")).length, 4);
  } finally {
    globalThis.document = originalDocument; globalThis.fetch = originalFetch;
    if (navigatorDescriptor) Object.defineProperty(globalThis, "navigator", navigatorDescriptor);
    else delete globalThis.navigator;
  }
});

test("download buttons expose Windows and macOS installers from one release manifest", async () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const fixture = createDocument();
  globalThis.document = fixture.document;
  globalThis.window = { location: { origin: "https://yansilu.example" } };

  try {
    const module = await import(`../../apps/web/src/marketing-download.js?test=${Date.now()}`);
    assert.deepEqual(module.platformForFile({ file: "Yansilu_x64-setup.exe" }), {
      key: "windows",
      architecture: "x64",
      format: "exe",
      label: "下载 Windows 版（x64）"
    });
    assert.deepEqual(module.platformForFile({ file: "yansilu_0.1.1-beta.1_x64-setup.dmg" }), {
      key: "macos",
      architecture: "x64",
      format: "dmg",
      label: "下载 macOS 版（Intel）"
    });

    module.renderDownloadButtons([
      { file: "Yansilu_x64-setup.exe", downloadUrl: "/downloads/windows.exe" },
      { file: "yansilu_0.1.1-beta.1_x64-setup.dmg", downloadUrl: "/downloads/macos.dmg" },
      { file: "yansilu_0.1.1-beta.1_x64-setup.dmg.sig", downloadUrl: "/downloads/macos.dmg.sig" }
    ], { platform: "unknown" });

    assert.deepEqual(
      fixture.container.children.map((item) => [item.textContent, item.href]),
      [
        ["下载 Windows 版（x64）", "/downloads/windows.exe"],
        ["下载 macOS 版（Intel）", "/downloads/macos.dmg"]
      ]
    );
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  }
});

test("download buttons keep an official-release fallback when the manifest is unavailable", async () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const fixture = createDocument();
  globalThis.document = fixture.document;
  globalThis.window = { location: { origin: "https://yansilu.example" } };

  try {
    const module = await import(`../../apps/web/src/marketing-download.js?fallback=${Date.now()}`);
    module.renderDownloadButtons([], { fallback: true });
    assert.deepEqual(
      fixture.container.children.map((item) => [item.textContent, item.href]),
      [["前往官方下载页", "https://github.com/lidiansen58-debug/yansilu/releases"]]
    );
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  }
});

test("download page falls back to the official release when its manifest request fails", async () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const bootstrap = createDocument();
  globalThis.document = bootstrap.document;
  globalThis.window = { location: { origin: "https://yansilu.example" } };

  try {
    const module = await import(`../../apps/web/src/marketing-download.js?network-failure=${Date.now()}`);
    const fixture = createDownloadPageDocument();
    globalThis.document = fixture.document;
    globalThis.fetch = async () => {
      throw new Error("offline");
    };

    await module.initDownloadPage();

    assert.match(fixture.status.textContent, /官方下载页/);
    assert.equal(fixture.note.textContent, "GitHub Release 提供全部已发布版本。");
    assert.deepEqual(
      fixture.container.children.map((item) => [item.textContent, item.href]),
      [["前往官方下载页", "https://github.com/lidiansen58-debug/yansilu/releases"]]
    );
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
  }
});

test("download page falls back when a ready manifest has no installer", async () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const bootstrap = createDocument();
  globalThis.document = bootstrap.document;
  globalThis.window = { location: { origin: "https://yansilu.example" } };

  try {
    const module = await import(`../../apps/web/src/marketing-download.js?no-installer=${Date.now()}`);
    const fixture = createDownloadPageDocument();
    globalThis.document = fixture.document;
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ item: { bundleReady: true, version: "0.1.1-beta.1", items: [{ file: "setup.exe.sig" }] } })
    });

    await module.initDownloadPage();

    assert.match(fixture.status.textContent, /官方下载页/);
    assert.equal(fixture.note.textContent, "GitHub Release 提供全部已发布版本。");
    assert.deepEqual(
      fixture.container.children.map((item) => [item.textContent, item.href]),
      [["前往官方下载页", "https://github.com/lidiansen58-debug/yansilu/releases"]]
    );
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
  }
});

test("download page combines local Windows and matching GitHub macOS installers", async () => {
  const originalDocument = globalThis.document;
  const originalFetch = globalThis.fetch;
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");

  try {
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: { platform: "Win32" } });
    const bootstrap = createDocument();
    globalThis.document = bootstrap.document;
    const module = await import(`../../apps/web/src/marketing-download.js?combined=${Date.now()}`);
    const fixture = createDownloadPageDocument();
    globalThis.document = fixture.document;

    globalThis.fetch = async (url) => {
      if (url.endsWith("/api/download-manifest")) {
        return {
          ok: true,
          json: async () => ({
            item: {
              bundleReady: true,
              version: "0.1.1-beta.1",
              items: [{ file: "yansilu_0.1.1-beta.1_x64-setup.exe", downloadUrl: "/downloads/windows.exe" }]
            }
          })
        };
      }

      assert.match(url, /releases\/tags\/v0\.1\.1-beta\.1$/);
      return {
        ok: true,
        json: async () => ({
          assets: [{
            name: "yansilu_0.1.1-beta.1_x64-setup.dmg",
            browser_download_url: "https://github.com/lidiansen58-debug/yansilu/releases/download/v0.1.1-beta.1/yansilu_0.1.1-beta.1_x64-setup.dmg"
          }]
        })
      };
    };

    await module.initDownloadPage();

    assert.equal(fixture.status.textContent, "推荐下载：");
    assert.equal(fixture.container.children.length, 1);
    assert.equal(fixture.options.hidden, false);
    assert.deepEqual(
      [...fixture.container.children, ...fixture.otherContainer.children].map((button) => ({ text: button.textContent, href: button.href })),
      [
        { text: "下载 Windows 版（x64）", href: "/downloads/windows.exe" },
        {
          text: "下载 macOS 版（Intel）",
          href: "https://github.com/lidiansen58-debug/yansilu/releases/download/v0.1.1-beta.1/yansilu_0.1.1-beta.1_x64-setup.dmg"
        }
      ]
    );
  } finally {
    globalThis.document = originalDocument;
    globalThis.fetch = originalFetch;
    if (navigatorDescriptor) Object.defineProperty(globalThis, "navigator", navigatorDescriptor);
    else delete globalThis.navigator;
  }
});

const installers = [
  { file: "yansilu_x64-setup.exe", downloadUrl: "/windows.exe" },
  { file: "yansilu_x64.dmg", downloadUrl: "/intel.dmg" },
  { file: "yansilu_aarch64.dmg", downloadUrl: "/arm.dmg" },
  { file: "yansilu_universal.dmg", downloadUrl: "/universal.dmg" },
  { file: "yansilu_amd64.AppImage", downloadUrl: "/linux.AppImage" },
  { file: "yansilu_amd64.deb", downloadUrl: "/linux.deb" }
];

test("platform detection distinguishes desktop systems without treating mobile devices as desktop", () => {
  assert.equal(detectDownloadPlatform({ userAgentData: { platform: "Windows" } }), "windows");
  assert.equal(detectDownloadPlatform({ platform: "MacIntel" }), "macos");
  assert.equal(detectDownloadPlatform({ platform: "Linux x86_64" }), "linux");
  assert.equal(detectDownloadPlatform({ userAgent: "Android", platform: "Linux armv8l" }), "mobile");
  assert.equal(detectDownloadPlatform({ userAgent: "iPhone", platform: "MacIntel" }), "mobile");
  assert.equal(detectDownloadPlatform({ platform: "MacIntel", maxTouchPoints: 5 }), "mobile");
  assert.equal(detectDownloadPlatform({}), "unknown");
});

test("Universal Mac installer takes priority independently of asset order", () => {
  for (const items of [installers, [...installers].reverse()]) {
    const choices = downloadChoices(items);
    assert.deepEqual(choices.filter(choice => choice.key === "macos").map(choice => choice.item.downloadUrl), ["/universal.dmg"]);
    assert.equal(recommendedDownload(choices, "macos").item.downloadUrl, "/universal.dmg");
    assert.equal(recommendedDownload(choices, "windows").item.downloadUrl, "/windows.exe");
    assert.equal(recommendedDownload(choices, "linux").item.downloadUrl, "/linux.AppImage");
    assert.equal(recommendedDownload(choices, "mobile"), undefined);
  }
});

test("single-architecture Mac installers are never recommended as Universal", () => {
  const choices = downloadChoices(installers.filter(item => !item.file.includes("universal")));
  assert.equal(choices.filter(choice => choice.key === "macos").length, 2);
  assert.equal(recommendedDownload(choices, "macos"), undefined);
  assert.equal(downloadChoices([{ file: "macos.dmg", downloadUrl: "/unknown.dmg" }])[0].architecture, "unknown");
  assert.equal(downloadChoices([{ file: "universal.dmg.sig", downloadUrl: "/sig" }]).length, 0);
});

test("Windows prefers EXE to MSI and keeps architecture choices separate", () => {
  const choices = downloadChoices([
    { file: "app_x64.msi", downloadUrl: "/windows.msi" },
    installers[0], { file: "app_arm64.exe", downloadUrl: "/arm.exe" }
  ]);
  assert.equal(choices.length, 2);
  assert.equal(recommendedDownload(choices, "windows").item.downloadUrl, "/windows.exe");
});

test("one recommended button and other-version choices render for each desktop system", async () => {
  const originalDocument = globalThis.document;
  const fixture = createDocument();
  globalThis.document = fixture.document;
  try {
    const module = await import(`../../apps/web/src/marketing-download.js?recommendation=${Date.now()}`);
    for (const [platform, href] of [["windows", "/windows.exe"], ["macos", "/universal.dmg"], ["linux", "/linux.AppImage"]]) {
      module.renderDownloadButtons(installers, { platform });
      assert.deepEqual(fixture.container.children.map(item => item.href), [href]);
      assert.equal(fixture.options.hidden, false);
      assert.equal(fixture.otherContainer.children.length, 3);
      assert.ok(fixture.otherContainer.children.every(item => item.className === "btn btn-secondary"));
    }
    module.renderDownloadButtons(installers, { platform: "mobile" });
    assert.equal(fixture.container.children.length, 2);
    assert.equal(fixture.options.hidden, false);
    assert.equal(fixture.otherContainer.children.length, 2);
    module.renderDownloadButtons([], { fallback: true });
    assert.equal(fixture.options.hidden, true);
    assert.equal(fixture.container.children.length, 1);
  } finally { globalThis.document = originalDocument; }
});

test("unpublished configured version falls back to a real published release and its version", async () => {
  const originalDocument = globalThis.document;
  const originalFetch = globalThis.fetch;
  globalThis.document = createDocument().document;
  try {
    const module = await import(`../../apps/web/src/marketing-download.js?published-fallback=${Date.now()}`);
    const fixture = createDownloadPageDocument();
    globalThis.document = fixture.document;
    const calls = [];
    globalThis.fetch = async url => {
      calls.push(url);
      if (url.endsWith("/api/download-manifest")) return { ok: true, json: async () => ({ item: { version: "0.1.1-beta.2", bundleReady: false } }) };
      if (url.includes("/tags/")) return { ok: false };
      return { ok: true, json: async () => [{ tag_name: "v0.1.1-beta.1", assets: [{ name: installers[0].file, browser_download_url: "/published.exe" }] }] };
    };
    await module.initDownloadPage();
    assert.equal(calls.length, 3);
    assert.equal(fixture.container.children[0].href, "/published.exe");
    assert.equal(fixture.note.textContent, "当前版本 0.1.1-beta.1");
  } finally { globalThis.document = originalDocument; globalThis.fetch = originalFetch; }
});

test("a local ready version never combines installers from an older release", async () => {
  const originalDocument = globalThis.document;
  const originalFetch = globalThis.fetch;
  globalThis.document = createDocument().document;
  try {
    const module = await import(`../../apps/web/src/marketing-download.js?no-mixed-version=${Date.now()}`);
    const fixture = createDownloadPageDocument();
    globalThis.document = fixture.document;
    globalThis.fetch = async url => {
      if (url.endsWith("/api/download-manifest")) return { ok: true, json: async () => ({ item: { version: "0.1.1-beta.2", bundleReady: true, items: [installers[0]] } }) };
      assert.match(url, /tags\/v0\.1\.1-beta\.2$/);
      return { ok: false };
    };
    await module.initDownloadPage();
    assert.equal(fixture.container.children.length, 1);
    assert.equal(fixture.otherContainer.children.length, 0);
    assert.equal(fixture.note.textContent, "当前版本 0.1.1-beta.2");
  } finally { globalThis.document = originalDocument; globalThis.fetch = originalFetch; }
});

test("pinned candidate downloads and warning work without GitHub API access", async () => {
  const originalDocument = globalThis.document;
  const originalFetch = globalThis.fetch;
  globalThis.document = createDocument().document;
  try {
    const module = await import(`../../apps/web/src/marketing-download.js?pinned=${Date.now()}`);
    const fixture = createDownloadPageDocument();
    globalThis.document = fixture.document;
    const notice = "Beta candidate, manual installation";
    globalThis.fetch = async url => {
      if (url.endsWith("/api/download-manifest")) return { ok: true, json: async () => ({ item: {
        version: "0.1.1-beta.2", releaseTag: "beta2-ci-pr226-20261007", bundleReady: true,
        notice, items: [installers[0], installers[3]]
      } }) };
      assert.match(url, /tags\/beta2-ci-pr226-20261007$/);
      throw new Error("GitHub API unavailable");
    };
    await module.initDownloadPage();
    assert.equal(fixture.releaseNote.textContent, notice);
    assert.equal(fixture.releaseNote.hidden, false);
    assert.equal(fixture.note.textContent.includes("0.1.1-beta.2"), true);
    assert.deepEqual([...fixture.container.children, ...fixture.otherContainer.children].map(item => item.href).sort(), ["/universal.dmg", "/windows.exe"]);

    globalThis.fetch = async () => { throw new Error("offline"); };
    await module.initDownloadPage();
    assert.equal(fixture.releaseNote.hidden, true);
    assert.equal(fixture.releaseNote.textContent, "");
  } finally { globalThis.document = originalDocument; globalThis.fetch = originalFetch; }
});

test("GitHub prerelease fallback retains a Beta warning and actual installer version", async () => {
  const originalDocument = globalThis.document;
  const originalFetch = globalThis.fetch;
  globalThis.document = createDocument().document;
  try {
    const module = await import(`../../apps/web/src/marketing-download.js?prerelease=${Date.now()}`);
    const fixture = createDownloadPageDocument();
    globalThis.document = fixture.document;
    globalThis.fetch = async url => {
      if (url.endsWith("/api/download-manifest")) throw new Error("Manifest unavailable");
      return { ok: true, json: async () => [{
        tag_name: "beta2-ci-pr226-20261007", prerelease: true,
        assets: [{ name: "yansilu_0.1.1-beta.2_universal.dmg", browser_download_url: "/universal.dmg" }]
      }] };
    };
    await module.initDownloadPage();
    assert.equal(fixture.releaseNote.hidden, false);
    assert.match(fixture.releaseNote.textContent, /Beta.*手动安装/);
    assert.equal(fixture.container.children[0].href, "/universal.dmg");
    assert.match(fixture.note.textContent, /当前版本 0\.1\.1-beta\.2/);
    assert.doesNotMatch(fixture.note.textContent, /beta2-ci-pr226/);
  } finally { globalThis.document = originalDocument; globalThis.fetch = originalFetch; }
});

for (const filenames of [
  ["yansilu_universal.dmg"],
  ["yansilu_0.1.1-beta.1_x64-setup.exe", "yansilu_0.1.1-beta.2_universal.dmg"]
]) {
  test(`GitHub fallback does not invent a version for ${filenames.join(", ")}`, async () => {
    const originalDocument = globalThis.document;
    const originalFetch = globalThis.fetch;
    const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    globalThis.document = createDocument().document;
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: {} });
    try {
      const module = await import(`../../apps/web/src/marketing-download.js?unknown-version=${Date.now()}-${filenames.length}`);
      const fixture = createDownloadPageDocument();
      globalThis.document = fixture.document;
      globalThis.fetch = async url => {
        if (url.endsWith("/api/download-manifest")) throw new Error("Manifest unavailable");
        return { ok: true, json: async () => [{
          tag_name: "beta2-ci-pr226-20261007", prerelease: true,
          assets: filenames.map(name => ({ name, browser_download_url: `/download/${name}` }))
        }] };
      };
      await module.initDownloadPage();
      if (filenames.length === 1) assert.equal(fixture.note.textContent, "来自已发布版本");
      else assert.equal(fixture.note.textContent, "Windows 0.1.1-beta.1 · macOS 0.1.1-beta.2");
      assert.doesNotMatch(fixture.note.textContent, /beta2-ci-pr226/);
      assert.equal(fixture.releaseNote.hidden, false);
    } finally {
      globalThis.document = originalDocument; globalThis.fetch = originalFetch;
      if (navigatorDescriptor) Object.defineProperty(globalThis, "navigator", navigatorDescriptor);
      else delete globalThis.navigator;
    }
  });
}

test("pinned download warnings match the visitor platform", async () => {
  const originalDocument = globalThis.document;
  const originalFetch = globalThis.fetch;
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  globalThis.document = createDocument().document;
  try {
    const module = await import(`../../apps/web/src/marketing-download.js?platform-warning=${Date.now()}`);
    const manifest = JSON.parse(await readFile(new URL("../../apps/web/src/marketing-download-manifest.json", import.meta.url), "utf8"));
    globalThis.fetch = async url => {
      if (url.endsWith("/api/download-manifest")) return { ok: true, json: async () => manifest };
      throw new Error("GitHub API unavailable");
    };
    for (const [navigator, platform] of [
      [{ platform: "Win32" }, "windows"],
      [{ platform: "MacIntel" }, "macos"],
      [{ platform: "Linux x86_64" }, "linux"],
      [{ userAgent: "Android", platform: "Linux armv8l" }, "mobile"]
    ]) {
      Object.defineProperty(globalThis, "navigator", { configurable: true, value: navigator });
      const fixture = createDownloadPageDocument();
      globalThis.document = fixture.document;
      await module.initDownloadPage();
      assert.equal(fixture.releaseNote.textContent, manifest.item.platformNotices[platform] || manifest.item.notice);
      assert.equal(fixture.releaseNote.hidden, false);
      assert.match(fixture.releaseNote.textContent, /Beta.*手动安装/);
    }
  } finally {
    globalThis.document = originalDocument;
    globalThis.fetch = originalFetch;
    if (navigatorDescriptor) Object.defineProperty(globalThis, "navigator", navigatorDescriptor);
    else delete globalThis.navigator;
  }
});
