import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGraphVisualMapHeadContent
} from "../../apps/web/src/graph-visual-map-head.js";

const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

test("graph visual map head renders default toolbar, lens, queue, and density slots", () => {
  const html = buildGraphVisualMapHeadContent({
    relationType: "index",
    compactRelationFilterMarkup: "<filter></filter>",
    isolatedQueueStripMarkup: "<queue></queue>",
    structureFallback: true,
    graphShellPreviewProps: { readingLensTrailingMarkup: "<trail></trail>" },
    runtimeState: {
      readingLens: { key: "bridge" },
      legendOpen: true,
      showDensityHint: true
    }
  }, {
    renderGraphViewModeSwitcher: (relationType) => `<mode>${relationType}</mode>`,
    renderGraphReadingLensControls: (lens, open, trailing) => `<lens>${lens}:${open}:${trailing}</lens>`
  });

  assert.match(html, /graph-map-primary-row/);
  assert.match(html, /<mode>index<\/mode>/);
  assert.match(html, /<filter><\/filter>/);
  assert.match(html, /<lens>bridge:true:<trail><\/trail><\/lens>/);
  assert.match(html, /<queue><\/queue>/);
  assert.match(html, /graph-structure-fallback-note/);
  assert.match(html, /graph-density-hint/);
});

test("graph visual map head renders focused note depth controls in filter mode", () => {
  const html = buildGraphVisualMapHeadContent({
    filterActive: true,
    runtimeState: {
      focusDepth: { key: "2", label: "Two <hops>", note: "Around <note>" },
      focusContextAvailable: true,
      focusContextCollapsed: false
    }
  }, {
    escapeHtml,
    graphFocusDepthMeta: (value) => ({ key: value, label: `Depth ${value}`, note: `<${value}>` })
  });

  assert.match(html, /graph-section-title/);
  assert.match(html, /data-graph-focus-depth="2" aria-pressed="true"/);
  assert.match(html, /title="&lt;2&gt;"/);
  assert.match(html, /Around &lt;note&gt;/);
  assert.match(html, /data-graph-focus-context-toggle="close"/);
  assert.doesNotMatch(html, /graph-map-primary-row/);
});
