import test from "node:test";
import assert from "node:assert/strict";

import {
  applyGraphUtilityDrawerPositionForRuntime,
  beginGraphUtilityDrawerDragForRuntime,
  clampGraphUtilityDrawerPositionForRuntime,
  createGraphUtilityDrawerController,
  createGraphUtilityDrawerDragState,
  endGraphUtilityDrawerDragForRuntime,
  updateGraphUtilityDrawerDragForRuntime
} from "../../apps/web/src/graph-utility-drawer-controller.js";

function createClassList() {
  const classes = new Set();
  return {
    classes,
    add: (value) => classes.add(value),
    remove: (value) => classes.delete(value)
  };
}

function createDrawerDom() {
  const classList = createClassList();
  const resetButton = {
    disabledRemoved: false,
    removeAttribute(name) {
      if (name === "disabled") this.disabledRemoved = true;
    }
  };
  const stage = {
    clientWidth: 300,
    clientHeight: 240
  };
  const wrapper = {
    classList,
    offsetLeft: 25,
    offsetTop: 35,
    offsetWidth: 80,
    offsetHeight: 70,
    style: {},
    closest(selector) {
      return selector === ".graph-map-stage" ? stage : null;
    },
    querySelector(selector) {
      return selector === "[data-graph-utility-reset-position]" ? resetButton : null;
    }
  };
  const handle = {
    captured: [],
    released: [],
    closest(selector) {
      return selector === ".graph-utility-drawer-wrap" ? wrapper : null;
    },
    setPointerCapture(pointerId) {
      this.captured.push(pointerId);
    },
    hasPointerCapture(pointerId) {
      return this.captured.includes(pointerId);
    },
    releasePointerCapture(pointerId) {
      this.released.push(pointerId);
    }
  };
  const root = {
    querySelector(selector) {
      if (selector === ".graph-utility-drawer-wrap") return wrapper;
      if (selector === ".graph-map-stage") return stage;
      return null;
    }
  };
  return { classList, handle, resetButton, root, stage, wrapper };
}

test("graph utility drawer controller clamps drawer position inside stage", () => {
  const { stage, wrapper } = createDrawerDom();

  assert.deepEqual(clampGraphUtilityDrawerPositionForRuntime({ x: 999, y: -4 }, stage, wrapper), {
    x: 210,
    y: 10
  });
});

test("graph utility drawer controller applies saved drawer position", () => {
  const { root, wrapper } = createDrawerDom();
  const graphState = { utilityDrawerPosition: { x: 48.4, y: 57.6 } };

  const applied = applyGraphUtilityDrawerPositionForRuntime(root, { graphState });

  assert.deepEqual(applied, { x: 48, y: 58 });
  assert.deepEqual(graphState.utilityDrawerPosition, { x: 48, y: 58 });
  assert.equal(wrapper.style.left, "48px");
  assert.equal(wrapper.style.top, "58px");
  assert.equal(wrapper.style.right, "auto");
  assert.equal(wrapper.style.justifyContent, "flex-start");
});

test("graph utility drawer controller drags drawer and enables reset", () => {
  const { classList, handle, resetButton, wrapper } = createDrawerDom();
  const dragState = createGraphUtilityDrawerDragState();
  const graphState = { utilityDrawerPosition: null };
  const calls = [];

  const started = beginGraphUtilityDrawerDragForRuntime(handle, {
    pointerId: 17,
    clientX: 100,
    clientY: 120,
    preventDefault: () => calls.push("prevent-start"),
    stopPropagation: () => calls.push("stop-start")
  }, { dragState, graphState });
  const moved = updateGraphUtilityDrawerDragForRuntime({
    pointerId: 17,
    clientX: 130,
    clientY: 145,
    preventDefault: () => calls.push("prevent-move")
  }, { dragState, graphState });

  assert.equal(started, true);
  assert.deepEqual(handle.captured, [17]);
  assert.equal(classList.classes.has("is-dragging"), true);
  assert.deepEqual(moved, { x: 55, y: 60 });
  assert.deepEqual(graphState.utilityDrawerPosition, { x: 55, y: 60 });
  assert.equal(wrapper.style.left, "55px");
  assert.equal(wrapper.style.top, "60px");
  assert.equal(resetButton.disabledRemoved, true);
  assert.deepEqual(calls, ["prevent-start", "stop-start", "prevent-move"]);
});

test("graph utility drawer controller ends drag and suppresses follow-up click", () => {
  const { classList, handle } = createDrawerDom();
  const dragState = createGraphUtilityDrawerDragState();
  const graphState = {};

  beginGraphUtilityDrawerDragForRuntime(handle, {
    pointerId: 21,
    clientX: 100,
    clientY: 100
  }, { dragState, graphState });
  updateGraphUtilityDrawerDragForRuntime({
    pointerId: 21,
    clientX: 110,
    clientY: 106
  }, { dragState, graphState });
  const ended = endGraphUtilityDrawerDragForRuntime({ pointerId: 21 }, {
    dragState,
    now: () => 2000
  });

  assert.equal(ended, true);
  assert.equal(classList.classes.has("is-dragging"), false);
  assert.deepEqual(handle.released, [21]);
  assert.equal(dragState.active, false);
  assert.equal(dragState.pointerId, null);
  assert.equal(dragState.handle, null);
  assert.equal(dragState.wrapper, null);
  assert.equal(dragState.stage, null);
  assert.equal(dragState.suppressClickUntil, 2250);
});

test("graph utility drawer controller exposes router-ready collaborators", () => {
  const graphState = { utilityDrawerPosition: { x: 10, y: 20 } };
  const { root } = createDrawerDom();
  const controller = createGraphUtilityDrawerController({
    graphState,
    rootProvider: () => root
  });

  assert.equal(typeof controller.applyGraphUtilityDrawerPosition, "function");
  assert.equal(typeof controller.beginGraphUtilityDrawerDrag, "function");
  assert.equal(typeof controller.updateGraphUtilityDrawerDrag, "function");
  assert.equal(typeof controller.endGraphUtilityDrawerDrag, "function");
  assert.equal(controller.graphUtilityDrawerDragState.active, false);
  assert.deepEqual(controller.applyGraphUtilityDrawerPosition(), { x: 10, y: 20 });
});
