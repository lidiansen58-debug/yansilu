import test from "node:test";
import assert from "node:assert/strict";

import { pickDirectoryPath } from "../../apps/web/src/path-picker-adapter.js";

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
