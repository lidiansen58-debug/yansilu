import test from "node:test";
import assert from "node:assert/strict";
import {
  GRAPH_VISUAL_ZOOM_OPTIONS,
  graphZoomOption,
  graphZoomStep
} from "../../apps/web/src/graph-visual-zoom-model.js";

test("graph visual zoom model normalizes options and clamps step navigation", () => {
  assert.equal(graphZoomOption("READ").key, "read");
  assert.equal(graphZoomOption("unknown").key, "fit");
  assert.equal(graphZoomOption("detail").scale, GRAPH_VISUAL_ZOOM_OPTIONS.detail.scale);

  assert.equal(graphZoomStep("fit", -1).key, "fit");
  assert.equal(graphZoomStep("fit", 1).key, "read");
  assert.equal(graphZoomStep("read", 1).key, "detail");
  assert.equal(graphZoomStep("detail", 1).key, "detail");
});

test("graph visual zoom model supports injected option sets", () => {
  const customOptions = {
    fit: { label: "Fit", scale: 1 },
    wide: { label: "Wide", scale: 1.4 },
    close: { label: "Close", scale: 2 }
  };

  assert.equal(graphZoomOption("wide", customOptions).scale, 1.4);
  assert.equal(graphZoomStep("wide", 1, customOptions).key, "close");
  assert.equal(graphZoomStep("missing", 1, customOptions).key, "wide");
});
