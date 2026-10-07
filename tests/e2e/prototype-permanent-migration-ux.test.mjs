import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { parseMarkdownWithFrontmatter, serializeMarkdownWithFrontmatter } from "../../packages/domain/src/frontmatter.mjs";
import { optionalPlaywright, startPrototypeStack, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

for (const width of [1366, 390, 320]) {
  test(`existing permanent notes migrate, retain real relations and enter traceable writing only after confirmation (${width}px)`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const pw = await optionalPlaywright(t);
    if (!pw) return;
    const stack = await startPrototypeStack(t, pw);
    if (!stack) return;
    const { page, apiBase, vaultPath } = stack;
    page.setDefaultTimeout(15000);
    const source = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-migration-ux-source-"));
    const destination = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-migration-ux-export-"));
    t.after(() => fs.rm(source, { recursive: true, force: true }));
    t.after(() => fs.rm(destination, { recursive: true, force: true }));
    const originals = new Map([
      ["explanation.md", "---\ntype: permanent\ntitle: 解释要说明前提\naliases: [解释判断]\nstatus: active\ndistillation_status: confirmed\n---\n# 解释要说明前提\n\n## 一句话论点\n解释一个结论时，应说明它成立的前提。\n\n## 我的依据\n遇到[[反例判断|反例]]时，重新检查遗漏的条件。\n\n![观察记录](assets/chart.png)\n"],
      ["counterexample.md", "---\nnote_type: permanent\ntitle: 反例帮助检验判断\naliases: [反例判断]\n---\n# 反例帮助检验判断\n\n## 一句话论点\n反例能帮助区分判断的适用范围。\n\n## 我的依据\n一次失败不一定推翻结论，也可能暴露尚未说明的条件。\n"],
      ["practice.md", "---\ntype: permanent\ntitle: 用新情境检验观点\n---\n# 用新情境检验观点\n\n## 一句话论点\n把判断用于不同情境，才能观察它的适用范围。\n\n## 我的依据\n解释新案例时，还需要核对[[解释判断|原来的前提]]。\n"]
    ]);
    const revision = { previousThesis: "解释只需要说明结论。", thesis: "解释判断时要核对反例。", reason: "反例提示我补充成立条件。",
      changedAt: "2026-01-02T03:04:05Z", sourceNoteIds: ["pn_old_counterexample"] };
    const pending = { previousThesis: revision.thesis, thesis: "解释一个结论时，应说明它成立的前提。", reason: "新情境要求进一步核对前提。",
      changedAt: "2026-02-03T04:05:06Z", sourceNoteIds: ["pn_old_practice"] };
    const oldIds = { "explanation.md": "pn_old_explanation", "counterexample.md": "pn_old_counterexample", "practice.md": "pn_old_practice" };
    for (const [file, raw] of originals) {
      const { frontmatter, body } = parseMarkdownWithFrontmatter(raw);
      frontmatter.id = oldIds[file];
      if (file === "explanation.md") Object.assign(frontmatter, { starting_question: "一个解释在什么情况下不成立？",
        viewpoint_history: [JSON.stringify(revision)], pending_viewpoint_revision: pending });
      originals.set(file, serializeMarkdownWithFrontmatter(frontmatter, body));
    }
    for (const [file, body] of originals) await fs.writeFile(path.join(source, file), body, "utf8");
    await fs.mkdir(path.join(source, "assets"));
    const image = await fs.readFile("apps/web/src/assets/icons/icon-256.png");
    await fs.writeFile(path.join(source, "assets/chart.png"), image);
    const unchanged = async () => {
      for (const [file, body] of originals) assert.equal(await fs.readFile(path.join(source, file), "utf8"), body);
      assert.deepEqual(await fs.readFile(path.join(source, "assets/chart.png")), image);
    };
    const read = async id => {
      const response = await fetchJson(apiBase, `/api/v1/notes/${id}`);
      assert.equal(response.status, 200, JSON.stringify(response.json));
      return response.json.item;
    };
    const open = async note => {
      await page.locator("#btnToggleSearch").click();
      await page.locator("#globalNoteSearchInput").fill(note.title);
      await page.locator(`[data-search-note="${note.id}"]`).click();
      await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id, note.id);
    };
    const settings = async () => {
      await page.locator('.rail-btn[data-module="settings"]').click();
      if (width === 1366) await page.locator('[data-settings-item="import-export"]').click();
      else await page.locator("#settingsMobileItemSelect").selectOption("import-export");
    };
    const output = "output/playwright/core-permanent-migration";
    await fs.mkdir(output, { recursive: true });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 844 });
    await settings();
    await page.locator("#importPath").fill(source);
    const previewResponse = page.waitForResponse(response => response.url().includes("/imports/preview") && response.request().method() === "POST");
    await page.locator("#btnImportPreview").click();
    const preview = await (await previewResponse).json();
    assert.deepEqual(preview.summary, { sources: 3, literatureNotes: 0, permanentNotes: 3, warnings: 0 });
    await page.locator("#btnImportConfirm:visible").waitFor();
    assert.equal(await page.locator(".candidate-checkbox:checked").count(), 6);
    assert.equal(await page.locator(".candidate-checkbox:disabled").count(), 0);
    assert.equal(await page.locator(".candidate-badge", { hasText: "待确认" }).count(), 3);
    assert.ok((await page.locator(".candidate-checkbox").first().getAttribute("data-candidate-id")).startsWith("pn_"), "Actual notes must appear before source archive metadata");
    assert.match(await page.locator("#importResult .result-brief").innerText(), /草稿保留/);
    assert.equal((await fetchJson(apiBase, "/api/v1/directories/dir_original_default/notes")).json.items.length, 0);
    await unchanged();
    await page.screenshot({ path: `${output}/preview-${width}.png` });
    const confirmResponse = page.waitForResponse(response => /\/imports\/[^/]+\/confirm/.test(response.url()) && response.request().method() === "POST");
    await page.locator("#btnImportConfirm").click();
    const response = await confirmResponse;
    const confirmation = await response.json();
    assert.equal(response.request().postDataJSON().overrideOriginality, undefined);
    assert.equal(response.request().postDataJSON().originalityPlan, undefined);
    assert.deepEqual(confirmation.result.created, { sources: 3, literatureNotes: 0, permanentNotes: 3 });
    await page.locator('#importResult .result-card[data-result-stage="confirm"]').waitFor();
    assert.equal(await page.locator("#importResult [data-import-writing-action].primary:visible").count(), 1);
    const notes = await Promise.all(preview.candidatePreview.permanentNotes.map(note => read(note.id)));
    const claim = notes.find(note => note.title === "解释要说明前提");
    const counterexample = notes.find(note => note.title === "反例帮助检验判断");
    const practice = notes.find(note => note.title === "用新情境检验观点");
    assert.deepEqual(claim.viewpointHistory, [{ ...revision, sourceNoteIds: [counterexample.id] }]);
    assert.deepEqual(claim.pendingViewpointRevision, { ...pending, sourceNoteIds: [practice.id] });
    for (const note of notes) {
      assert.equal(note.authorship.user_confirmed, false);
      assert.equal(note.status, "draft");
      assert.notEqual(note.distillationStatus, "confirmed");
      assert.match(await fs.readFile(path.join(vaultPath, note.markdownPath), "utf8"), new RegExp(note.thesis));
    }
    assert.equal((claim.body.match(/^# 解释要说明前提$/gm) || []).length, 1);
    assert.match(claim.body, /\[\[反例判断\|反例\]\]/);
    const asset = confirmation.result.createdFiles.find(file => file.noteType === "asset");
    assert.deepEqual(await fs.readFile(path.join(vaultPath, asset.path)), image);
    await page.locator('[data-import-writing-action="open-today"]').click();
    assert.equal(await page.locator("#importOperationResultModal").isVisible(), false);
    await open(claim);
    await page.locator("#btnShowRelated").click();
    const related = page.locator("#relatedPanel");
    await related.locator('input[name="viewpointChangeSourceNoteIds"]:checked').waitFor();
    assert.deepEqual(await related.locator('input[name="viewpointChangeSourceNoteIds"]:checked').evaluateAll(items => items.map(item => item.value)), [practice.id]);
    assert.match(await related.locator(".viewpoint-change-source-list").innerText(), /用新情境检验观点/);
    assert.equal(await related.locator('textarea[name="thesisChangeReason"]').inputValue(), pending.reason);
    await related.getByRole("tab", { name: "形成过程", exact: true }).click();
    const formation = related.locator(".viewpoint-formation");
    assert.match(await formation.innerText(), /一个解释在什么情况下不成立？/);
    assert.match(await formation.locator(".is-revision").innerText(), /依据：反例帮助检验判断/);
    assert.match(await formation.locator(".is-revision").innerText(), new RegExp(revision.reason));
    assert.doesNotMatch(await formation.innerText(), /pn_old_/);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: `${output}/viewpoint-evidence-${width}.png` });
    await related.locator("#btnHideRelated").click();
    await page.locator('.rail-btn[data-module="graph"]').click();
    await page.waitForFunction(() => window.__prototypeState.graphConnectivityReady === true);
    assert.ok(await page.locator(`#graphCanvas [data-edge-from="${claim.id}"][data-edge-to="${counterexample.id}"]`).count(), "Migrated alias links must be real graph relationships");
    await waitFor(async () => {
      const framed = await page.evaluate(ids => {
        const canvas = document.querySelector("#graphCanvas").getBoundingClientRect();
        return ids.map(id => {
          const node = document.querySelector(`#graphCanvas .graph-map-node[data-node-id="${id}"] .graph-map-node-hit`);
          const rect = node?.getBoundingClientRect();
          return { id, x: rect ? rect.x + rect.width / 2 : null, y: rect ? rect.y + rect.height / 2 : null,
            inside: Boolean(rect && rect.width > 0 && rect.x + rect.width / 2 >= canvas.x && rect.x + rect.width / 2 <= canvas.right && rect.y + rect.height / 2 >= canvas.y && rect.y + rect.height / 2 <= canvas.bottom) };
        });
      }, notes.map(note => note.id));
      assert.ok(framed.every(node => node.inside), JSON.stringify(framed));
    });
    await page.screenshot({ path: `${output}/real-graph-${width}.png` });
    const visibility = await page.locator("#graphCanvas .graph-map-node").evaluateAll(nodes => nodes.map(node => {
      const core = node.querySelector(".graph-map-node-core");
      const label = node.querySelector(".graph-map-node-label");
      const bounds = core.getBoundingClientRect();
      return { id: node.dataset.nodeId, title: node.dataset.nodeTitle, label: label?.textContent,
        labelHeight: label?.getBoundingClientRect().height ?? 0, diameter: bounds.width,
        coreOpacity: Number(getComputedStyle(core).opacity), labelOpacity: label ? Number(getComputedStyle(label).opacity) : 0 };
    }));
    assert.ok(visibility.every(node => node.label === node.title && node.labelHeight >= 10 && node.labelOpacity >= .7 && node.diameter >= 4 && node.coreOpacity >= .7), JSON.stringify(visibility));
    const labelRects = await page.locator("#graphCanvas .graph-map-node-label").evaluateAll(labels => labels.map(label => {
      const rect = label.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    }));
    for (let i = 0; i < labelRects.length; i += 1) for (let j = i + 1; j < labelRects.length; j += 1) {
      const a = labelRects[i], b = labelRects[j];
      assert.ok(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top, "Small-map titles must not cover each other");
    }
    const graphSvg = page.locator(".graph-map-svg");
    const fitViewBox = await graphSvg.getAttribute("viewBox");
    await page.locator('[data-graph-zoom-step="1"]').click();
    await waitFor(async () => assert.notEqual(await graphSvg.getAttribute("viewBox"), fitViewBox));
    await page.locator('[data-graph-zoom-step="-1"]').click();
    await waitFor(async () => assert.equal(await graphSvg.getAttribute("viewBox"), fitViewBox));
    const graphNode = page.locator(`#graphCanvas .graph-map-node[data-node-id="${counterexample.id}"]`);
    await graphNode.focus();
    await graphNode.press("Enter");
    await page.locator('.graph-selection-panel.is-node').waitFor();
    assert.match(await page.locator('.graph-selection-panel.is-node').innerText(), /反例帮助检验判断/);
    await page.locator('[data-graph-selection-close]').click();
    await graphNode.locator('.graph-map-node-label').click();
    await page.locator('.graph-selection-panel.is-node').waitFor();
    assert.match(await page.locator('.graph-selection-panel.is-node').innerText(), /反例帮助检验判断/);
    await page.locator('[data-graph-selection-close]').click();
    for (const note of notes) {
      await open(note);
      await page.locator('.rail-btn[data-module="writing"]').click();
      await page.locator('.writing-head-actions [data-writing-related-open]').click();
      const prepare = page.locator(`[data-writing-action="prepare"][data-writing-note-id="${note.id}"]`);
      await prepare.waitFor();
      if (note.id === claim.id) {
        const pendingDialog = page.waitForEvent("dialog");
        const click = prepare.click();
        await (await pendingDialog).dismiss();
        await click;
        await waitFor(async () => assert.equal(await prepare.isEnabled(), true));
        assert.equal((await read(note.id)).authorship.user_confirmed, false);
        assert.equal(await page.locator(`#writingBasketList article[data-writing-note-id="${note.id}"] [data-writing-action="remove"]`).count(), 0);
      }
      const pendingDialog = page.waitForEvent("dialog");
      const click = prepare.click();
      await (await pendingDialog).accept();
      await click;
      await page.locator(`#writingBasketList article[data-writing-note-id="${note.id}"] [data-writing-action="remove"]`).waitFor();
      const confirmed = await read(note.id);
      assert.equal(confirmed.authorship.user_confirmed, true);
      assert.equal(confirmed.status, "active");
      assert.equal(confirmed.originalityStatus, "pass");
      if (note.id === claim.id) {
        assert.deepEqual(confirmed.viewpointHistory, [{ ...revision, sourceNoteIds: [counterexample.id] }]);
        assert.deepEqual(confirmed.pendingViewpointRevision, { ...pending, sourceNoteIds: [practice.id] });
      }
      await page.locator("#writingRelatedNotesPanel [data-writing-related-close]").click();
    }
    await page.locator("#btnWritingSaveThemeIndex").click();
    for (const text of ["怎样用反例改进解释", "解释应如何面对不符合预期的情况？"]) {
      await page.locator("[data-text-input-field]:visible").fill(text);
      await page.locator("[data-text-input-confirm]:visible").click();
    }
    await page.locator("#btnWritingCreateScaffold").click();
    await page.locator("#writingScaffoldPanel:visible").waitFor();
    const project = (await fetchJson(apiBase, "/api/v1/writing-projects?limit=20")).json.items.find(item => item.title === "怎样用反例改进解释");
    const scaffold = await fetchJson(apiBase, `/api/v1/draft-scaffolds/${project.scaffold_id}`);
    const evidenceIds = new Set(scaffold.json.item.sections.flatMap(section => section.evidence_note_ids));
    for (const note of notes) assert.ok(evidenceIds.has(note.id));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: `${output}/traceable-outline-${width}.png` });
    await settings();
    assert.equal(await page.locator("#importOperationResultModal").isVisible(), false);
    await page.locator("#importWorkspaceTabExport").click();
    await page.locator("#exportDirectoryId").selectOption("dir_original_default");
    await page.locator("#exportTargetPath").fill(destination);
    await page.locator("#btnExportMarkdown").click();
    await page.locator('#exportResult .result-card[data-result-stage="export_markdown"]').waitFor();
    const exported = await fs.readdir(destination, { recursive: true });
    const bodies = await Promise.all(exported.filter(file => file.endsWith(".md")).map(file => fs.readFile(path.join(destination, file), "utf8")));
    for (const note of notes) assert.ok(bodies.some(body => body.includes(note.thesis)));
    const exportedClaim = bodies.find(body => body.includes("# 解释要说明前提\n"));
    assert.ok(exportedClaim);
    const metadata = parseMarkdownWithFrontmatter(exportedClaim).frontmatter;
    assert.equal(metadata.yansilu_note_type, "permanent");
    assert.ok(metadata.yansilu_link_aliases.includes(claim.id));
    assert.equal(metadata.id, undefined);
    assert.deepEqual(metadata.viewpoint_history.map(JSON.parse), [{ ...revision, sourceNoteIds: [counterexample.id] }]);
    assert.deepEqual(JSON.parse(metadata.pending_viewpoint_revision), { ...pending, sourceNoteIds: [practice.id] });
    await unchanged();
    await waitFor(async () => assert.deepEqual(errors, []));
  });
}
