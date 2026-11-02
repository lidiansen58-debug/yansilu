import test from "node:test";
import assert from "node:assert/strict";
import { seedSmartNotesProductThinking } from "../../scripts/seed-smart-notes-product-thinking.mjs";
import { optionalPlaywright, startPrototypeStack } from "./prototype-copy-test-helpers.mjs";

for (const width of [390, 320]) {
test(`a ${width}px first visit shows readable demo titles and touch targets before any zoom action`, { timeout: 60000 }, async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t); if (!pw) return;
  const stack = await startPrototypeStack(t, pw, {
    prepareVault: vault => seedSmartNotesProductThinking(vault),
    beforeNavigate: page => page.setViewportSize({ width, height: 844 })
  });
  if (!stack) return;
  const { page } = stack;
  await page.locator('.rail-btn[data-module="graph"]').click();
  await page.waitForFunction(() => window.__prototypeState.graphConnectivityReady);
  const svg = page.locator('.graph-map-svg');
  assert.equal(await svg.getAttribute('data-graph-zoom'), 'read');
  const visible = await page.locator('.graph-map-viewport').evaluate(frame => {
    const viewport = frame.getBoundingClientRect();
    return [...frame.querySelectorAll('.graph-map-node')].flatMap(node => {
      const label = node.querySelector('text'), box = label?.getBoundingClientRect();
      if (!box || box.right <= viewport.left || box.left >= viewport.right || box.bottom <= viewport.top || box.top >= viewport.bottom) return [];
      return [{ font: parseFloat(getComputedStyle(label).fontSize) * label.getScreenCTM().a,
        target: node.querySelector('.graph-map-node-hit').getBoundingClientRect().width }];
    });
  });
  assert.ok(visible.length > 0);
  assert.ok(visible.every(note => note.font >= 12 && note.target >= 44), JSON.stringify(visible));
  await page.locator('[data-graph-zoom-option="fit"]').click();
  await page.locator('[data-graph-task-view="themes"]').click();
  assert.equal(await svg.getAttribute('data-graph-zoom'), 'fit', 'A chosen overview survives the next render');
});
}
