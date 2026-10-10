import assert from "node:assert/strict";
import path from "node:path";
import { createWritingReadyPermanentNote, postJson } from "./prototype-copy-test-helpers.mjs";

export async function createWritingScopeDirectory(stack, title, segment, parentId = "dir_original_default") {
  const created = await postJson(stack.apiBase, "/api/v1/directories", {
    title, parentDirectoryId: parentId, directoryType: "custom",
    fsPath: path.join(stack.vaultPath, "notes", "original", segment), maxNotes: 500
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  return created.json.item;
}

export async function createWritingScopeNote(stack, directoryId, title) {
  return (await createWritingReadyPermanentNote(stack.apiBase, {
    directoryId, title, body: `# ${title}\n\n保留作者判断的正文：中文 café 🌿。`,
    thesis: "自己的解释需要回到具体材料核对遗漏。",
    threeLineSummary: ["用自己的话解释判断可以发现理解中的遗漏。", "材料提供明确依据，帮助核对解释中的问题。", "保存适用条件，便于后续文章回到原有判断。"],
    boundaryOrCounterpoint: "没有阅读材料时，应先阅读，不能只凭表达判断理解。"
  })).json.item;
}

export async function openWritingScopeCandidates(page) {
  await page.locator('[data-writing-sidebar-action="related"]').click();
  await page.locator("#writingRelatedNotesPanel:visible").waitFor();
  if (!await page.locator("#writingCandidateList:visible").isVisible()) await page.locator("#writingCandidateDetails > summary").click();
}

export async function visibleWritingCandidateIds(page) {
  return (await page.locator("#writingCandidateList:visible article[data-writing-note-id]")
    .evaluateAll(cards => cards.map(card => card.getAttribute("data-writing-note-id")))).sort();
}
