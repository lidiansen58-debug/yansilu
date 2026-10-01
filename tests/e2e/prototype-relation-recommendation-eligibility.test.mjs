import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack, postJson } from "./prototype-copy-test-helpers.mjs";

for (const width of [1366, 390]) {
  test(`recommendations exclude saved pairs and disappear after saving (${width}px)`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const pw = await optionalPlaywright(t);
    if (!pw) return;
    const stack = await startPrototypeStack(t, pw);
    if (!stack) return;
    const { page, apiBase } = stack;
    const create = async title => (await postJson(apiBase, "/api/v1/notes", {
      directoryId: "dir_original_default", body: `# ${title}\n\n独立的观点。`
    })).json.item;
    const source = await create("推荐来源"), connected = await create("已有入向关联"), next = await create("新的推荐");
    await postJson(apiBase, `/api/v1/notes/${connected.id}/relations`, {
      toNoteId: source.id, relationType: "supports", rationale: "已确认的支持关系。"
    });
    await page.locator("#btnToggleSearch").click();
    await page.locator(`[data-search-note="${source.id}"]`).click();
    await page.waitForFunction(() => window.__prototypeEditor.semanticRelationsState === "loaded");
    await page.setViewportSize({ width, height: 900 });
    // Seed a deterministic AI response; relation reads and saves use the real local service.
    await page.evaluate(({ source, connected, next }) => {
      const editor = window.__prototypeEditor;
      editor.upsertApiNotes([source, connected, next]);
      editor.noteAiAnalysisByNoteId.set(source.id, { relationCandidates: [source, connected, next, next].map(note => ({
        targetNoteId: note.id, targetTitle: note.title, relationType: "supports", rationaleDraft: "它提供了支持当前观点的独立论据。"
      })) });
      editor.openPermanentRelationWorkspace({ noteId: source.id });
      editor.permanentRelationWorkspaceState.mode = "ai";
      editor.syncPermanentRelationWorkspaceOverlay();
    }, { source, connected, next });
    const workspace = page.locator("[data-permanent-relation-workspace]");
    const choices = workspace.locator("[data-permanent-relation-ai-target]");
    assert.equal(await choices.count(), 1);
    assert.equal(await choices.first().getAttribute("data-permanent-relation-ai-target"), next.id);
    await choices.first().click();
    await workspace.locator('button[type="submit"]').click();
    await workspace.locator(".permanent-relation-result").waitFor();
    await page.evaluate(() => {
      const editor = window.__prototypeEditor;
      editor.openPermanentRelationWorkspace({ noteId: editor.activeNote().id });
      editor.permanentRelationWorkspaceState.mode = "ai";
      editor.syncPermanentRelationWorkspaceOverlay();
    });
    assert.equal(await choices.count(), 0);
    assert.match(await workspace.innerText(), /暂时没有推荐/);
    assert.doesNotMatch(await workspace.innerText(), /正在准备推荐/);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  });
}
