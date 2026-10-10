import test from "node:test";
import assert from "node:assert/strict";
import {
  createWritingReadyPermanentNote,
  fetchJson,
  optionalPlaywright,
  postJson,
  startPrototypeStack,
  waitFor
} from "./prototype-copy-test-helpers.mjs";

test("prototype writing center discovers a writable theme suggestion and saves it after confirmation", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const notes = [];
  for (const suffix of ["A", "B", "C"]) {
    const created = await createWritingReadyPermanentNote(apiBase, {
      title: `Discovery Theme ${suffix}`,
      body: `# Discovery Theme ${suffix}\n\nThis permanent note belongs to the same user-confirmed writable theme. #auto-theme`,
      thesis: `Discovery theme note ${suffix} explains why suggestions need user confirmation.`,
      threeLineSummary: [
        `Discovery theme note ${suffix} explains why suggestions need user confirmation.`,
        "The local rule should only produce an editable suggestion.",
        "The confirmed suggestion should become a theme index entry."
      ],
      boundaryOrCounterpoint: "The app must not create the theme automatically."
    });
    notes.push(created.json.item);
  }

  for (let index = 0; index < notes.length - 1; index += 1) {
    const relation = await postJson(apiBase, `/api/v1/notes/${encodeURIComponent(notes[index].id)}/relations`, {
      toNoteId: notes[index + 1].id,
      relationType: "supports",
      rationale: "These permanent notes support the same user-confirmed theme suggestion.",
      insightQuestion: "Why should automatic theme discovery stay confirm-first?",
      confidence: 1
    });
    assert.equal(relation.status, 201, JSON.stringify(relation.json));
  }

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator("#btnWritingDiscoverThemes").click();

  const suggestion = page.locator("[data-theme-discovery-suggestion-id]").first();
  await waitFor(async () => {
    assert.equal(await suggestion.isVisible(), true);
    const text = await suggestion.textContent();
    assert.match(String(text || ""), /可写主题建议/);
    assert.match(String(text || ""), /保存.*主题/);
  }, 10000);

  await suggestion.locator('[data-theme-discovery-field="title"]').fill("User Confirmed Discovery Theme");
  await suggestion.locator('[data-theme-discovery-field="centralQuestion"]').fill("Why must writable theme discovery stay confirm-first?");
  await suggestion.locator('[data-theme-discovery-field="membershipReason"]').fill("These notes all describe why automatic discovery should remain an editable suggestion.");
  await suggestion.locator('.writing-theme-notes > summary').click();
  await suggestion.locator('[data-theme-discovery-field="item-rationale"]').first().fill("The first note provides evidence for this human-confirmed theme.");
  await page.locator('.rail-btn[data-module="settings"]').click();
  await page.locator('.rail-btn[data-module="writing"]').click();
  assert.equal(await suggestion.locator('[data-theme-discovery-field="title"]').inputValue(), "User Confirmed Discovery Theme");
  const creationRequest = page.waitForRequest(req => req.method() === "POST" && new URL(req.url()).pathname === "/api/v1/index-cards");
  await suggestion.locator('[data-theme-discovery-action="save"]').click();
  assert.equal((await creationRequest).postDataJSON().expectedVaultPath, stack.vaultPath);

  let savedIndex = null;
  await waitFor(async () => {
    const list = await fetchJson(apiBase, "/api/v1/index-cards?indexType=topic&limit=20");
    assert.equal(list.status, 200, JSON.stringify(list.json));
    savedIndex = list.json.items.find((item) => item.title === "User Confirmed Discovery Theme");
    assert.ok(savedIndex, await page.locator("#statusText").textContent());
    assert.equal(savedIndex.central_question || savedIndex.centralQuestion, "Why must writable theme discovery stay confirm-first?");
    assert.ok((savedIndex.items || []).length >= 3);
    assert.ok(savedIndex.items.some(item => item.rationale === "The first note provides evidence for this human-confirmed theme."));
  }, 10000);

  await waitFor(async () => {
    const detailTitle = await page.locator("#writingThemeDetailTitle").inputValue();
    const basketText = await page.locator("#writingBasketList").textContent();
    assert.equal(detailTitle, "User Confirmed Discovery Theme");
    assert.match(String(basketText || ""), /Discovery Theme A/);
    assert.match(String(basketText || ""), /Discovery Theme B|Discovery Theme C/);
    assert.ok(savedIndex.id);
  }, 10000);
});

test("shared note rationale labels edit and save only the selected theme suggestion", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const playwright = await optionalPlaywright(t);
  if (!playwright) return;
  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page, apiBase, webBase } = stack;
  const notes = [];
  for (const [title, tags] of [["甲", "#alpha #beta"], ["乙", "#alpha"], ["丙", "#alpha"], ["丁", "#beta"], ["戊", "#beta"]]) {
    const result = await createWritingReadyPermanentNote(apiBase, {
      title: `${title}的判断`, body: `# ${title}的判断\n\n${title}说明适用范围。 ${tags}`,
      thesis: `${title}需要核对依据。`, threeLineSummary: [`${title}需要核对依据。`, `${title}的适用范围。`, `${title}的下一步。`],
      boundaryOrCounterpoint: `${title}可能有例外。`
    });
    notes.push(result.json.item);
  }
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator("#btnWritingDiscoverThemes").click();
  const sharedId = notes[0].id;
  const cards = page.locator("[data-theme-discovery-suggestion-id]").filter({ has: page.locator(`[data-theme-discovery-note-id="${sharedId}"]`) });
  await cards.nth(1).waitFor({ state: "visible" });
  const firstId = await cards.first().getAttribute("data-theme-discovery-suggestion-id");
  const target = cards.nth(1);
  const targetId = await target.getAttribute("data-theme-discovery-suggestion-id");
  for (let i = 0; i < await cards.count(); i++) await cards.nth(i).locator(".writing-theme-notes > summary").click();
  const first = page.locator(`[data-theme-discovery-suggestion-id="${firstId}"]`);
  const rationaleSelector = `textarea[data-theme-discovery-note-id="${sharedId}"]`;
  const firstReason = await first.locator(rationaleSelector).inputValue();
  const targetReason = target.locator(rationaleSelector);
  await target.locator(`[data-theme-discovery-field="title"]`).fill("共享笔记的第二主题");
  await target.locator(`article[data-theme-discovery-note-id="${sharedId}"] label`).click();
  assert.equal(await targetReason.evaluate(el => el.ownerDocument.activeElement === el), true);
  await page.keyboard.press("Control+a");
  await page.keyboard.insertText("只属于第二个主题的理由。");
  assert.equal(await targetReason.inputValue(), "只属于第二个主题的理由。");
  assert.equal(await first.locator(rationaleSelector).inputValue(), firstReason);
  await target.locator('[data-theme-discovery-action="save"]').click();
  await waitFor(async () => {
    const list = await fetchJson(apiBase, "/api/v1/index-cards?indexType=topic&limit=20");
    const saved = list.json.items.find(item => item.title === "共享笔记的第二主题");
    assert.ok(saved);
    assert.equal(saved.items.find(item => item.note_id === sharedId || item.noteId === sharedId)?.rationale, "只属于第二个主题的理由。");
    assert.equal(list.json.items.length, 1, "Only the selected suggestion should be persisted");
  }, 10000);
  await page.locator(`[data-theme-discovery-suggestion-id="${targetId}"]`).waitFor({ state: "detached" });
  assert.equal(await first.locator(rationaleSelector).inputValue(), firstReason);
});
