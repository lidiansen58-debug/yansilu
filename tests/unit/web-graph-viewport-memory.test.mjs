import test from "node:test";
import assert from "node:assert/strict";
import { captureGraphViewport, restoreGraphViewport } from "../../apps/web/src/graph-viewport-memory.js";

function rootStub({ zoom = "detail", expanded = false, nodeIds = ["a", "b"], edge = "e", edgeKeys = [edge], members = null, notesOpen = true } = {}) {
  const attribute = values => ({ getAttribute: name => values[name] || null });
  const nodes = nodeIds.map(id => ({ ...attribute({ "data-node-id": id }),
    querySelector: () => attribute({ cx: id === "a" ? "100" : "200", cy: "100" }) }));
  const edges = edgeKeys.map(key => attribute({ "data-edge-from": "a", "data-edge-to": "b", "data-edge-key": key }));
  const svg = { ...attribute({ viewBox: "0 0 1080 560" }),
    querySelectorAll: selector => selector === ".graph-map-node" ? nodes : edges };
  const viewport = { ...attribute({ "data-graph-zoom": zoom }), scrollLeft: 137, scrollTop: 83,
    querySelector: () => svg };
  const detailBody = { scrollTop: 285 };
  const detailPanel = members ? {
    querySelector: selector => selector === '.graph-selection-body' ? detailBody :
      attribute({ 'data-graph-theme-note-ids': members.join(',') }),
    querySelectorAll: () => [{ ...attribute({ 'data-graph-section': `cluster-${members[0]}-notes` }),
      hasAttribute: () => notesOpen }]
  } : null;
  return { viewport, detailBody, querySelector: selector => selector === ".graph-map-viewport" ? viewport :
    selector === '.graph-selection-panel.is-cluster' ? detailPanel :
      { classList: { contains: () => expanded } } };
}

test("viewport survives a presentation-only rerender", () => {
  const old = rootStub();
  const snapshot = captureGraphViewport(old);
  const next = rootStub();
  next.viewport.scrollLeft = 0; next.viewport.scrollTop = 0;
  assert.equal(restoreGraphViewport(next, snapshot), true);
  assert.equal(next.viewport.scrollLeft, 137);
  assert.equal(next.viewport.scrollTop, 83);
});

test("a different layout, filter, zoom or expanded state does not inherit old viewport", () => {
  const snapshot = captureGraphViewport(rootStub());
  for (const options of [{ zoom: "fit" }, { expanded: true }, { nodeIds: ["c"] }, { edge: "other" }]) {
    const next = rootStub(options);
    next.viewport.scrollLeft = 0;
    assert.equal(restoreGraphViewport(next, snapshot), false);
    assert.equal(next.viewport.scrollLeft, 0);
  }
});

test('unchanged geometry with reordered DOM nodes or edges keeps the same viewport', () => {
  const snapshot = captureGraphViewport(rootStub({ edgeKeys: ['e1', 'e2'] }));
  const next = rootStub({ nodeIds: ['b', 'a'], edgeKeys: ['e2', 'e1'] });
  next.viewport.scrollLeft = 0;
  next.viewport.scrollTop = 0;
  assert.equal(restoreGraphViewport(next, snapshot), true);
  assert.equal(next.viewport.scrollLeft, 137);
  assert.equal(next.viewport.scrollTop, 83);
});

test("reading restoration is explicit and safely handles missing viewport", () => {
  const snapshot = captureGraphViewport(rootStub());
  assert.equal(restoreGraphViewport(rootStub({ nodeIds: ["new"] }), snapshot, { requireSameLayout: false }), true);
  assert.equal(captureGraphViewport(null), null);
  assert.equal(restoreGraphViewport(null, snapshot), false);
  assert.equal(restoreGraphViewport(rootStub(), null), false);
});

test('the same member list keeps its scroll position across zoom and reading return', () => {
  const snapshot = captureGraphViewport(rootStub({ members: ['a', 'b', 'c'] }));
  for (const options of [{}, { zoom: 'fit' }, { expanded: true }]) {
    const next = rootStub({ members: ['a', 'b', 'c'], ...options });
    next.detailBody.scrollTop = 0;
    restoreGraphViewport(next, snapshot);
    assert.equal(next.detailBody.scrollTop, 285);
  }
});

test('a different group or folded list does not inherit a previous detail scroll', () => {
  const snapshot = captureGraphViewport(rootStub({ members: ['a', 'b', 'c'] }));
  for (const options of [{ members: ['d', 'e', 'f'] }, { members: ['a', 'b', 'c'], notesOpen: false }]) {
    const next = rootStub(options);
    next.detailBody.scrollTop = 0;
    restoreGraphViewport(next, snapshot, { requireSameLayout: false });
    assert.equal(next.detailBody.scrollTop, 0);
  }
});
