import test from "node:test";
import assert from "node:assert/strict";

import {
  renderWritingStrongModelSummaryDom
} from "../../apps/web/src/writing-strong-model-panel.js";

test("writing strong model panel syncs button state and idle summary", () => {
  const button = { disabled: false, textContent: "" };
  const summary = { textContent: "" };
  const basketIds = ["n1", "n2"];

  const result = renderWritingStrongModelSummaryDom({
    writingState: {},
    panelState: {
      strongModelButtonState: { disabled: true, text: "Wait" }
    },
    strongModelState: { hint: "Need richer material" },
    basketIds,
    strongModelButton: button,
    strongModelSummary: summary,
    describeWritingStrongModelIdleSummary: ({ basketCount, strongModelStateHint }) => `${basketCount}:${strongModelStateHint}`
  });

  assert.equal(result, basketIds);
  assert.equal(button.disabled, true);
  assert.equal(button.textContent, "Wait");
  assert.equal(summary.textContent, "2:Need richer material");
});

test("writing strong model panel summarizes prepared and completed requests", () => {
  const prepared = { textContent: "" };
  renderWritingStrongModelSummaryDom({
    writingState: {
      strongModelResult: {
        request: { model: { model: "gpt-test" } }
      }
    },
    panelState: { strongModelButtonState: { disabled: false, text: "" } },
    strongModelSummary: prepared
  });
  assert.match(prepared.textContent, /gpt-test/);

  const completed = { textContent: "" };
  renderWritingStrongModelSummaryDom({
    writingState: {
      strongModelResult: {
        request: { model: { model: "gpt-test" } },
        result: { summary: { artifactCount: 3 } }
      }
    },
    panelState: { strongModelButtonState: { disabled: false, text: "" } },
    strongModelSummary: completed
  });
  assert.match(completed.textContent, /3/);
});

test("writing strong model panel shows error before other states", () => {
  const summary = { textContent: "" };

  renderWritingStrongModelSummaryDom({
    writingState: {
      strongModelError: "network",
      strongModelLoading: true,
      strongModelResult: {
        request: { model: { model: "gpt-test" } }
      }
    },
    panelState: { strongModelButtonState: { disabled: false, text: "" } },
    strongModelSummary: summary
  });

  assert.match(summary.textContent, /network/);
  assert.doesNotMatch(summary.textContent, /gpt-test/);
});
