import test from "node:test";
import assert from "node:assert/strict";

import { resolveContextMenuPosition } from "../../apps/web/src/components-context-menu.js";

test("context menu keeps its top-left position when fully inside the viewport", () => {
  assert.deepEqual(
    resolveContextMenuPosition({
      x: 80,
      y: 120,
      menuWidth: 200,
      menuHeight: 120,
      viewportWidth: 1200,
      viewportHeight: 800
    }),
    { left: 80, top: 120 }
  );
});

test("context menu shifts upward when it would overflow below the viewport", () => {
  assert.deepEqual(
    resolveContextMenuPosition({
      x: 80,
      y: 700,
      menuWidth: 220,
      menuHeight: 180,
      viewportWidth: 1200,
      viewportHeight: 800
    }),
    { left: 80, top: 612 }
  );
});

test("context menu shifts left when it would overflow beyond the right edge", () => {
  assert.deepEqual(
    resolveContextMenuPosition({
      x: 1180,
      y: 180,
      menuWidth: 220,
      menuHeight: 160,
      viewportWidth: 1200,
      viewportHeight: 800
    }),
    { left: 972, top: 180 }
  );
});

test("context menu clamps oversized menus inside the viewport margin", () => {
  assert.deepEqual(
    resolveContextMenuPosition({
      x: 16,
      y: 24,
      menuWidth: 600,
      menuHeight: 900,
      viewportWidth: 420,
      viewportHeight: 640
    }),
    { left: 8, top: 8 }
  );
});
