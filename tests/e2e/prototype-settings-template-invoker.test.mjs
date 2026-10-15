import test from 'node:test';
import assert from 'node:assert/strict';
import {optionalPlaywright,startPrototypeStack} from './prototype-copy-test-helpers.mjs';

test('template preview restores its actual invoking button when activation leaves editor focus in place', async t => {
  if (process.env.RUN_BROWSER_E2E !== '1') { t.skip('Set RUN_BROWSER_E2E=1'); return; }
  const pw = await optionalPlaywright(t); if (!pw) return;
  const stack = await startPrototypeStack(t,pw); if (!stack) return;
  const {page} = stack;
  await page.setViewportSize({width:320,height:844});
  await page.locator('.rail-btn[data-module="settings"]').click();
  await page.locator('#settingsMobileItemSelect').selectOption('permanent-template');
  const editor = page.locator('#settingsPermanentTemplateEditor');
  await editor.waitFor({state:'visible'});
  const original = await editor.inputValue();
  await editor.focus();
  const preview = page.locator('[data-settings-template-kind="permanent"] [data-settings-template-action="preview"]');
  await preview.evaluate(button => button.click());
  await page.locator('#settingsTemplatePreviewModal.is-open').waitFor();
  assert.equal(await page.locator('#settingsTemplatePreviewClose').evaluate(button => button === document.activeElement),true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#settingsTemplatePreviewModal').isVisible(),false);
  assert.equal(await preview.evaluate(button => button === document.activeElement),true,'Closing preview must return focus to the button that invoked it');
  assert.equal(await editor.inputValue(),original);
});
