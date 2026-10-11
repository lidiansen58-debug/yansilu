import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { optionalPlaywright, startPrototypeStack, postJson, fetchJson, waitFor, createWritingReadyPermanentNote } from "./prototype-copy-test-helpers.mjs";
import { createWritingScopeDirectory, createWritingScopeNote } from "./prototype-writing-scope-flow-helpers.mjs";
import { captureWritingSources } from "./prototype-writing-topic-repair-flow-helpers.mjs";

export async function createGraphGuidanceFixture(t, kind) {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return null; }
  const pw = await optionalPlaywright(t);
  if (!pw) return null;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return null;
  const directory = await createWritingScopeDirectory(stack, "图谱流程核对", `graph-guidance-${kind}`);
  const notes = [];
  if (kind === "body") {
    const target = await createWritingScopeNote(stack, directory.id, "正文链接目标");
    const source = (await createWritingReadyPermanentNote(stack.apiBase, {
      directoryId: directory.id, title: "正文链接来源",
      body: "# 正文链接来源\n\n依据保留在 [[正文链接目标]] 中。中文 café 🌿。",
      thesis: "正文链接保留回到依据的阅读路径。",
      threeLineSummary: ["正文链接保留回到依据的阅读路径。", "阅读上下文能够核对关系是否成立。", "有明确理由后再整理成主题。"],
      boundaryOrCounterpoint: "只有导航链接，不等于已经建立论证关系。"
    })).json.item;
    notes.push(source, target);
  } else {
    for (const title of ["需要核对的判断", "支持判断的材料", ...(kind === "thin" ? [] : [kind === "isolated" ? "暂未关联的判断" : "限定判断的材料"])]) {
      notes.push(await createWritingScopeNote(stack, directory.id, title));
    }
  }
  const relations = [];
  if (kind !== "body") {
    const targets = kind === "ready" ? notes.slice(1) : [notes[1]];
    for (const [index, target] of targets.entries()) {
      const saved = await postJson(stack.apiBase, `/api/v1/notes/${notes[0].id}/relations`, {
        toNoteId: target.id, relationType: index ? "qualifies" : "supports",
        rationale: kind === "thin" ? "相关。" : index ? "这条材料明确限定判断成立的前提，帮助文章避免超出证据的范围。" : "这条材料提供明确的核对依据，支持判断并保留回到原文的路径。",
        insightQuestion: kind === "thin" ? "" : "这些材料在什么条件下支持当前判断？"
      });
      assert.equal(saved.status, 201, JSON.stringify(saved.json));
      relations.push(saved.json.item);
    }
  }
  const assertSourcesUnchanged = await captureWritingSources(stack, notes);
  const noteFiles = await Promise.all(notes.map(note => fs.readFile(path.join(stack.vaultPath, note.markdownPath))));
  const noteSnapshots = await Promise.all(notes.map(async note => (await fetchJson(stack.apiBase, `/api/v1/notes/${note.id}`)).json.item));
  let aiRequests = 0;
  const aiRequestPaths = [];
  stack.page.on("request", request => {
    const pathname = new URL(request.url()).pathname;
    if (request.method() === "POST" && pathname !== "/api/v1/ai/route-preview" && /\/api\/v1\/(?:ai|writing\/ai-analysis|graph\/ai-analysis|graph\/potential-relations\/refine)(?:\/|$)/.test(pathname)) { aiRequests++; aiRequestPaths.push(pathname); }
  });
  await stack.page.goto(`${stack.webBase}/prototype`, { waitUntil: "networkidle" });
  await stack.page.locator('.rail-btn[data-action="quick-original"]').click();
  await stack.page.locator(`.explorer-item[data-kind="folder"][data-id="${directory.id}"]`).click();
  await stack.page.locator('.rail-btn[data-module="graph"]').click();
  await waitFor(async () => assert.deepEqual((await stack.page.locator(".graph-map-node[data-node-id]").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-node-id")))).sort(), notes.map(note => note.id).sort()));
  const assertNoWriting = async () => {
    assert.deepEqual((await fetchJson(stack.apiBase, "/api/v1/index-cards?limit=50")).json.items, []);
    assert.deepEqual((await fetchJson(stack.apiBase, "/api/v1/writing-projects?limit=50")).json.items, []);
    assert.equal(aiRequests, 0, JSON.stringify(aiRequestPaths));
  };
  const assertNoteContentUnchanged = async () => {
    for (const [index, note] of notes.entries()) {
      const current = (await fetchJson(stack.apiBase, `/api/v1/notes/${note.id}`)).json.item;
      for (const key of ["title", "body", "thesis", "threeLineSummary", "boundaryOrCounterpoint", "authorship", "distillationStatus", "originalityStatus"]) assert.deepEqual(current[key], noteSnapshots[index][key], key);
      assert.deepEqual(await fs.readFile(path.join(stack.vaultPath, note.markdownPath)), noteFiles[index]);
    }
  };
  return { ...stack, directory, notes, relations, assertSourcesUnchanged, assertNoteContentUnchanged, assertNoWriting, assertNoAi: () => assert.equal(aiRequests, 0) };
}

export async function selectGraphNode(page, id) {
  const node = page.locator(`.graph-map-node[data-node-id="${id}"]`);
  await node.focus(); await node.press("Enter");
  await page.locator(".graph-selection-panel:visible").waitFor();
  return page.locator(".graph-selection-panel:visible");
}

export async function openGraphRelationComposer(page, panel) {
  await panel.locator("[data-graph-open-relation-form]").click();
  const composer = page.locator("[data-permanent-relation-workspace]:visible");
  await composer.waitFor();
  return composer;
}

export async function closeGraphRelationComposer(composer) {
  await composer.locator('[data-permanent-relation-action="close"]').click();
  await composer.waitFor({ state: "hidden" });
}
