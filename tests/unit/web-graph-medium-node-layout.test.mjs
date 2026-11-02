import test from "node:test";
import assert from "node:assert/strict";
import { spaceMediumGraphNodes } from "../../apps/web/src/graph-medium-node-layout.js";

test("medium maps keep long titles and clickable endpoints separate, including overflow rows", () => {
  for (const count of [13, 24, 36, 48]) {
    for (const focused of [false, true]) {
      const nodes = Array.from({ length: count }, (_, i) => ({ id: `n${i}`, x: 540, y: 280 }));
      const options = { width: 1080, height: 560, fixedNoteId: focused ? "n0" : "" };
      const first = structuredClone(nodes), second = structuredClone(nodes);
      const size = spaceMediumGraphNodes(first, options);
      assert.deepEqual(spaceMediumGraphNodes(second, options), size);
      assert.deepEqual(first, second, "The same saved graph has stable positions");
      for (const [i, a] of first.entries()) {
        assert.ok(a.x >= 100 && a.x <= size.width - 100 && a.y >= 80 && a.y <= size.height - 60);
        for (const b of first.slice(i + 1)) {
          assert.ok(Math.abs(a.x - b.x) >= 180 || Math.abs(a.y - b.y) >= 80, `${count} notes: ${a.id}/${b.id} cover each other`);
        }
      }
    }
  }
});
