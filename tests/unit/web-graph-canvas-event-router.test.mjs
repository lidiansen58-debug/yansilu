import test from "node:test";
import assert from "node:assert/strict";
import { bindGraphCanvasEvents } from "../../apps/web/src/graph-canvas-event-router.js";
import { applyGraphReadingLensInteraction } from "../../apps/web/src/graph-toolbar-interaction-controller.js";
import { applyGraphWorkbenchTabInteraction } from "../../apps/web/src/graph-workspace-interaction-controller.js";

function createGraphCanvas() {
  const listeners = new Map();
  const documentListeners = new Map();
  const ownerDocument = {
    listeners: documentListeners,
    addEventListener(type, handler, options) {
      if (!documentListeners.has(type)) documentListeners.set(type, []);
      documentListeners.get(type).push({ handler, options });
    }
  };
  return {
    listeners,
    ownerDocument,
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
    hasAttribute(name) {
      return Boolean(attrs[name]);
    },
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
    dismissGraphCanvasHelpHint: () => calls.push(["dismiss-hint"]),
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

  assert.deepEqual(calls.map((call) => call[0]), ["filter", "render", "status", "manual", "prevent", "dismiss-hint", "wheel", "render", "raf", "center"]);
  assert.equal(calls[0][1], graphState);
  assert.equal(calls[0][2], "supports");
});

test("graph canvas event router consumes click workflow actions before generic note opening", async () => {
  const graphCanvas = createGraphCanvas();
  const calls = [];
  const candidateButton = elementWithAttrs({});

  bindGraphCanvasEvents(graphCanvas, {
    saveGraphCandidateRelation: async (button) => calls.push(["save-candidate", button]),
    openNoteById: (noteId) => calls.push(["open-note", noteId])
  });

  await graphCanvas.listeners.get("click")[0].handler({
    preventDefault: () => calls.push(["prevent"]),
    stopImmediatePropagation: () => calls.push(["stop-immediate"]),
    target: targetWithClosest({
      "[data-graph-relation-candidate-apply]": candidateButton,
      "[data-open-note]": elementWithAttrs({}, { dataset: { openNote: "n1" } })
    })
  });

  assert.deepEqual(calls, [["prevent"], ["stop-immediate"], ["save-candidate", candidateButton]]);
});

test("graph canvas event router focuses graph AI review in the workbench", async () => {
  const graphCanvas = createGraphCanvas();
  const graphState = { workbenchPanelOpen: false, workbenchPanelTab: "clues", thinkingPanelVisible: false, thinkingPanelOpen: false, thinkingFilter: "theme" };
  const calls = [];

  bindGraphCanvasEvents(graphCanvas, {
    graphState,
    renderGraphPanel: () => calls.push(["render"]),
    setStatus: (message, level) => calls.push(["status", level, message])
  });

  await graphCanvas.listeners.get("click")[0].handler({
    target: targetWithClosest({
      "[data-graph-focus-thinking-review]": elementWithAttrs({})
    })
  });

  assert.equal(graphState.workbenchPanelOpen, true);
  assert.equal(graphState.workbenchPanelTab, "questions");
  assert.equal(graphState.thinkingPanelVisible, true);
  assert.equal(graphState.thinkingPanelOpen, true);
  assert.equal(graphState.thinkingFilter, "all");
  assert.deepEqual(calls.map((call) => call[0]), ["render", "status"]);
});

test("graph canvas event router opens next-step workbench from insight lens", async () => {
  const graphCanvas = createGraphCanvas();
  const graphState = { readingLens: "bridge", workbenchPanelOpen: false, workbenchPanelTab: "questions" };
  const calls = [];
  const lensButton = elementWithAttrs({ "data-graph-reading-lens": "insight" });

  bindGraphCanvasEvents(graphCanvas, {
    graphState,
    graphReadingLensMeta: (value = "") => ({
      key: String(value || "insight").trim() || "insight",
      label: value === "insight" ? "推荐下一步" : "其他"
    }),
    applyGraphReadingLensInteraction,
    applyGraphWorkbenchTabInteraction,
    graphWorkbenchTabMeta: (value = "") => ({
      key: String(value || "clues").trim() || "clues",
      label: value === "clues" ? "关联任务" : "洞察问题"
    }),
    renderGraphPanel: () => calls.push(["render"]),
    setStatus: (message, level) => calls.push(["status", level, message])
  });

  await graphCanvas.listeners.get("click")[0].handler({
    target: targetWithClosest({
      "[data-graph-reading-lens]": lensButton
    })
  });

  assert.equal(graphState.readingLens, "insight");
  assert.equal(graphState.workbenchPanelOpen, true);
  assert.equal(graphState.workbenchPanelTab, "clues");
  assert.deepEqual(calls, [["render"], ["status", "ok", "已打开图谱下一步建议"]]);
});

test("graph canvas event router routes map node and relation focus clicks", async () => {
  const graphCanvas = createGraphCanvas();
  const calls = [];
  const graphNode = elementWithAttrs({ "data-node-id": "n1" });
  const relationAdjustment = elementWithAttrs({});

  bindGraphCanvasEvents(graphCanvas, {
    openGraphNodeSelectionFromElement: (element) => calls.push(["node", element]),
    focusGraphRelationAdjustmentInPlace: (element) => calls.push(["adjust", element])
  });

  await graphCanvas.listeners.get("click")[0].handler({
    preventDefault: () => calls.push(["prevent"]),
    stopImmediatePropagation: () => calls.push(["stop-immediate"]),
    target: targetWithClosest({ "[data-graph-relation-adjustment]": relationAdjustment })
  });
  await graphCanvas.listeners.get("click")[0].handler({
    target: targetWithClosest({ ".graph-map-node[data-node-id]": graphNode })
  });

  assert.deepEqual(calls, [["prevent"], ["stop-immediate"], ["adjust", relationAdjustment], ["node", graphNode]]);
});
