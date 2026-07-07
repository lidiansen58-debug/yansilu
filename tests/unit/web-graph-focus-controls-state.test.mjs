import test from "node:test";
import assert from "node:assert/strict";

import {
  GRAPH_FOCUS_CONTEXT_MODE_KEY,
  GRAPH_FOCUS_DEPTH_KEY,
  graphFocusContextModeMeta,
  graphFocusDepthMeta,
  normalizeGraphFocusContextMode,
  normalizeGraphFocusDepth,
  setGraphFocusContextModeForRuntime,
  setGraphFocusDepthForRuntime
} from "../../apps/web/src/graph-focus-controls-state.js";

test("graph focus controls normalize depth and context mode", () => {
  assert.equal(normalizeGraphFocusDepth(" 2 "), "2");
  assert.equal(normalizeGraphFocusDepth("ALL"), "all");
  assert.equal(normalizeGraphFocusDepth("bad", "2"), "2");
  assert.equal(normalizeGraphFocusContextMode(" writing "), "writing");
  assert.equal(normalizeGraphFocusContextMode("bad", "argument"), "argument");
});

test("graph focus controls expose user-facing meta", () => {
  assert.deepEqual(graphFocusDepthMeta("2"), {
    key: "2",
    label: "周边一层",
    note: "再显示相邻笔记继续连到的笔记。"
  });
  assert.deepEqual(graphFocusDepthMeta("all"), {
    key: "all",
    label: "整组网络",
    note: "显示这组互相关联的笔记。"
  });
  assert.deepEqual(graphFocusDepthMeta("1"), {
    key: "1",
    label: "当前关联",
    note: "只显示选中笔记直接相连的笔记。"
  });
  assert.deepEqual(graphFocusContextModeMeta("writing"), {
    key: "writing",
    label: "写作怎么用",
    note: "优先看桥接、前后顺序和草稿入口，判断这条笔记能放进哪一段。"
  });
});

test("graph focus controls setters update graph state and persist when allowed", () => {
  const graphState = {};
  const writes = [];
  const writeStoredText = (key, value) => writes.push([key, value]);

  assert.equal(setGraphFocusDepthForRuntime(graphState, "all", { writeStoredText }), "all");
  assert.equal(graphState.focusDepth, "all");
  assert.deepEqual(writes.at(-1), [GRAPH_FOCUS_DEPTH_KEY, "all"]);

  assert.equal(setGraphFocusContextModeForRuntime(graphState, "writing", { writeStoredText }), "writing");
  assert.equal(graphState.focusContextMode, "writing");
  assert.deepEqual(writes.at(-1), [GRAPH_FOCUS_CONTEXT_MODE_KEY, "writing"]);

  setGraphFocusDepthForRuntime(graphState, "2", { writeStoredText, persist: false });
  assert.equal(graphState.focusDepth, "2");
  assert.equal(writes.length, 2);
});
