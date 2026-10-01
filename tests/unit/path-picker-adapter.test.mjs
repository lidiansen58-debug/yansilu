import test from "node:test";
import assert from "node:assert/strict";

import { pickDirectoryPath, pickFilePath } from "../../apps/web/src/path-picker-adapter.js";

test("browser path selection uses the in-app dialog when native prompt is unsupported", async () => {
  const previousWindow = globalThis.window;
  const elements = new Map();
  const root = { classList: { add() {}, remove() {} }, setAttribute() {}, addEventListener() {}, querySelector(selector) {
    if (!elements.has(selector)) elements.set(selector, { value: "", setAttribute() {}, focus() {}, select() {}, addEventListener(event, callback) { this[event] = callback; } });
    return elements.get(selector);
  } };
  globalThis.window = {
    document: { body: { appendChild() {} }, createElement: () => root },
    prompt() { throw new Error("prompt is unsupported"); }
  };
  try {
    const pending = pickDirectoryPath({ defaultPath: "E:\\Exports" });
    await Promise.resolve();
    const input = elements.get("[data-text-input-field]");
    assert.equal(input.value, "E:\\Exports");
    input.value = " E:\\Chosen ";
    elements.get("[data-text-input-confirm]").click();
    assert.deepEqual(await pending, { path: "E:\\Chosen", source: "browser" });
    const cancelled = pickFilePath();
    await Promise.resolve();
    elements.get("[data-text-input-cancel]").click();
    assert.deepEqual(await cancelled, { path: "", source: "none" });
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("cancelling a native directory or file dialog does not open the browser fallback", async () => {
  const previousWindow = globalThis.window;
  globalThis.window = { __TAURI__: { core: { invoke: async () => null } }, prompt: () => { throw new Error("must not prompt after cancellation"); } };
  try {
    assert.deepEqual(await pickDirectoryPath(), { path: "", source: "tauri" });
    assert.deepEqual(await pickFilePath(), { path: "", source: "tauri" });
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("path picker prefers tauri dialog.open when available", async () => {
  const previousWindow = globalThis.window;
  const calls = [];

  globalThis.window = {
    __TAURI__: {
      dialog: {
        async open(options) {
          calls.push(options);
          return "E:\\Vaults\\picked";
        }
      }
    }
  };

  try {
    const result = await pickDirectoryPath({ defaultPath: "E:\\Vaults\\default" });
    assert.deepEqual(calls, [
      {
        directory: true,
        multiple: false,
        defaultPath: "E:\\Vaults\\default"
      }
    ]);
    assert.deepEqual(result, { path: "E:\\Vaults\\picked", source: "tauri" });
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("path picker falls back to tauri core.invoke when dialog.open is unavailable", async () => {
  const previousWindow = globalThis.window;
  const calls = [];

  globalThis.window = {
    __TAURI__: {
      core: {
        async invoke(command, payload) {
          calls.push({ command, payload });
          return ["", "E:\\Vaults\\picked-from-core"];
        }
      }
    }
  };

  try {
    const result = await pickDirectoryPath({ defaultPath: "E:\\Vaults\\default" });
    assert.deepEqual(calls, [
      {
        command: "plugin:dialog|open",
        payload: {
          options: {
            directory: true,
            multiple: false,
            defaultPath: "E:\\Vaults\\default"
          }
        }
      }
    ]);
    assert.deepEqual(result, { path: "E:\\Vaults\\picked-from-core", source: "tauri" });
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("path picker falls back to browser prompt when tauri is unavailable", async () => {
  const previousWindow = globalThis.window;
  const prompts = [];

  globalThis.window = {
    prompt(message, defaultPath) {
      prompts.push({ message, defaultPath });
      return "E:\\Vaults\\prompt-picked";
    }
  };

  try {
    const result = await pickDirectoryPath({ defaultPath: "E:\\Vaults\\default" });
    assert.deepEqual(prompts, [
      {
        message: "请输入目录路径（浏览器降级模式）",
        defaultPath: "E:\\Vaults\\default"
      }
    ]);
    assert.deepEqual(result, { path: "E:\\Vaults\\prompt-picked", source: "browser" });
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("path picker ignores showDirectoryPicker handles and still asks for a concrete path", async () => {
  const previousWindow = globalThis.window;
  const prompts = [];
  let pickerCalls = 0;

  globalThis.window = {
    async showDirectoryPicker() {
      pickerCalls += 1;
      return { name: "yansilu-vault" };
    },
    prompt(message, defaultPath) {
      prompts.push({ message, defaultPath });
      return "E:\\Vaults\\prompt-picked";
    }
  };

  try {
    const result = await pickDirectoryPath({ defaultPath: "E:\\Vaults\\default" });
    assert.equal(pickerCalls, 0);
    assert.deepEqual(prompts, [
      {
        message: "请输入目录路径（浏览器降级模式）",
        defaultPath: "E:\\Vaults\\default"
      }
    ]);
    assert.deepEqual(result, { path: "E:\\Vaults\\prompt-picked", source: "browser" });
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("path picker returns none when browser fallback is cancelled", async () => {
  const previousWindow = globalThis.window;

  globalThis.window = {
    prompt() {
      return "";
    }
  };

  try {
    const result = await pickDirectoryPath({ defaultPath: "E:\\Vaults\\default" });
    assert.deepEqual(result, { path: "", source: "none" });
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("file picker opens tauri dialog with file filters", async () => {
  const previousWindow = globalThis.window;
  const calls = [];

  globalThis.window = {
    __TAURI__: {
      dialog: {
        async open(options) {
          calls.push(options);
          return "E:\\Backups\\yansilu-backup-20260704-093000.yansilu-backup";
        }
      }
    }
  };

  try {
    const result = await pickFilePath({
      defaultPath: "E:\\Backups",
      filters: [{ name: "Yansilu backup", extensions: ["yansilu-backup"] }]
    });
    assert.deepEqual(calls, [
      {
        directory: false,
        multiple: false,
        defaultPath: "E:\\Backups",
        filters: [{ name: "Yansilu backup", extensions: ["yansilu-backup"] }]
      }
    ]);
    assert.deepEqual(result, {
      path: "E:\\Backups\\yansilu-backup-20260704-093000.yansilu-backup",
      source: "tauri"
    });
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("file picker falls back to browser prompt for a concrete path", async () => {
  const previousWindow = globalThis.window;
  const prompts = [];

  globalThis.window = {
    prompt(message, defaultPath) {
      prompts.push({ message, defaultPath });
      return "E:\\Backups\\picked.yansilu-backup";
    }
  };

  try {
    const result = await pickFilePath({ defaultPath: "E:\\Backups" });
    assert.deepEqual(prompts, [
      {
        message: "请输入文件路径（浏览器降级模式）",
        defaultPath: "E:\\Backups"
      }
    ]);
    assert.deepEqual(result, { path: "E:\\Backups\\picked.yansilu-backup", source: "browser" });
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
