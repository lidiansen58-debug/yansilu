import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { optionalPlaywright, startPrototypeStack, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

const title = "为什么把手机放远一点比逼自己自律更有效？";
const claim = "把手机移出卧室，比睡前反复要求自己克制更容易减少无意识刷屏。";
const paragraphs = [
  "昨晚，我没有再给自己定十点以后绝不看手机的规矩，只是把手机留在客厅。躺下以后，伸手摸不到屏幕，我很快就安静下来。熬夜有时并不是意志太弱，而是诱惑太近。",
  "手机在枕边时，我每隔几分钟就要决定一次，要不要看看消息、再刷一个视频。每次决定都很小，累积起来却很容易把休息时间耗掉。把手机放远，相当于提前减少了这些反复出现的选择。",
  "如果需要照顾家人、等待紧急电话，可以保留来电提醒，把其他应用的通知关掉。改变环境的目的，是让重要的事更容易发生，而不是增加另一条苛刻的规则。",
  "我准备先坚持一周，把手机放在客厅充电，床头留一本薄书。从一个今晚就能做到的小调整开始，比责备自己更有用。"
];

for (const width of [1366, 390]) test(`an ordinary user records one idea and finishes a short article at ${width}px`, { timeout: 90000 }, async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t); if (!pw) return;
  const h = await startPrototypeStack(t, pw); if (!h) return;
  const { page, apiBase, webBase, vaultPath } = h;
  await page.setViewportSize({ width, height: 844 });
  const errors = [], aiRequests = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("request", r => { if (r.method() === "POST" && /ai-analysis|chat\/completions|generate-draft/.test(r.url())) aiRequests.push(r.url()); });
  const readNote = async id => (await fetchJson(apiBase, `/api/v1/notes/${id}`)).json.item;
  const shot = async name => {
    if (!process.env.YANSILU_QA_OUTPUT) return;
    await fs.mkdir(process.env.YANSILU_QA_OUTPUT, { recursive: true });
    await page.screenshot({ path: path.join(process.env.YANSILU_QA_OUTPUT, `${name}-${width}.png`), fullPage: true });
  };
  async function append(text) {
    await page.locator('#writingDocumentEditor .toastui-editor-ww-container .ProseMirror[contenteditable="true"]').click();
    await page.keyboard.press("ControlOrMeta+End"); await page.keyboard.press("Enter"); await page.keyboard.insertText(text);
    await waitFor(async () => assert.ok((await page.locator("#writingDraftEditor").inputValue()).includes(text)));
  }
  try {
    await page.getByRole("button", { name: "新建笔记", exact: true }).click();
    await page.waitForFunction(() => window.getSelection()?.toString() === "未命名笔记");
    const sourceId = await page.evaluate(() => window.__prototypeEditor.activeNote().id);
    await page.keyboard.insertText("睡前把手机放远一点"); await page.keyboard.press("End"); await page.keyboard.press("Enter");
    await page.keyboard.insertText("昨晚把手机放在客厅，睡前没有再刷短视频，反而很快安静下来。减少诱惑，可能比反复要求自己更自律有效。");
    await page.keyboard.press("ControlOrMeta+s");
    await waitFor(async () => assert.match((await readNote(sourceId)).body, /昨晚把手机放在客厅/));
    await page.getByRole("button", { name: "创建永久笔记", exact: true }).click();
    await page.getByRole("button", { name: "在这个目录创建", exact: true }).click();
    await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id !== id && !window.__prototypeEditor.savingPromise, sourceId);
    const ideaId = await page.evaluate(() => window.__prototypeEditor.activeNote().id);
    for (const [before, after] of [["用自己的话，把这个想法写成一个清楚的判断。", claim], ["写清理由，以及支持它的观察或经验。", "手机不在手边时，不必反复决定要不要看一次，更容易直接休息。"], ["它在哪些条件下不成立？还有什么需要验证？", "需要照顾家人或等待紧急电话时，先保留必要的提醒方式。"]]) {
      await page.locator("#wysiwygHost .ProseMirror p").filter({ hasText: before }).click({ clickCount: 3 });
      assert.equal(await page.evaluate(() => window.getSelection()?.toString().trim()), before);
      await page.keyboard.insertText(after);
    }
    await page.keyboard.press("ControlOrMeta+s");
    await waitFor(async () => assert.ok((await readNote(ideaId)).body.includes(claim)));
    await page.waitForFunction(() => !window.__prototypeEditor.savingPromise && !window.__prototypeEditor.activeTab()?.dirty);
    assert.equal((await readNote(ideaId)).thesis, "", "The ordinary path does not require a second viewpoint form");
    await page.getByRole("button", { name: "写作", exact: true }).click();
    await page.getByRole("button", { name: "新建主题", exact: true }).click();
    await page.getByLabel("想写什么？", { exact: true }).fill(title);
    await page.getByRole("button", { name: "开始写", exact: true }).click();
    await page.locator("#writingDraftPanel:visible").waitFor();
    await page.locator('.writing-head-actions [data-writing-related-open]').click();
    await page.locator("#writingCandidateDetails > summary").click();
    page.once("dialog", d => d.accept());
    await page.locator(`#writingCandidateList article[data-writing-note-id="${ideaId}"]`).getByRole("button", { name: "确认并加入相关笔记", exact: true }).click();
    await page.locator(`#writingBasketList article[data-writing-note-id="${ideaId}"]`).waitFor();
    assert.equal((await readNote(ideaId)).authorship.user_confirmed, true);
    assert.equal((await readNote(ideaId)).originalityStatus, "pass");
    await page.locator("#writingRelatedNotesPanel button[data-writing-related-close]").click();
    for (const paragraph of paragraphs) await append(paragraph);
    await page.getByRole("button", { name: "保存", exact: true }).click();
    let project;
    await waitFor(async () => { project = (await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items[0]; assert.ok(project?.draft_note_id); });
    await waitFor(async () => assert.ok((await readNote(project.draft_note_id)).body.includes(paragraphs.at(-1))));
    await append("尚未保存的补充：减少反复选择，才能把注意力留给休息。");
    await page.locator('.writing-head-actions [data-writing-related-open]').click();
    await page.locator("#writingBasketList").getByRole("button", { name: "打开笔记", exact: true }).click();
    await page.locator("#wysiwygHost:visible").waitFor();
    await page.getByRole("button", { name: "写作", exact: true }).click();
    await page.waitForLoadState("networkidle"); await shot("resume-from-material");
    assert.equal(await page.locator("#writingRelatedNotesPanel").isVisible(), false);
    assert.equal(await page.locator("#writingDraftPanel").isVisible(), true);
    assert.match(await page.locator("#writingDraftEditor").inputValue(), /尚未保存的补充/);
    await append("把省下来的注意力留给第二天的准备，也让这个小改变更容易持续。");
    await page.keyboard.press("ControlOrMeta+s");
    await waitFor(async () => assert.match((await readNote(project.draft_note_id)).body, /小改变更容易持续/));
    for (const module of ["首页", "设置"]) {
      await page.getByRole("button", { name: module === "首页" ? /^首页/ : module, exact: true }).click();
      await page.getByRole("button", { name: "写作", exact: true }).click(); await page.waitForLoadState("networkidle");
      assert.equal(await page.locator("#writingDraftPanel").isVisible(), true);
      assert.doesNotMatch(await page.locator("#statusText").innerText(), /先选择.*生成提纲/);
    }
    await shot("finished-short-article");
    await page.reload({ waitUntil: "networkidle" }); await page.getByRole("button", { name: "写作", exact: true }).click();
    await page.locator(`#writingThemeIndexList article[data-writing-project-id="${project.id}"]`).getByRole("button", { name: "继续写", exact: true }).click();
    await page.locator("#writingDraftPanel:visible").waitFor();
    assert.match(await page.locator("#writingDraftEditor").inputValue(), /小改变更容易持续/);
    const saved = await readNote(project.draft_note_id);
    assert.ok((await fs.readFile(path.join(vaultPath, saved.markdownPath), "utf8")).includes(paragraphs[0]));
    assert.ok((await readNote(ideaId)).body.includes(sourceId));
    assert.doesNotMatch((await readNote(ideaId)).body, /尚未保存的补充/);
    assert.equal((await fetchJson(apiBase, `/api/v1/writing-projects/${project.id}`)).json.item.draft_note_id, project.draft_note_id);
    await page.getByRole("tab", { name: "主题", exact: true }).click();
    await page.getByRole("button", { name: /^首页/ }).click();
    await page.getByRole("button", { name: "写作", exact: true }).click(); await page.waitForLoadState("networkidle");
    assert.equal(await page.getByRole("tab", { name: "主题", exact: true }).getAttribute("aria-selected"), "true");
    await page.getByRole("tab", { name: "草稿", exact: true }).click();
    const output = await fs.mkdtemp(path.join(path.dirname(vaultPath), "yansilu-short-article-export-"));
    await page.locator("#writingMoreMenu > summary").click();
    const response = page.waitForResponse(r => r.request().method() === "POST" && r.url().endsWith("/api/v1/exports/article"));
    await page.locator("#btnWritingExportArticle").click();
    await page.locator("[data-text-input-field]:visible").fill(output); await page.locator("[data-text-input-confirm]:visible").click();
    const exported = await response, result = await exported.json();
    assert.equal(exported.status(), 200, JSON.stringify(result));
    assert.equal(result.status, "completed");
    assert.equal(await fs.readFile(result.articlePath, "utf8"), saved.body);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    assert.deepEqual(errors, []); assert.deepEqual(aiRequests, []);
    assert.equal(page.url(), `${webBase}/prototype`);
  } catch (e) { await shot("ordinary-flow-failure"); throw e; }
});
