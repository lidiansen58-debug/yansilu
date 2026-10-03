import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { installSettingsAiEventBindings } from "../../apps/web/src/settings-ai-event-bindings.js";
import { renderAiLocalModelControlsForRuntime } from "../../apps/web/src/settings-ai-controls-view.js";

test("the rendered settings shell contains a visible mode selector connected to runtime changes", async () => {
  const html = await fs.readFile(new URL("../../apps/web/src/prototype.html", import.meta.url), "utf8");
  assert.match(html, /<label[^>]+for="settingsAiRuntimeMode"[^>]*>AI 模式<\/label>/);
  const select = html.match(/<select id="settingsAiRuntimeMode">([\s\S]*?)<\/select>/);
  assert.ok(select);
  for (const mode of ["auto", "local_only", "cloud_only", "off"]) assert.ok(select[1].includes(`value="${mode}"`));
  assert.doesNotMatch(html, /<button[^>]+id="settingsAiOffAction"/);
  assert.match(html, /<button[^>]+data-settings-ai-dialog-open="test"[^>]*>重新测试<\/button>/);
  const node = { value: "auto", addEventListener(_type, handler) { this.change = handler; } };
  const $ = id => id === "settingsAiRuntimeMode" ? node : null;
  const changes = [];
  installSettingsAiEventBindings({ $, documentRef: null, applyAiRuntimeModeChange: async mode => changes.push(mode) });
  renderAiLocalModelControlsForRuntime({ $, settingsState: { ai: { runtimeMode: "local_only" } } });
  assert.equal(node.value, "local_only");
  await node.change({ target: { value: "cloud_only" } });
  await node.change({ target: { value: "off" } });
  assert.deepEqual(changes, ["cloud_only", "off"]);
});
