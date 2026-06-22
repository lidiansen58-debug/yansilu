import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  routeAppShellStateChange
} from "../../apps/web/src/app-shell-state-change-router.js";

const repoRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

test("app shell state change router delegates graph refresh actions", async () => {
  const calls = [];
  const result = await routeAppShellStateChange("refresh-graph", {}, {
    refreshGraph: {
      graphState: {},
      refreshDirectoryGraph: async () => {
        calls.push("refresh");
        return true;
      },
      setStatus: (message, tone) => calls.push(["status", message, tone])
    }
  });

  assert.equal(result, true);
  assert.equal(calls[0], "refresh");
  assert.deepEqual(calls.at(-1), ["status", "永久笔记关系图谱已刷新", "ok"]);
});

test("app shell state change router delegates note creation actions", async () => {
  const calls = [];
  const result = await routeAppShellStateChange("create-primary-note", {}, {
    createPrimaryNote: {
      createPrimaryOriginalNote: async () => {
        calls.push("create");
        return { id: "n1", remote: true };
      },
      setStatus: (message, tone) => calls.push(["status", message, tone])
    }
  });

  assert.deepEqual(result, { id: "n1", remote: true });
  assert.equal(calls[0], "create");
  assert.deepEqual(calls.at(-1), ["status", "已创建新的永久笔记 Markdown 文件", "ok"]);
});

test("app shell state change router preserves graph associate recursion through host state change", async () => {
  const calls = [];
  const result = await routeAppShellStateChange("graph-associate-note", { noteId: "n1", source: "browser" }, {
    graphAssociateNote: {
      state: { module: "explorer" },
      graphAssociateNoteRoute: () => ({ kind: "open-note-relations", noteId: "n1", source: "browser" }),
      applyExplorerSelectionContext: (context) => calls.push(["context", context]),
      handleStateChange: async (reason, payload) => {
        calls.push(["state", reason, payload]);
        return "opened";
      }
    }
  });

  assert.equal(result, "opened");
  assert.deepEqual(calls, [
    ["context", { noteId: "n1", syncSearch: false, expandFolder: true }],
    ["state", "open-note-relations", { noteId: "n1", source: "browser" }]
  ]);
});

test("app shell state change router keeps simple shell fallbacks in the router", async () => {
  const calls = [];
  const result = await routeAppShellStateChange("switch-tab", {}, {
    syncExplorerContextToActiveTab: () => calls.push("sync-tab"),
    renderAll: () => calls.push("render")
  });

  assert.equal(result, undefined);
  assert.deepEqual(calls, ["sync-tab", "render"]);

  const unknown = await routeAppShellStateChange("unknown", {}, {
    renderAll: () => calls.push("unexpected")
  });
  assert.equal(unknown, undefined);
  assert.deepEqual(calls, ["sync-tab", "render"]);
});

test("app shell state change router owns the extracted action dispatch table", () => {
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/app-shell-state-change-router.js"), "utf8");
  for (const modulePath of [
    "app-shell-distillation-state-actions.js",
    "app-shell-graph-state-actions.js",
    "app-shell-save-note-state-actions.js",
    "app-shell-note-main-route-actions.js",
    "app-shell-state-file-actions.js",
    "app-shell-state-note-creation-actions.js",
    "app-shell-state-navigation-actions.js"
  ]) {
    assert.match(source, new RegExp(`from "\\./${modulePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  }
});
