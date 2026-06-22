import test from "node:test";
import assert from "node:assert/strict";

import {
  renderGraphPromptDetailsView,
  renderGraphSelectionMetricsView,
  renderGraphSelectionShellView,
  renderGraphSelectionTaskView
} from "../../apps/web/src/graph-selection-panel.js";

const deps = {
  renderGraphIcon: (name) => `<i>${name}</i>`,
  graphSafeActionAttrs: (value) => String(value || "").replace("onclick", "")
};

test("graph selection metrics skip empty values and escape labels", () => {
  const html = renderGraphSelectionMetricsView([
    { label: "<类型>", value: "3", hint: "关系" },
    { label: "空", value: "" }
  ]);

  assert.match(html, /&lt;类型&gt;/);
  assert.match(html, /<strong>3<\/strong>/);
  assert.match(html, /<em>关系<\/em>/);
  assert.doesNotMatch(html, />空</);
});

test("graph selection task renders status, badge, and safe primary action", () => {
  const html = renderGraphSelectionTaskView(
    {
      tone: "warn",
      status: "需要补理由",
      detail: "先判断为什么相关",
      badge: "待处理",
      actionLabel: "去处理",
      actionAttrs: 'data-action="open" onclick="bad()"'
    },
    deps
  );

  assert.match(html, /graph-selection-task is-warn/);
  assert.match(html, /需要补理由/);
  assert.match(html, /待处理/);
  assert.match(html, /data-action="open"/);
  assert.doesNotMatch(html, /onclick/);
});

test("graph prompt details only render non-empty prompts", () => {
  const html = renderGraphPromptDetailsView("提示", ["先问什么", "", "再判断什么"]);

  assert.match(html, /graph-selection-prompt-details/);
  assert.match(html, /<summary>提示<\/summary>/);
  assert.match(html, /先问什么/);
  assert.match(html, /再判断什么/);
});

test("graph selection shell composes head, role, task, body, and actions", () => {
  const html = renderGraphSelectionShellView(
    {
      className: "is-node",
      kicker: "节点",
      title: "笔记 A",
      meta: "2 条关系",
      roleLabel: "位置",
      roleDetail: "连接主题",
      task: { status: "继续判断" },
      body: "<section>正文</section>",
      actions: "<button>操作</button>"
    },
    deps
  );

  assert.match(html, /graph-selection-panel is-node/);
  assert.match(html, /data-graph-selection-close/);
  assert.match(html, /graph-selection-role/);
  assert.match(html, /graph-selection-task/);
  assert.match(html, /<section>正文<\/section>/);
  assert.match(html, /<button>操作<\/button>/);
});
