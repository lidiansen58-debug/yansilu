import assert from "node:assert/strict";
import test from "node:test";

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
  return {
    container,
    document: {
      querySelector(selector) {
        return selector === "[data-download-buttons]" ? container : null;
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
  fixture.document.querySelector = (selector) => {
    if (selector === "[data-download-buttons]") return fixture.container;
    if (selector === "[data-download-status]") return status;
    if (selector === "[data-download-primary-note]") return note;
    return null;
  };
  return { ...fixture, status, note };
}

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
      label: "下载 Windows 版"
    });
    assert.deepEqual(module.platformForFile({ file: "yansilu_0.1.1-beta.1_x64-setup.dmg" }), {
      key: "macos",
      label: "下载 macOS 版"
    });

    module.renderDownloadButtons([
      { file: "Yansilu_x64-setup.exe", downloadUrl: "/downloads/windows.exe" },
      { file: "yansilu_0.1.1-beta.1_x64-setup.dmg", downloadUrl: "/downloads/macos.dmg" },
      { file: "yansilu_0.1.1-beta.1_x64-setup.dmg.sig", downloadUrl: "/downloads/macos.dmg.sig" }
    ]);

    assert.deepEqual(
      fixture.container.children.map((item) => [item.textContent, item.href]),
      [
        ["下载 Windows 版", "/downloads/windows.exe"],
        ["下载 macOS 版", "/downloads/macos.dmg"]
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

  try {
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

    assert.equal(fixture.status.textContent, "选择你的系统：");
    assert.equal(fixture.container.children.length, 2);
    assert.deepEqual(
      fixture.container.children.map((button) => ({ text: button.textContent, href: button.href })),
      [
        { text: "下载 Windows 版", href: "/downloads/windows.exe" },
        {
          text: "下载 macOS 版",
          href: "https://github.com/lidiansen58-debug/yansilu/releases/download/v0.1.1-beta.1/yansilu_0.1.1-beta.1_x64-setup.dmg"
        }
      ]
    );
  } finally {
    globalThis.document = originalDocument;
    globalThis.fetch = originalFetch;
  }
});
