import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGraphVisualMapChrome,
  createGraphVisualMapShellDeps,
  graphVisualMapEmptyCopy
} from "../../apps/web/src/graph-visual-map-chrome.js";

const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

test("graph visual map chrome keeps shell deps and renders zoom and defs slots", () => {
  const deps = createGraphVisualMapShellDeps({ escapeHtml, renderGraphIcon: (name) => `<i>${name}</i>` });

  assert.equal(deps.escapeHtml, escapeHtml);
  assert.equal(deps.renderGraphIcon("x"), "<i>x</i>");
  assert.equal(deps.labels.canvas, "Zoomable graph canvas");

  const chrome = buildGraphVisualMapChrome({
    runtimeState: {
      zoom: { key: "read" },
      zoomIndex: 2,
      readingLens: { key: "overview" },
      modeMeta: { label: "Argument" }
    },
    graphShellPreviewProps: { readingLensTrailingMarkup: "<button>trail</button>" }
  }, {
    escapeHtml,
    renderGraphIcon: deps.renderGraphIcon,
    renderGraphZoomStepperView: ({ zoomKey, zoomIndex }, shellDeps) => `${shellDeps.labels.zoomControls}:${zoomKey}:${zoomIndex}`,
    renderGraphMapSvgDefsView: ({ markerColors }) => `defs:${Object.keys(markerColors).join(",")}`,
    renderGraphMapEmptyStateView: ({ title }) => `empty:${title}`,
    renderGraphViewModeSwitcher: (relationType) => `<nav>${relationType}</nav>`,
    renderGraphReadingLensControls: (lens, open, trailing) => `<section>${lens}:${open}:${trailing}</section>`,
    graphViewModeForRelationType: () => "argument",
    zoomOptions: { fit: {}, read: {} },
    markerColors: { support: "#fff" }
  });

  assert.equal(chrome.zoomStepperMarkup, "Graph zoom:read:2");
  assert.equal(chrome.svgDefsMarkup, "defs:support");
  assert.match(chrome.headContentMarkup, /<nav>meaningful<\/nav>/);
  assert.match(chrome.headContentMarkup, /<section>overview:false:<button>trail<\/button><\/section>/);
  assert.equal(chrome.emptyStateMarkup, "empty:Argument当前没有可见笔记");
});

test("graph visual map chrome renders focused-note controls in filter mode", () => {
  const chrome = buildGraphVisualMapChrome({
    runtimeState: {
      focusDepth: { key: "2", label: "Two", note: "Two hops" },
      focusContextAvailable: true,
      focusContextCollapsed: true
    },
    filterActive: true
  }, {
    escapeHtml,
    renderGraphZoomStepperView: () => "",
    renderGraphMapSvgDefsView: () => "",
    renderGraphMapEmptyStateView: ({ title, message }) => `${title}:${message}`,
    graphFocusDepthMeta: (value) => ({ key: value, label: `Depth ${value}`, note: `<${value}>` })
  });

  assert.match(chrome.headContentMarkup, /data-graph-focus-depth="2" aria-pressed="true"/);
  assert.match(chrome.headContentMarkup, /data-graph-focus-context-toggle="open"/);
  assert.match(chrome.emptyStateMarkup, /^这条笔记周围/);
});

test("graph visual map empty copy distinguishes structure mode", () => {
  const copy = graphVisualMapEmptyCopy({
    modeLabel: "Structure",
    relationType: "index",
    graphViewModeForRelationType: () => "structure"
  });

  assert.equal(copy.title, "Structure当前没有可见笔记");
  assert.match(copy.message, /主题分布/);
});
