import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { optionalPlaywright, startPrototypeStack, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

async function answerInput(page, value) {
  await page.locator("[data-text-input-field]:visible").fill(value);
  await page.locator("[data-text-input-confirm]:visible").click();
}

async function openWritingMenu(page) {
  if (!await page.locator("#writingMoreMenu").evaluate(el => el.open)) {
    await page.locator("#writingMoreMenu > summary").click();
  }
}

async function writeMarkdown(page, text) {
  if (!await page.locator("#editorHost .cm-content:visible").isVisible()) {
    await page.locator("#btnModeToggle").click();
  }
  await page.locator("#editorHost .cm-content:visible").click();
  await page.keyboard.press("Control+a");
  await page.keyboard.insertText(text);
  await page.keyboard.press("Control+s");
}

async function openNote(page, id, query) {
  await page.locator("#btnToggleSearch").click();
  await page.locator("#globalNoteSearchInput").fill(query);
  await page.locator(`[data-search-note="${id}"]`).click();
  await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id, id);
}

for (const width of [1366, 390, 320]) {
test(`ordinary UI task closes material, judgment history, relations, graph, theme, article and book at ${width}px`, async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase, webBase, vaultPath } = stack;
  await page.setViewportSize({ width, height: width === 1366 ? 768 : 844 });
  page.setDefaultTimeout(12000);
  const output = width === 1366 ? "output/playwright/core-mainline" : `output/playwright/core-mainline/${width}`;
  await fs.mkdir(output, { recursive: true });
  let stage = "empty library";
  const checkpoint = async name => {
    stage = name;
    t.diagnostic(name);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name}: horizontal overflow`);
    await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
  };
  const readNote = async id => {
    const response = await fetchJson(apiBase, `/api/v1/notes/${id}`);
    assert.equal(response.status, 200, `${stage}: ${JSON.stringify(response.json)}`);
    return response.json.item;
  };
  const notes = [];
  const scenarios = [
    { title: "读书观察：合上书再解释", body: "银杏小组的阅读记录：摘录看起来熟悉，不等于自己能说明理由。合上书讲一次，会发现遗漏。", question: "怎样判断自己真正理解了读过的内容？", claim: "合上书后用自己的话解释，能检验自己是否理解。", boundary: "初学者缺少背景知识时，需要先阅读材料，不能只靠回忆。" },
    { title: "读书观察：解释之后核对", body: "银杏小组的第二次实践：解释之后对照原文，发现一个遗漏的前提，补充后才更准确。", question: "自己的解释不完整时，下一步做什么？", claim: "解释后核对材料，可以找到并修正理解的遗漏。", boundary: "材料本身也可能出错，应继续检查其他证据。" },
    { title: "读书观察：刚入门时怎么办", body: "银杏小组的新成员缺少背景知识，直接回忆容易混淆概念；先读例子再解释更有效。", question: "没有背景知识时也应该马上合上书吗？", claim: "缺少背景知识时，先建立基本概念，再通过解释检查理解。", boundary: "已有相关经验的人，可以直接尝试回忆并检查。" }
  ];
  try {
    await checkpoint("00-empty-library");
    await page.locator('[data-today-action="start-first-note"]').click();
    for (const [index, scenario] of scenarios.entries()) {
      if (index) {
        await page.locator('[data-action="quick-fleeting"]').click();
        await page.locator(width === 1366 ? "#btnNewNote" : "#btnMobileNewNote").click();
      }
      await page.waitForFunction(() => {
        const editor = window.__prototypeEditor;
        const range = editor?.editorSelection();
        return range && editor.getEditorValue().slice(range.from, range.to) === "未命名笔记";
      });
      const materialId = await page.evaluate(() => window.__prototypeEditor.activeNote().id);
      await writeMarkdown(page, `# ${scenario.title}\n\n${scenario.body}`);
      await waitFor(async () => assert.match((await readNote(materialId)).body, /银杏小组/));
      await page.waitForFunction(() => !window.__prototypeEditor.savingPromise);
      const material = await readNote(materialId);
      assert.equal(material.noteType, "fleeting");
      assert.match(await fs.readFile(path.join(vaultPath, material.markdownPath), "utf8"), /银杏小组/);
      // Search a word found only in the body, not the title.
      await openNote(page, materialId, ["自己能说明理由", "遗漏的前提", "直接回忆容易"][index]);
      await page.locator("#btnRecordPermanent").click();
      await page.locator("#permanentNoteCreate").click();
      await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id !== id && !window.__prototypeEditor.savingPromise, materialId);
      const id = await page.evaluate(() => window.__prototypeEditor.activeNote().id);
      assert.equal((await readNote(id)).noteType, "permanent");
      assert.ok((await readNote(id)).body.includes(`[[${materialId}|`));
      assert.ok((await readNote(materialId)).body.includes(`[[${id}|`));
      await page.locator("#btnShowRelated").click();
      const panel = page.locator("#relatedPanel");
      const judgmentTitle = ["解释能发现理解的缺口", "解释后核对材料", "入门先建立基本概念"][index];
      await panel.locator('input[name="title"]').fill(judgmentTitle);
      await panel.locator('textarea[name="thesis"]').fill(scenario.claim);
      await panel.locator('textarea[name="startingQuestion"]').fill(scenario.question);
      if (await panel.locator('textarea[name="thesisChangeReason"]').isVisible()) {
        await panel.locator('textarea[name="thesisChangeReason"]').fill("我根据这次阅读实践重新说明了自己的判断。");
      }
      await panel.locator(".viewpoint-optional-details > summary").click();
      for (const [name, value] of [["summary1", scenario.claim], ["summary2", scenario.body], ["summary3", "用于说明怎样检验阅读理解。"], ["boundaryOrCounterpoint", scenario.boundary]]) {
        await panel.locator(`textarea[name="${name}"]`).fill(value);
      }
      await panel.getByRole("button", { name: "保存当前观点", exact: true }).click();
      await waitFor(async () => assert.equal((await readNote(id)).thesis, scenario.claim));
      const note = await readNote(id);
      assert.equal(note.title, judgmentTitle);
      assert.ok(note.body.startsWith(`# ${judgmentTitle}\n`));
      assert.ok(note.body.includes(`[[${materialId}|`));
      const savedFile = await fs.readFile(path.join(vaultPath, note.markdownPath), "utf8");
      assert.ok(savedFile.includes(`# ${judgmentTitle}\n`));
      assert.match(savedFile, /yansilu_link_aliases:/);
      assert.equal((await readNote(materialId)).title, scenario.title);
      assert.equal(note.startingQuestion, scenario.question);
      assert.equal(note.boundaryOrCounterpoint, scenario.boundary);
      notes.push(note);
      await panel.locator("#btnHideRelated").click();
    }
    await checkpoint("01-material-and-judgment");
    await openNote(page, notes[0].id, notes[0].title);
    await page.locator("#btnShowRelated").click();
    const panel = page.locator("#relatedPanel");
    await panel.getByRole("button", { name: "继续修改观点", exact: true }).click();
    const revisedClaim = "先尝试解释，再核对材料，才能发现并修正理解的缺口。";
    const reason = "第二次实践发现遗漏的前提，解释必须加上核对这一步。";
    await panel.locator('textarea[name="thesis"]').fill(revisedClaim);
    await panel.locator('textarea[name="thesisChangeReason"]').fill(reason);
    await panel.getByRole("button", { name: "保存当前观点", exact: true }).click();
    await waitFor(async () => assert.equal((await readNote(notes[0].id)).thesis, revisedClaim));
    const revised = await readNote(notes[0].id);
    assert.ok(revised.viewpointHistory.some(item => item.previousThesis === scenarios[0].claim && item.thesis === revisedClaim && item.reason === reason));
    await panel.getByRole("tab", { name: "形成过程", exact: true }).click();
    assert.match(await panel.textContent(), new RegExp(reason));
    assert.match(await panel.textContent(), new RegExp(scenarios[0].question));
    await checkpoint("02-judgment-history");
    await panel.locator("#btnHideRelated").click();
    const linkedBody = `${(await readNote(notes[0].id)).body}\n\n关联依据：[[${notes[2].id}|${notes[2].title}]]\n`;
    await writeMarkdown(page, linkedBody);
    await waitFor(async () => assert.ok((await readNote(notes[0].id)).body.includes(`[[${notes[2].id}|`)));
    await page.waitForFunction(() => !window.__prototypeEditor.savingPromise);
    const bodyLinks = (await fetchJson(apiBase, `/api/v1/notes/${notes[0].id}/relations`)).json.item.outgoingLinks;
    assert.ok(bodyLinks.some(item => item.toNoteId === notes[2].id), "A saved body link must enter the same relation data as manual links");
    await page.locator("#btnShowRelated").click();
    await panel.getByRole("tab", { name: "笔记关联", exact: true }).click();
    await panel.locator('[data-permanent-relation-action="open"][data-permanent-relation-mode="manual"]').click();
    const workspace = page.locator("[data-permanent-relation-workspace]");
    await workspace.locator("[data-permanent-relation-target-search]").fill(notes[1].title);
    await workspace.locator(`[data-permanent-relation-manual-target="${notes[1].id}"]`).click();
    await workspace.locator('[data-permanent-relation-type-choice="supports"]').click();
    await workspace.locator('textarea[name="rationale"]').fill("核对材料的实践，支持解释后需要检查遗漏的判断。");
    await workspace.locator('button[type="submit"]').click();
    await workspace.locator(".permanent-relation-result").waitFor();
    const outgoing = (await fetchJson(apiBase, `/api/v1/notes/${notes[0].id}/relations`)).json.item.outgoingLinks;
    const relation = outgoing.find(item => item.toNoteId === notes[1].id && item.relationType === "supports");
    assert.ok(relation?.id);
    await workspace.locator('[data-permanent-relation-action="complete"]').click();
    await panel.locator(`[data-relation-action="open-edit"][data-relation-id="${relation.id}"]`).click();
    await workspace.locator('[data-permanent-relation-type-choice="qualifies"]').click();
    await workspace.locator('textarea[name="rationale"]').fill("解释之后还需要核对材料，才能避免遗漏前提。");
    await workspace.locator('button[type="submit"]').click();
    await workspace.locator(".permanent-relation-result").waitFor();
    await workspace.locator('[data-permanent-relation-action="complete"]').click();
    await panel.locator("#btnHideRelated").click();
    await page.locator('[data-action="quick-original"]').click();
    await page.locator('.rail-btn[data-module="graph"]').click();
    await page.waitForFunction(() => window.__prototypeState.graphConnectivityReady === true);
    assert.equal(await page.locator(`#graphCanvas [data-edge-from="${notes[0].id}"][data-edge-to="${notes[1].id}"]`).getAttribute("data-edge-relation-type"), "qualifies");
    assert.ok(await page.locator(`#graphCanvas [data-edge-from="${notes[0].id}"][data-edge-to="${notes[2].id}"]`).count(), "Body and manual links must both appear in the graph");
    for (const target of [notes[1], notes[2]]) {
      const path = page.locator(`#graphCanvas [data-edge-from="${notes[0].id}"][data-edge-to="${target.id}"] .graph-map-edge`);
      const style = await path.evaluate(el => ({ opacity: Number(getComputedStyle(el).opacity), width: parseFloat(getComputedStyle(el).strokeWidth) }));
      assert.ok(style.opacity >= 0.4 && style.width >= 0.8, `A real relation must be readable at overview zoom: ${JSON.stringify(style)}`);
    }
    await checkpoint("03-real-graph");
    await page.locator(`#graphCanvas .graph-map-node[data-node-id="${notes[0].id}"] .graph-map-node-hit`).click();
    await page.locator(`.graph-selection-panel [data-open-note="${notes[0].id}"]`).getByText("打开笔记", { exact: true }).click();
    await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id, notes[0].id);
    assert.match(await page.evaluate(() => window.__prototypeEditor.getEditorValue()), new RegExp(revisedClaim));
    for (const note of notes) {
      await openNote(page, note.id, note.title);
      await page.locator('.rail-btn[data-module="writing"]').click();
      await page.locator('.writing-head-actions [data-writing-related-open]').click();
      const currentNote = await readNote(note.id);
      if (currentNote.authorship.user_confirmed && currentNote.status === "active") {
        if (!await page.locator("#writingCandidateDetails").evaluate(el => el.open)) {
          await page.locator("#writingCandidateDetails > summary").click();
        }
        await page.locator(`#writingCandidateList [data-writing-action="add"][data-writing-note-id="${note.id}"]`).click();
      } else {
        page.once("dialog", dialog => dialog.accept());
        await page.locator(`[data-writing-action="prepare"][data-writing-note-id="${note.id}"]`).click();
      }
      await page.locator(`#writingBasketList article[data-writing-note-id="${note.id}"] [data-writing-action="remove"]`).waitFor();
      assert.equal((await readNote(note.id)).authorship.user_confirmed, true);
      await page.locator("#writingRelatedNotesPanel [data-writing-related-close]").click();
    }
    await openNote(page, notes[2].id, notes[2].title);
    assert.equal((await readNote(notes[2].id)).authorship.user_confirmed, true);
    await writeMarkdown(page, `${(await readNote(notes[2].id)).body}\n\n准备写作后继续补充依据。\n`);
    await waitFor(async () => assert.match((await readNote(notes[2].id)).body, /准备写作后继续补充依据/));
    await page.waitForFunction(() => !window.__prototypeEditor.savingPromise);
    const afterEdit = await readNote(notes[2].id);
    assert.equal(afterEdit.authorship.user_confirmed, true);
    assert.equal(afterEdit.status, "active", "Independent edits must not invalidate a confirmed note for missing citation locators");
    assert.equal(afterEdit.originalityStatus, "pass");
    await page.locator('.rail-btn[data-module="writing"]').click();
    await page.locator("#btnWritingSaveThemeIndex").click();
    const themeTitle = "怎样检验读书后的理解";
    await answerInput(page, themeTitle);
    await answerInput(page, "怎样通过解释和核对改进自己的理解？");
    await page.locator("#btnWritingCreateScaffold").click();
    await page.locator("#writingScaffoldPanel:visible").waitFor({ timeout: 15000 });
    const outlinedProject = (await fetchJson(apiBase, "/api/v1/writing-projects?limit=20")).json.items.find(item => item.title === themeTitle);
    const scaffold = await fetchJson(apiBase, `/api/v1/draft-scaffolds/${outlinedProject.scaffold_id}`);
    assert.equal(scaffold.status, 200);
    const evidenceIds = new Set(scaffold.json.item.sections.flatMap(section => section.evidence_note_ids));
    for (const note of notes) assert.ok(evidenceIds.has(note.id), "Each outline judgment must trace back to its actual permanent note");
    if (width !== 1366) {
      const heading = await page.locator("#writingScaffoldPanel .writing-section-title").boundingBox();
      const actions = await page.locator("#writingScaffoldPanel .writing-section-head-actions").boundingBox();
      assert.ok(heading.width > 120 && actions.y >= heading.y + heading.height, `Outline heading must not become a vertical text strip: ${JSON.stringify({ heading, actions })}`);
    }
    await checkpoint("04-traceable-outline");
    const longHeading = "先尝试用自己的话解释阅读材料，发现理解中的缺口，再核对原文中遗漏的前提，形成可以反复检验和使用的判断";
    const outlineHeading = page.locator('#writingScaffoldPreview textarea[data-writing-outline-field="heading"]').first();
    await outlineHeading.fill(longHeading);
    await page.waitForFunction(() => {
      const field = document.querySelector('#writingScaffoldPreview textarea[data-writing-outline-field="heading"]');
      return field && field.scrollHeight <= field.clientHeight + 1;
    });
    assert.equal(await outlineHeading.inputValue(), longHeading);
    const tall = await outlineHeading.evaluate(el => el.clientHeight);
    await checkpoint("04b-full-long-heading");
    await outlineHeading.fill("解释与核对");
    assert.ok(await outlineHeading.evaluate(el => el.clientHeight) < tall, "Shorter title must shrink");
    await outlineHeading.fill(longHeading);
    await page.locator("#btnWritingStartDraft").click();
    assert.ok((await page.locator("#writingDraftEditor").inputValue()).includes(longHeading), "Draft must use the complete edited heading");
    const article = `# ${themeTitle}\n\n先尝试用自己的话解释，再核对遗漏的前提。\n\n这篇文章从两次阅读实践中形成。`;
    await page.locator("#writingDraftEditor:visible").fill(article);
    await page.locator("#btnWritingSaveDraft").click();
    let project;
    await waitFor(async () => {
      project = (await fetchJson(apiBase, "/api/v1/writing-projects?limit=20")).json.items.find(item => item.title === themeTitle);
      assert.ok(project?.draft_note_id);
      assert.match((await readNote(project.draft_note_id)).body, /两次阅读实践/);
    }, 15000);
    const persistedOutline = (await fetchJson(apiBase, `/api/v1/draft-scaffolds/${project.scaffold_id}`)).json.item;
    assert.equal(persistedOutline.sections[0].heading, longHeading);
    const outputRoot = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-mainline-export-"));
    const current = `${article}\n\n当前修改也要进入导出的文章。`;
    await page.locator("#writingDraftEditor").fill(current);
    await openWritingMenu(page);
    const exportedWait = page.waitForResponse(r => r.url().endsWith("/api/v1/exports/article") && r.request().method() === "POST");
    exportedWait.catch(() => {});
    await page.locator("#btnWritingExportArticle").click();
    await answerInput(page, outputRoot);
    const exported = await (await exportedWait).json();
    assert.equal(exported.status, "completed");
    assert.match(await fs.readFile(exported.articlePath, "utf8"), /当前修改也要进入/);
    assert.doesNotMatch((await readNote(project.draft_note_id)).body, /当前修改也要进入/);
    await page.locator("#btnWritingSaveDraft").click();
    await waitFor(async () => assert.match((await readNote(project.draft_note_id)).body, /当前修改也要进入/));
    await checkpoint("05-article-and-export");
    await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
    await page.locator('.rail-btn[data-module="writing"]').click();
    const theme = page.locator("#writingThemeIndexList [data-writing-index-card-id]", { hasText: themeTitle });
    await theme.getByRole("button", { name: "继续草稿", exact: true }).click();
    await page.locator('.rail-btn[data-module="writing"]').click();
    await page.locator("#writingDraftEditor:visible").waitFor();
    assert.match(await page.locator("#writingDraftEditor").inputValue(), /当前修改也要进入/);
    assert.equal((await fetchJson(apiBase, "/api/v1/writing-projects?limit=20")).json.items.length, 1, "Continue must reuse the saved project");
    for (const title of ["第一章 解释", "第二章 核对"]) {
      await page.locator("#btnWritingChapterAdd").click();
      await answerInput(page, title);
      await page.waitForFunction(title => document.querySelector("#writingDraftTarget")?.selectedOptions[0]?.textContent.includes(title), title);
      await page.locator("#writingDraftEditor").fill(`# ${title}\n\n${title}的已保存正文。`);
      await page.locator("#btnWritingSaveDraft").click();
      await waitFor(async () => {
        const fresh = (await fetchJson(apiBase, `/api/v1/writing-projects/${project.id}`)).json.item;
        const chapter = fresh.book_structure.parts.flatMap(part => part.chapters).find(item => item.title === title);
        assert.ok(chapter?.draft_note_id);
        assert.match((await readNote(chapter.draft_note_id)).body, new RegExp(`${title}的已保存正文`));
      }, 15000);
      await waitFor(async () => assert.match(await page.locator("#statusText").textContent(), /章节已保存/));
    }
    await page.locator("#btnWritingChapterUp").click();
    await waitFor(async () => assert.match(await page.locator("#statusText").textContent(), /章节顺序已保存/));
    await page.locator("#writingDraftEditor").fill("# 第二章 核对\n\n当前未保存的章节修改。");
    await openWritingMenu(page);
    let bookRequests = 0;
    page.on("request", request => { if (request.url().endsWith("/api/v1/exports/book") && request.method() === "POST") bookRequests++; });
    await page.locator("#btnWritingExportBook").click();
    await waitFor(async () => assert.match(await page.locator("#statusText").textContent(), /章节还有未保存内容/));
    assert.equal(await page.locator("#writingMoreMenu").evaluate(element => element.open), false);
    assert.equal(bookRequests, 0);
    assert.match(await page.locator("#writingDraftEditor").inputValue(), /当前未保存的章节修改/);
    if (width !== 1366) {
      await page.locator("#btnWritingSaveDraft").scrollIntoViewIfNeeded();
      const layout = await page.locator("#btnWritingSaveDraft").evaluate(button => {
        const rect = button.getBoundingClientRect();
        const notice = document.querySelector("#statusBar").getBoundingClientRect();
        const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        return { buttonBottom: rect.bottom, noticeTop: notice.top, hit: hit?.closest("button") === button };
      });
      assert.ok(layout.buttonBottom <= layout.noticeTop + 1 && layout.hit, `Export failure must not cover save: ${JSON.stringify(layout)}`);
      await page.screenshot({ path: path.join(output, "05b-unsaved-export-recovery.png") });
    }
    await page.locator("#btnWritingSaveDraft").click();
    await waitFor(async () => assert.match(await page.locator("#statusText").textContent(), /章节已保存/));
    await openWritingMenu(page);
    let bookResponse;
    page.on("response", response => { if (response.url().endsWith("/api/v1/exports/book") && response.request().method() === "POST") bookResponse = response; });
    await page.locator("#btnWritingExportBook").click();
    await answerInput(page, outputRoot);
    await waitFor(() => assert.ok(bookResponse));
    const book = await bookResponse.json();
    assert.equal(book.status, "completed");
    const bookText = await fs.readFile(book.bookPath, "utf8");
    assert.match(bookText, /第一章 解释的已保存正文/);
    assert.match(bookText, /当前未保存的章节修改/);
    assert.ok(bookText.indexOf("第二章 核对") < bookText.indexOf("第一章 解释"));
    assert.doesNotMatch(bookText, /第二章 核对的已保存正文/);
    await checkpoint("06-book-saved-chapters-export");
    t.diagnostic(`Persisted UI-created notes: ${notes.map(note => note.id).join(", ")}; project: ${project.id}`);
  } catch (error) {
    await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true });
    throw new Error(`${stage}: ${error.message}\nStatus: ${await page.locator("#statusText").textContent()}`, { cause: error });
  }
});
}
