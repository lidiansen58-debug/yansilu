import test from "node:test";
import assert from "node:assert/strict";
import { bindGraphCanvasEvents } from "../../apps/web/src/graph-canvas-event-router.js";

function createGraphCanvas() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, handler, options) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push({ handler, options });
    },
    contains(node) {
      return Boolean(node?.insideGraphCanvas);
    }
  };
}

function targetWithClosest(matches = {}) {
  return {
    closest(selector) {
      return matches[selector] || null;
    }
  };
}

function elementWithAttrs(attrs = {}, extra = {}) {
  return {
    dataset: extra.dataset || {},
    closest: extra.closest || (() => null),
    getAttribute(name) {
      return attrs[name] ?? "";
    }
  };
}

test("graph canvas event router binds graph hover, keyboard and wheel events", () => {
  const graphCanvas = createGraphCanvas();

  bindGraphCanvasEvents(graphCanvas);

  assert.ok(graphCanvas.listeners.get("mouseover")?.length);
  assert.ok(graphCanvas.listeners.get("focusin")?.length);
  assert.ok(graphCanvas.listeners.get("keydown")?.length);
  assert.ok(graphCanvas.listeners.get("wheel")?.length);
  assert.equal(graphCanvas.listeners.get("wheel")[0].options.passive, false);
});

test("graph canvas event router routes hover intent and exit", () => {
  const graphCanvas = createGraphCanvas();
  const calls = [];
  const node = elementWithAttrs({ "data-node-id": "a" });

  bindGraphCanvasEvents(graphCanvas, {
    applyGraphNodeHoverState: (element) => calls.push(["node", element]),
    resetGraphHoverState: () => calls.push(["reset"])
  });

  graphCanvas.listeners.get("mouseover")[0].handler({
    target: targetWithClosest({ ".graph-map-node[data-node-id]": node })
  });
  graphCanvas.listeners.get("pointerout")[0].handler({
    currentTarget: graphCanvas,
    relatedTarget: null
  });

  assert.deepEqual(calls, [["node", node], ["reset"]]);
});

test("graph canvas event router keeps escape key selection handling outside prototype shell", async () => {
  const graphCanvas = createGraphCanvas();
  const graphState = { selection: { kind: "node", nodeId: "a" }, expanded: true };
  const calls = [];

  bindGraphCanvasEvents(graphCanvas, {
    graphState,
    renderGraphPanel: () => calls.push(["render"]),
    setStatus: (message, level) => calls.push(["status", level, message])
  });

  await graphCanvas.listeners.get("keydown")[0].handler({
    key: "Escape",
    target: targetWithClosest({})
  });

  assert.equal(graphState.selection, null);
  assert.equal(graphState.expanded, true);
  assert.equal(calls[0][0], "render");
  assert.equal(calls[1][0], "status");
  assert.equal(calls[1][1], "ok");
});

test("graph canvas event router routes relation filter, manual search and wheel zoom", () => {
  const graphCanvas = createGraphCanvas();
  const graphState = {};
  const calls = [];
  const filter = elementWithAttrs({}, { dataset: { graphFilter: "relationType" } });
  filter.value = "supports";
  const manualSearch = elementWithAttrs({});
  const viewport = elementWithAttrs({});

  bindGraphCanvasEvents(graphCanvas, {
    graphState,
    applyGraphRelationTypeFilterInteraction: (state, value) => {
      calls.push(["filter", state, value]);
      return { label: "Supports" };
    },
    filterGraphManualRelationTargets: (element) => calls.push(["manual", element]),
    applyGraphWheelZoomInteraction: (state, deltaY) => {
      calls.push(["wheel", state, deltaY]);
      return { changed: true };
    },
    renderGraphPanel: () => calls.push(["render"]),
    requestAnimationFrame: (callback) => {
      calls.push(["raf"]);
      callback();
    },
    centerGraphViewportIfZoomed: () => calls.push(["center"]),
    setStatus: (message, level) => calls.push(["status", level, message])
  });

  graphCanvas.listeners.get("change")[0].handler({
    target: targetWithClosest({ "[data-graph-filter]": filter })
  });
  graphCanvas.listeners.get("input")[0].handler({
    target: targetWithClosest({ "[data-graph-manual-target-search]": manualSearch })
  });
  graphCanvas.listeners.get("wheel")[0].handler({
    deltaY: -1,
    preventDefault: () => calls.push(["prevent"]),
    target: targetWithClosest({ ".graph-map-viewport": viewport })
  });

  assert.deepEqual(calls.map((call) => call[0]), ["filter", "render", "status", "manual", "prevent", "wheel", "render", "raf", "center"]);
  assert.equal(calls[0][1], graphState);
  assert.equal(calls[0][2], "supports");
});
