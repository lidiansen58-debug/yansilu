import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGraphVisualMapShellProps,
  graphSelectionUsesOverlay
} from "../../apps/web/src/graph-visual-map-shell-props.js";

function runtime(overrides = {}) {
  return {
    expanded: true,
    readingLens: { key: "bridge" },
    readingLensState: { active: true },
    activeSelection: null,
    selectionNodeNeedsRelationWorkflow: false,
    researchNavigatorCanOpen: true,
    layout: {
      nodes: [{ id: "n1" }],
      width: 960,
      height: 520
    },
    zoom: { key: "read" },
    zoomWidth: 1440,
    zoomHeight: 780,
    ...overrides
  };
}

test("graph visual shell props carry interaction and layout state", () => {
  const props = buildGraphVisualMapShellProps({
    runtimeState: runtime(),
    toolbarMarkup: "<nav>toolbar</nav>",
    headContentMarkup: "<header>head</header>",
    legendMarkup: "<section>legend</section>",
    zoomStepperMarkup: "<div>zoom</div>",
    svgDefsMarkup: "<defs></defs>",
    nodeMarkup: "<g>node</g>",
    edgeMarkup: "<g>edge</g>"
  });

  assert.equal(props.expanded, true);
  assert.equal(props.readingLensActive, true);
  assert.equal(props.readingLensKey, "bridge");
  assert.equal(props.zoomKey, "read");
  assert.equal(props.zoomWidth, 1440);
  assert.equal(props.zoomHeight, 780);
  assert.equal(props.layoutWidth, 960);
  assert.equal(props.layoutHeight, 520);
  assert.equal(props.hasNodes, true);
  assert.match(props.toolbarMarkup, /toolbar/);
  assert.match(props.nodeMarkup, /node/);
  assert.match(props.edgeMarkup, /edge/);
});

test("graph visual shell props route isolated selections into overlay", () => {
  const props = buildGraphVisualMapShellProps({
    runtimeState: runtime({ activeSelection: { kind: "isolated", noteId: "n1" } }),
    selectionContextMarkup: "<section>selection</section>",
    focusContextMarkup: "<aside>focus</aside>"
  });

  assert.equal(graphSelectionUsesOverlay("isolated"), true);
  assert.equal(props.selectionKind, "isolated");
  assert.equal(props.selectionOverlayMarkup, "<section>selection</section>");
  assert.equal(props.sidePanelMarkup, '<div class="graph-side-stack"><aside>focus</aside></div>');
});

test("graph visual shell props keep regular selections in side panel", () => {
  const props = buildGraphVisualMapShellProps({
    runtimeState: runtime({ activeSelection: { kind: "node", nodeId: "n1" } }),
    selectionContextMarkup: "<section>node selection</section>",
    workbenchPanelMarkup: "<aside>workbench</aside>"
  });

  assert.equal(graphSelectionUsesOverlay("node"), false);
  assert.equal(props.selectionOverlayMarkup, "");
  assert.equal(props.sidePanelMarkup, '<div class="graph-side-stack"><aside>workbench</aside><section>node selection</section></div>');
});

test("graph visual shell props expose research navigator entry to reading lens controls", () => {
  const props = buildGraphVisualMapShellProps({
    runtimeState: runtime({ researchNavigatorCanOpen: true }),
    workbenchEntryMarkup: "<button>workbench</button>",
    researchNavigatorMarkup: "<aside>navigator</aside>",
    researchNavigatorEntryMarkup: "<button>navigator</button>"
  });

  assert.equal(props.researchNavigatorOpen, true);
  assert.equal(props.readingLensTrailingMarkup, "<button>workbench</button><button>navigator</button>");
  assert.equal(props.sidePanelMarkup, '<div class="graph-side-stack"><aside>navigator</aside></div>');
});
