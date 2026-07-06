import test from "node:test";
import assert from "node:assert/strict";
import {
  GRAPH_CANVAS_HELP_HINT_KEY,
  dismissGraphCanvasHelpHintForRuntime,
  shouldShowGraphCanvasHelpHintForRuntime
} from "../../apps/web/src/graph-canvas-help-hint-controller.js";

function fakeWindow() {
  const store = new Map();
  const timers = [];
  return {
    store,
    timers,
    localStorage: {
      getItem: (key) => store.get(key) || null,
      setItem: (key, value) => store.set(key, String(value))
    },
    setTimeout: (callback, ms) => {
      timers.push({ callback, ms });
      return timers.length;
    },
    clearTimeout: () => {}
  };
}

test("graph canvas help hint shows once for a graph with nodes and then auto-dismisses", () => {
  let now = 1000;
  const graphState = {};
  const window = fakeWindow();
  const renders = [];
  const deps = {
    graphState,
    window,
    now: () => now,
    timeoutMs: 8000,
    isGraphModule: () => true,
    renderGraphPanel: () => renders.push("render")
  };

  assert.equal(shouldShowGraphCanvasHelpHintForRuntime({ hasNodes: true }, deps), true);
  assert.equal(window.timers[0].ms, 8000);
  window.timers[0].callback();

  assert.equal(graphState.canvasHelpHintDismissed, true);
  assert.equal(window.store.get(GRAPH_CANVAS_HELP_HINT_KEY), "1");
  assert.deepEqual(renders, ["render"]);
  now += 9000;
  assert.equal(shouldShowGraphCanvasHelpHintForRuntime({ hasNodes: true }, deps), false);
});

test("graph canvas help hint can be dismissed by user interaction", () => {
  const graphState = { canvasHelpHintVisibleUntil: 2000, canvasHelpHintTimer: 1 };
  const window = fakeWindow();
  const renders = [];

  assert.equal(dismissGraphCanvasHelpHintForRuntime({
    graphState,
    window,
    isGraphModule: () => true,
    renderGraphPanel: () => renders.push("render")
  }), true);

  assert.equal(graphState.canvasHelpHintDismissed, true);
  assert.equal(graphState.canvasHelpHintVisibleUntil, 0);
  assert.equal(window.store.get(GRAPH_CANVAS_HELP_HINT_KEY), "1");
  assert.deepEqual(renders, ["render"]);
});
