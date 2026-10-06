import test from "node:test";
import assert from "node:assert/strict";

import {
  renderWritingBeginnerMainlineView,
  writingBeginnerMainline
} from "../../apps/web/src/beginner-onboarding-flow.js";

test("writing beginner mainline exposes one stage and one action", () => {
  const material = writingBeginnerMainline({ basketCount: 0 });
  const theme = writingBeginnerMainline({
    basketCount: 3,
    hasProject: false,
    projectEntry: { actionLabel: "确定可写主题" }
  });
  const draft = writingBeginnerMainline({
    basketCount: 3,
    hasProject: true,
    hasScaffold: true
  });

  assert.equal(material.label, "选相关笔记");
  assert.equal(theme.label, "确定可写主题");
  assert.equal(draft.label, "保存草稿");
  assert.match(renderWritingBeginnerMainlineView(theme), /data-writing-beginner-mainline/);
  assert.match(renderWritingBeginnerMainlineView(theme), /确定可写主题/);
});
