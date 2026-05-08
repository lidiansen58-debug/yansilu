import test from "node:test";
import assert from "node:assert/strict";

import {
  basenameLocalPath,
  dirnameLocalPath,
  joinLocalPath,
  openExternalUrl,
  revealPath
} from "../../apps/web/src/desktop-file-adapter.js";

test("desktop file adapter joins and trims local paths", () => {
  assert.equal(joinLocalPath("E:\\Vault\\notes\\original", "folder/note.md"), "E:\\Vault\\notes\\original\\folder\\note.md");
  assert.equal(joinLocalPath("/tmp/vault/", "/notes/demo.md"), "/tmp/vault/notes/demo.md");
  assert.equal(dirnameLocalPath("E:\\Vault\\notes\\original\\folder\\note.md"), "E:\\Vault\\notes\\original\\folder");
  assert.equal(basenameLocalPath("E:\\Vault\\notes\\original\\folder\\note.md"), "note.md");
});

test("desktop file adapter prefers tauri revealItemInDir", async () => {
  const previousWindow = globalThis.window;
  const calls = [];

  globalThis.window = {
    __TAURI__: {
      opener: {
        async revealItemInDir(targetPath) {
          calls.push(targetPath);
        }
      }
    }
  };

  try {
    const result = await revealPath("E:\\Vault\\notes\\original\\note.md");
    assert.deepEqual(calls, ["E:\\Vault\\notes\\original\\note.md"]);
    assert.equal(result.ok, true);
    assert.equal(result.source, "tauri");
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("desktop file adapter copies path when tauri is unavailable", async () => {
  const previousWindow = globalThis.window;
  const previousNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const copied = [];

  delete globalThis.window;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      clipboard: {
        async writeText(value) {
          copied.push(value);
        }
      }
    }
  });

  try {
    const result = await revealPath("E:\\Vault\\notes\\original\\note.md");
    assert.equal(result.ok, false);
    assert.equal(result.source, "browser");
    assert.deepEqual(copied, ["E:\\Vault\\notes\\original\\note.md"]);
    assert.match(result.message, /已复制路径/);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousNavigatorDescriptor) Object.defineProperty(globalThis, "navigator", previousNavigatorDescriptor);
    else delete globalThis.navigator;
  }
});

test("desktop file adapter prefers tauri openUrl for external links", async () => {
  const previousWindow = globalThis.window;
  const calls = [];

  globalThis.window = {
    __TAURI__: {
      opener: {
        async openUrl(targetUrl) {
          calls.push(targetUrl);
        }
      }
    }
  };

  try {
    const result = await openExternalUrl("https://github.com/lidiansen/yansilu-feedback");
    assert.deepEqual(calls, ["https://github.com/lidiansen/yansilu-feedback"]);
    assert.equal(result.ok, true);
    assert.equal(result.source, "tauri");
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("desktop file adapter falls back to window.open for external links", async () => {
  const previousWindow = globalThis.window;
  const calls = [];

  globalThis.window = {
    open(url, target, features) {
      calls.push({ url, target, features });
      return {};
    }
  };

  try {
    const result = await openExternalUrl("https://github.com/lidiansen/yansilu-feedback");
    assert.equal(result.ok, true);
    assert.equal(result.source, "browser");
    assert.deepEqual(calls, [
      {
        url: "https://github.com/lidiansen/yansilu-feedback",
        target: "_blank",
        features: "noopener,noreferrer"
      }
    ]);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
