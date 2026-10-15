import assert from "node:assert/strict";

export async function adoptWhileTyping({ page, apiBase, fixture }) {
  const noteRoute = `/api/v1/notes/${fixture.noteId}`;
  const original = (await (await fetch(apiBase + noteRoute)).json()).item;
  const editorBody = await page.locator('#editorBody').inputValue();
  assert.equal(editorBody.trimEnd(), original.body.trimEnd());
  let release, arrived, completed, failed, handlerError, handlerStarted = false, timeout;
  const gate = new Promise(resolve => { release = resolve; });
  const adopted = new Promise((resolve, reject) => { arrived = resolve; failed = reject; });
  const handled = new Promise(resolve => { completed = resolve; });
  const routePattern = `**/api/v1/ai/inbox/${fixture.artifactId}/adopt-field-suggestion*`;
  const handler = async route => {
    handlerStarted = true;
    try {
      const body = route.request().postDataJSON();
      assert.equal(body.expectedRevision, original.fileRevision);
      assert.equal(body.confirm, true);
      const response = await route.fetch();
      assert.equal(response.status(), 200, await response.text());
      arrived();
      await gate;
      await route.fulfill({ response });
    } catch (error) { handlerError = error; failed(error); }
    finally { completed(); }
  };
  await page.route(routePattern, handler);
  const marker = "等待采纳响应时输入的人工正文，必须保留。";
  let localBody;
  try {
    await page.locator(`[data-note-ai-suggestion-id="${fixture.suggestionId}"] [data-note-ai-suggestion-action="adopted_as_draft"]`).click();
    await Promise.race([adopted, new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error('Adoption request did not complete before pending-input verification')), 12000);
    })]);
    clearTimeout(timeout);
    await page.locator('#btnHideRelated').click();
    const content = page.locator('#editorHost .cm-content[contenteditable="true"]');
    assert.equal(await content.isVisible(), true, JSON.stringify(await page.evaluate(() => ({
      source: document.querySelector('#markdownSplit')?.className,
      fields: [...document.querySelectorAll('[contenteditable], #editorBody')].map(e => ({ id: e.id, cls: e.className, visible: !!e.getClientRects().length }))
    }))));
    await content.click({ timeout: 3000 });
    await page.keyboard.press("Control+End");
    await page.keyboard.insertText("\n\n" + marker);
    localBody = await page.locator("#editorBody").inputValue();
    assert.equal(localBody, editorBody.trimEnd() + "\n\n" + marker);
    release();
    const saved = (await (await fetch(apiBase + noteRoute)).json()).item;
    await page.waitForFunction(({ revision, body }) => {
      const tab = window.__prototypeEditor?.activeTab?.();
      return tab?.savedFileRevision === revision && tab.body === body && tab.dirty;
    }, { revision: saved.fileRevision, body: localBody });
    assert.equal(saved.body, original.body, "adoption itself never saves pending human prose");
    assert.notEqual(saved.fileRevision, original.fileRevision);
    assert.equal(await page.locator("#editorBody").inputValue(), localBody);
    await page.locator('#btnShowRelated').click();
    const details = page.locator('.viewpoint-optional-details');
    if (!await details.evaluate(element => element.open)) await details.locator('summary').click();
    return localBody;
  } finally {
    release();
    clearTimeout(timeout);
    if (handlerStarted) await handled;
    await page.unroute(routePattern, handler);
    if (handlerError) throw handlerError;
  }
}
