import assert from "node:assert/strict";
import test from "node:test";

import {
  installGraphNodeClickFallbackEvents
} from "../../apps/web/src/graph-node-click-fallback-events.js";

function createDocument() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, handler, options) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push({ handler, options });
    }
  };
}

const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

test("graph node click fallback routes current graph canvas node clicks once", async () => {
  const documentRef = createDocument();
  const graphNode = {
    id: "node",
    getAttribute(name) {
      if (name === "data-node-id") return "n1";
      if (name === "data-node-degree") return "2";
      return "";
    }
  };
  const calls = [];
  const events = [];
  const eventFor = () => {
    const event = {
      prevented: false,
      stopped: false,
      preventDefault() { this.prevented = true; },
      stopImmediatePropagation() { this.stopped = true; },
      target: {
        closest(selector) {
          return selector === ".graph-map-node[data-node-id]" ? graphNode : null;
        }
      }
    };
    events.push(event);
    return event;
  };

  const installed = installGraphNodeClickFallbackEvents(documentRef, {
    openGraphNodeSelectionFromElement: (element) => calls.push(element)
  });

  assert.equal(installed, true);
  assert.equal(documentRef.listeners.has("pointerdown"), false);
  assert.equal(documentRef.listeners.get("click")[0].options.capture, true);
  documentRef.listeners.get("click")[0].handler(eventFor());
  await nextTick();

  assert.deepEqual(calls, [graphNode]);
  assert.equal(events[0].prevented, true);
  assert.equal(events[0].stopped, true);
});

test("graph node click fallback opens isolated nodes directly", async () => {
  const documentRef = createDocument();
  const calls = [];
  const graphNode = {
    getAttribute(name) {
      if (name === "data-node-id") return "isolated";
      if (name === "data-node-degree") return "0";
      return "";
    }
  };
  const event = {
    target: {
      closest(selector) {
        return selector === ".graph-map-node[data-node-id]" ? graphNode : null;
      }
    }
  };

  installGraphNodeClickFallbackEvents(documentRef, {
    openGraphSelection: (selection) => calls.push(selection),
    openGraphNodeSelectionFromElement: () => calls.push("node")
  });

  documentRef.listeners.get("click")[0].handler(event);
  await nextTick();

  assert.deepEqual(calls, [{ kind: "relationForm", noteId: "isolated", returnTo: "isolated" }]);
});
