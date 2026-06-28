import test from "node:test";
import assert from "node:assert/strict";

import {
  beginGraphViewportDragForRuntime,
  centerGraphViewportIfZoomedForRuntime,
  createGraphViewportController,
  createGraphViewportDragState,
  endGraphViewportDragForRuntime,
  updateGraphViewportDragForRuntime
} from "../../apps/web/src/graph-viewport-controller.js";

function createClassList() {
  const classes = new Set();
  return {
    classes,
    add: (value) => classes.add(value),
    remove: (value) => classes.delete(value)
  };
}

test("graph viewport controller centers non-fit zoomed maps", () => {
  const viewport = {
    scrollWidth: 1000,
    clientWidth: 400,
    scrollHeight: 800,
    clientHeight: 300,
    scrollLeft: 0,
    scrollTop: 0
  };

  centerGraphViewportIfZoomedForRuntime({
    documentRef: { querySelector: () => viewport },
    graphState: { zoom: "read" },
    graphZoomOption: () => ({ key: "read" })
  });

  assert.equal(viewport.scrollLeft, 300);
  assert.equal(viewport.scrollTop, 250);
});

test("graph viewport controller skips centering fit zoom maps", () => {
  const viewport = {
    scrollWidth: 1000,
    clientWidth: 400,
    scrollHeight: 800,
    clientHeight: 300,
    scrollLeft: 7,
    scrollTop: 9
  };

  centerGraphViewportIfZoomedForRuntime({
    documentRef: { querySelector: () => viewport },
    graphState: { zoom: "fit" },
    graphZoomOption: () => ({ key: "fit" })
  });

  assert.equal(viewport.scrollLeft, 7);
  assert.equal(viewport.scrollTop, 9);
});

test("graph viewport controller drags viewport and suppresses follow-up click", () => {
  const dragState = createGraphViewportDragState();
  const classList = createClassList();
  const captured = [];
  const released = [];
  const viewport = {
    classList,
    scrollLeft: 50,
    scrollTop: 80,
    setPointerCapture: (pointerId) => captured.push(pointerId),
    releasePointerCapture: (pointerId) => released.push(pointerId)
  };

  const started = beginGraphViewportDragForRuntime(viewport, {
    button: 0,
    pointerId: 12,
    clientX: 100,
    clientY: 120,
    target: { closest: () => null }
  }, { dragState });
  updateGraphViewportDragForRuntime({
    pointerId: 12,
    clientX: 90,
    clientY: 100
  }, { dragState });
  endGraphViewportDragForRuntime({ pointerId: 12 }, {
    dragState,
    now: () => 1000
  });

  assert.equal(started, true);
  assert.deepEqual(captured, [12]);
  assert.equal(viewport.scrollLeft, 60);
  assert.equal(viewport.scrollTop, 100);
  assert.equal(classList.classes.has("is-dragging"), false);
  assert.deepEqual(released, [12]);
  assert.equal(dragState.active, false);
  assert.equal(dragState.suppressClickUntil, 1250);
});

test("graph viewport controller ignores draggable UI targets", () => {
  const dragState = createGraphViewportDragState();
  const started = beginGraphViewportDragForRuntime({ classList: createClassList() }, {
    button: 0,
    target: { closest: () => ({}) }
  }, { dragState });

  assert.equal(started, false);
  assert.equal(dragState.active, false);
});

test("graph viewport controller exposes router-ready collaborators", () => {
  const controller = createGraphViewportController({
    graphState: {},
    documentRef: { querySelector: () => null },
    graphZoomOption: () => ({ key: "fit" })
  });

  assert.equal(typeof controller.centerGraphViewportIfZoomed, "function");
  assert.equal(typeof controller.beginGraphViewportDrag, "function");
  assert.equal(typeof controller.updateGraphViewportDrag, "function");
  assert.equal(typeof controller.endGraphViewportDrag, "function");
  assert.equal(controller.graphViewportDragState.active, false);
});
