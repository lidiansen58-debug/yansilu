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

test("graph visual map head renders task toolbar, queue, and density slots without legend row", () => {
  const html = buildGraphVisualMapHeadContent({
    relationType: "index",
    compactRelationFilterMarkup: "<filter></filter>",
    isolatedQueueStripMarkup: "<queue></queue>",
    structureFallback: true,
    graphShellPreviewProps: { readingLensTrailingMarkup: "<overview></overview><trail></trail>" },
    runtimeState: {
      readingLens: { key: "bridge" },
      legendOpen: true,
      showDensityHint: true
    }
  }, {
    renderGraphViewModeSwitcher: (relationType, activeLens) => `<mode>${relationType}:${activeLens}</mode>`,
    renderGraphReadingLensControls: (lens, open, trailing) => `<lens>${lens}:${open}:${trailing}</lens>`
  });

  assert.match(html, /graph-map-primary-row/);
  assert.match(html, /graph-map-mode-hint/);
  assert.match(html, /找主题/);
  assert.match(html, /data-run-graph-ai-analysis="theme"/);
  assert.match(html, />发现主题<\/button>/);
  assert.match(html, /<mode>index:bridge<\/mode>/);
  assert.match(html, /<filter><\/filter>/);
  assert.doesNotMatch(html, /<lens>/);
  assert.match(html, /<queue><\/queue>/);
  assert.doesNotMatch(html, /graph-structure-fallback-note/);
  assert.match(html, /graph-density-hint/);
});

test("graph visual map head marks gap action as gap mode", () => {
  const html = buildGraphVisualMapHeadContent({
    relationType: "meaningful",
    runtimeState: {
      readingLens: { key: "bridge" }
    }
  }, {
    renderGraphViewModeSwitcher: () => ""
  });

  assert.match(html, /data-run-graph-ai-analysis="gap"/);
  assert.match(html, />检查缺口<\/button>/);
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
  assert.match(html, /aria-label="Depth 2：&lt;2&gt;"/);
  assert.match(html, /title="&lt;2&gt;"/);
  assert.doesNotMatch(html, /Around &lt;note&gt;/);
  assert.match(html, /data-graph-focus-context-toggle="close"/);
  assert.doesNotMatch(html, /graph-map-primary-row/);
});
