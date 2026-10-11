import test from "node:test";
import assert from "node:assert/strict";
import { createGraphGuidanceFixture } from "./prototype-graph-guidance-flow-helpers.mjs";
import { waitFor } from "./prototype-copy-test-helpers.mjs";

test("a real body link is readable in graph and opens its source without starting writing", async t => {
  const f = await createGraphGuidanceFixture(t, "body");
  if (!f) return;
  const { page, notes } = f;
  const edge = page.locator(".graph-map-edge-group");
  await edge.waitFor(); assert.equal(await edge.count(), 1);
  await edge.focus(); await edge.press("Enter");
  const panel = page.locator(".graph-selection-panel:visible");
  await panel.waitFor();
  assert.match(await panel.innerText(), /正文关联|来源笔记正文/);
  assert.doesNotMatch(await panel.innerText(), /markdown_wikilink|graph_followup/);
  await f.assertSourcesUnchanged(); await f.assertNoWriting();
  await panel.locator(`[data-open-note="${notes[0].id}"]`).click();
  await page.locator("#wysiwygHost:visible").waitFor();
  await waitFor(async () => assert.match(await page.locator("#wysiwygHost").innerText(), /正文链接目标/));
  await f.assertSourcesUnchanged(); await f.assertNoWriting();
});
