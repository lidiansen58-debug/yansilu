import test from "node:test";
import assert from "node:assert/strict";
import {
  renderGraphMapEmptyStateView,
  renderGraphMapSvgDefsView,
  renderGraphVisualMapShellView,
  renderGraphZoomStepperView
} from "../../apps/web/src/graph-visual-map-shell.js";

const iconDeps = {
  renderGraphIcon: (name) => `<i data-icon="${name}"></i>`
};

test("graph visual map shell renders zoom stepper controls from options", () => {
  const markup = renderGraphZoomStepperView(
    {
      zoomKey: "read",
      zoomIndex: 1,
      zoomOptions: {
        fit: { label: "Fit", note: "Fit note", icon: "fit-icon" },
        read: { label: "Read", note: "Read note", icon: "read-icon" },
        detail: { label: "Detail", note: "Detail note", icon: "detail-icon" }
      }
    },
    iconDeps
  );

  assert.match(markup, /data-graph-zoom-step="-1"/);
  assert.match(markup, /data-graph-zoom-step="1"/);
  assert.match(markup, /data-graph-zoom-option="read"/);
  assert.match(markup, /aria-pressed="true"/);
  assert.match(markup, /data-icon="read-icon"/);
  assert.match(markup, /也可以用鼠标滚轮缩放/);
});

test("graph visual map shell renders svg defs with relation markers", () => {
  const markup = renderGraphMapSvgDefsView({ markerColors: { support: "#123456" } });

  assert.match(markup, /id="graph-arrow-support"/);
  assert.match(markup, /stroke="#123456"/);
  assert.match(markup, /markerWidth="4\.2" markerHeight="4\.2"/);
  assert.match(markup, /id="graph-node-core-fill"/);
  assert.match(markup, /id="graph-nebula-blur"/);
});

test("graph visual map shell composes canvas, svg layers, side panel, and overlay slots", () => {
  const markup = renderGraphVisualMapShellView(
    {
      expanded: true,
      readingLensActive: true,
      readingLensKey: "questions",
      selectionKind: "node",
      toolbarMarkup: "<nav>toolbar</nav>",
      headContentMarkup: "<header>head</header>",
      legendMarkup: "<aside>legend</aside>",
      hasNodes: true,
      sidePanelMarkup: "<section>side</section>",
      selectionOverlayMarkup: "<dialog>overlay</dialog>",
      zoomKey: "detail",
      zoomWidth: 1200,
      zoomHeight: 800,
      canvasHelpHintVisible: true,
      layoutWidth: 1000,
      layoutHeight: 700,
      zoomStepperMarkup: "<button>zoom</button>",
      svgDefsMarkup: "<marker></marker>",
      nebulaMarkup: "<ellipse></ellipse>",
      clusterGlowMarkup: "<g>cluster</g>",
      starfieldMarkup: "<circle></circle>",
      themeBoundaryMarkup: "<path></path>",
      edgeMarkup: "<g>edges</g>",
      nodeMarkup: "<g>nodes</g>"
    },
    iconDeps
  );

  assert.match(markup, /graph-map-panel is-expanded has-reading-lens is-reading-lens-questions is-selecting-node/);
  assert.match(markup, /<div class="graph-map-head">/);
  assert.match(markup, /<nav>toolbar<\/nav>/);
  assert.match(markup, /class="graph-map-stage has-side-panel has-selection-overlay"/);
  assert.match(markup, /class="graph-map-viewport" data-graph-zoom="detail"/);
  assert.match(markup, /<div class="graph-map-canvas">[\s\S]*<section>side<\/section>[\s\S]*<\/div>/);
  assert.match(markup, /class="graph-canvas-help-hint"/);
  assert.match(markup, /滚轮缩放，拖动查看，点击笔记看详情/);
  assert.match(markup, /class="graph-map-svg" data-graph-zoom="detail" viewBox="0 0 1000 700"/);
  assert.match(markup, /--graph-zoom-width: 1200px; --graph-zoom-height: 800px;/);
  assert.match(markup, /class="graph-map-edges"><g>edges<\/g>/);
  assert.match(markup, /class="graph-selection-overlay"/);
});

test("graph visual map shell renders empty state through a slot", () => {
  const emptyState = renderGraphMapEmptyStateView({ title: "No notes", message: "Try another mode" }, iconDeps);
  const markup = renderGraphVisualMapShellView({ hasNodes: false, emptyStateMarkup: emptyState }, iconDeps);

  assert.match(markup, /graph-map-empty-canvas/);
  assert.match(markup, /No notes/);
  assert.match(markup, /Try another mode/);
  assert.match(markup, /data-graph-task-view="structure"/);
  assert.match(markup, /data-graph-task-view="relations"/);
  assert.match(markup, /data-graph-task-view="themes"/);
  assert.doesNotMatch(markup, /data-graph-view-mode=/);
});
