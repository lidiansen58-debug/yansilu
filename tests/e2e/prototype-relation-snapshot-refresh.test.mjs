import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack, postJson, waitFor } from "./prototype-copy-test-helpers.mjs";

for (const width of [1366, 390]) {
  for (const fail of [false, true]) {
    test(`relation recommendations keep their saved snapshot during ${fail ? "failed" : "delayed"} refresh (${width}px)`, async t => {
      if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
      const pw = await optionalPlaywright(t);
      if (!pw) return;
      const stack = await startPrototypeStack(t, pw);
      if (!stack) return;
      const { page, apiBase } = stack;
      const create = async title => (await postJson(apiBase, "/api/v1/notes", {
        directoryId: "dir_original_default", body: `# ${title}\n\n独立观点。`
      })).json.item;
      const source = await create("刷新来源"), saved = await create("已关联目标"), next = await create("未关联目标");
      const relation = (await postJson(apiBase, `/api/v1/notes/${source.id}/relations`, {
        toNoteId: saved.id, relationType: "supports", rationale: "保存的独立论据。"
      })).json.item;
      await page.locator("#btnToggleSearch").click();
      await page.locator(`[data-search-note="${source.id}"]`).click();
      await page.waitForFunction(() => window.__prototypeEditor.semanticRelationsState === "loaded");
      await page.setViewportSize({ width, height: 900 });
      let release, entered;
      const held = new Promise(done => { release = done; });
      const started = new Promise(done => { entered = done; });
      t.after(() => release());
      await page.route(`**/api/v1/notes/${source.id}/relations`, async route => {
        entered();
        await held;
        if (fail) return route.fulfill({ status: 503, json: { error: "read unavailable" } });
        const response = await route.fetch();
        await route.fulfill({ response });
      });
      await page.evaluate(({ source, saved, next }) => {
        const editor = window.__prototypeEditor;
        editor.upsertApiNotes([source, saved, next]);
        editor.noteAiAnalysisByNoteId.set(source.id, { relationCandidates: [saved, next].map(note => ({
          targetNoteId: note.id, targetTitle: note.title, relationType: "supports"
        })) });
        editor.renderRelated();
        editor.openPermanentRelationWorkspace({ noteId: source.id });
        editor.permanentRelationWorkspaceState.mode = "ai";
        editor.syncPermanentRelationWorkspaceOverlay();
      }, { source, saved, next });
      await started;
      const choices = page.locator("[data-permanent-relation-ai-target]");
      assert.deepEqual(await choices.evaluateAll(nodes => nodes.map(node => node.dataset.permanentRelationAiTarget)), [next.id]);
      assert.ok(await page.evaluate(() => window.__prototypeEditor.currentSemanticRelations));
      if (!fail) {
        const response = await fetch(`${apiBase}/api/v1/relations/${relation.id}`, { method: "DELETE" });
        assert.ok(response.ok);
      }
      release();
      if (fail) {
        await page.waitForFunction(() => window.__prototypeEditor.semanticRelationsState === "error");
        assert.deepEqual(await choices.evaluateAll(nodes => nodes.map(node => node.dataset.permanentRelationAiTarget)), [next.id]);
      } else {
        await waitFor(async () => assert.deepEqual(await choices.evaluateAll(nodes => nodes.map(node => node.dataset.permanentRelationAiTarget)), [saved.id, next.id]));
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    });
  }
}
