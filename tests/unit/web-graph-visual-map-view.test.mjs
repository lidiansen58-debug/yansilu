import test from "node:test";
import assert from "node:assert/strict";
import {
  graphClusterAnchorAngles,
  renderGraphClusterGlowView,
  renderGraphNebulaFieldView,
  renderGraphStarfieldView
} from "../../apps/web/src/graph-visual-map-view.js";

function countMatches(value = "", pattern) {
  return [...String(value || "").matchAll(pattern)].length;
}

test("graph visual view computes stable cluster anchor angles", () => {
  assert.deepEqual(graphClusterAnchorAngles(0), []);
  assert.equal(graphClusterAnchorAngles(1).length, 1);
  assert.equal(graphClusterAnchorAngles(4).length, 4);

  const angles = graphClusterAnchorAngles(6);
  assert.equal(angles.length, 6);
  assert.equal(angles[0], -Math.PI / 2);
  assert.equal(Number((angles[1] - angles[0]).toFixed(6)), Number(((Math.PI * 2) / 6).toFixed(6)));
});

test("graph visual view renders deterministic starfield markup", () => {
  const hash = (value = "") => String(value).length * 17;
  const first = renderGraphStarfieldView(200, 100, "seed", { hash });
  const second = renderGraphStarfieldView(200, 100, "seed", { hash });

  assert.equal(first, second);
  assert.equal(countMatches(first, /class="graph-map-star/g), 96);
  assert.match(first, /<circle class="graph-map-star/);
  assert.match(first, /opacity="\d+\.\d{2}"/);
});

test("graph visual view renders the nebula field as escaped svg ellipses", () => {
  const markup = renderGraphNebulaFieldView(1200, 640, "graph", { hash: () => 42 });

  assert.equal(countMatches(markup, /class="graph-map-nebula/g), 6);
  assert.match(markup, /<ellipse class="graph-map-nebula is-teal"/);
  assert.match(markup, /transform="rotate\(/);
});

test("graph visual view renders selectable cluster glow markup with escaped labels", () => {
  const markup = renderGraphClusterGlowView(
    [
      {
        clusterKey: "cluster<&1>",
        title: "Topic & detail",
        tone: "teal<tone>",
        cx: 10,
        cy: 20,
        rx: 30,
        ry: 40,
        opacity: 0.234,
        rotation: 12
      },
      null
    ],
    { formatSummaryLabel: (title) => `Open ${title}` }
  );

  assert.equal(countMatches(markup, /class="graph-map-cluster-glow/g), 1);
  assert.match(markup, /data-graph-select-cluster="cluster&lt;&amp;1&gt;"/);
  assert.match(markup, /role="button"/);
  assert.match(markup, /tabindex="0"/);
  assert.match(markup, /aria-label="Open Topic &amp; detail"/);
  assert.match(markup, /class="graph-map-cluster-glow is-teal&lt;tone&gt;"/);
  assert.match(markup, /opacity="0\.23"/);
});
