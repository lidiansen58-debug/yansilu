import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

test("prototype smart notes demo status uses 项目 wording", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page, webBase } = stack;

  await page.goto(`${webBase}/prototype?demo=smart-notes-product-thinking`, { waitUntil: "networkidle" });

  await waitFor(async () => {
    const statusText = await page.locator("#statusText").textContent();
    assert.match(String(statusText || ""), /Smart Notes 产品思考 Demo/);
    assert.match(String(statusText || ""), /个项目/);
    assert.doesNotMatch(String(statusText || ""), /个写作项目/);
  }, 15000);

  await waitFor(async () => {
    const walkthroughText = await page.locator("[data-smart-notes-demo-walkthrough]").textContent();
    assert.match(String(walkthroughText || ""), /Smart Notes 五步 walkthrough/);
    assert.match(String(walkthroughText || ""), /看来源变判断/);
    assert.match(String(walkthroughText || ""), /补一条关系理由/);
    assert.match(String(walkthroughText || ""), /打开写作中心/);
  }, 15000);
});
