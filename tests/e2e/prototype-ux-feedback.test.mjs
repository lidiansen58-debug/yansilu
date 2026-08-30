import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { optionalPlaywright, startPrototypeStack, postJson, putJson, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

async function setup(t) {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return null; }
  const playwright = await optionalPlaywright(t);
  return playwright ? startPrototypeStack(t, playwright) : null;
}

test("UX feedback: an unconfirmed permanent note can be confirmed and added to writing", async t => {
  const stack = await setup(t);
  if (!stack) return;
  const { page, apiBase } = stack;
  const note = (await postJson(apiBase, "/api/v1/notes", { directoryId: "dir_original_default", body: "# Saving needs verification\n\n## 核心观点\nReopening a saved note helps verify that the content is durable." })).json.item;
  await page.locator("#btnToggleSearch").click();
  await page.locator(`[data-search-note="${note.id}"]`).click();
  await page.locator('[data-module="writing"]').click();
  await page.getByRole("button", { name: "相关笔记 0", exact: true }).click();
  const prepare = page.getByRole("button", { name: "确认并加入相关笔记", exact: true });
  await prepare.waitFor();
  page.once("dialog", dialog => dialog.dismiss());
  await prepare.click();
  await waitFor(async () => assert.match(await page.locator("[data-writing-preparation-status]").innerText(), /已取消/));
  assert.equal((await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item.authorship.user_confirmed, false);
  page.once("dialog", dialog => dialog.accept());
  await prepare.click();
  await page.getByRole("button", { name: "相关笔记 1", exact: true }).waitFor();
  const saved = (await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item;
  assert.equal(saved.status, "active");
  assert.equal(saved.authorship.user_confirmed, true);
  assert.equal(saved.body, note.body);
  assert.equal(await page.locator(`#writingBasketList article[data-writing-note-id="${note.id}"]`).isVisible(), true);
});

test("UX feedback: new-note verifies loaded blank content against disk", async t => {
  const stack = await setup(t);
  if (!stack) return;
  const { page, apiBase } = stack;
  await page.locator('[data-action="quick-fleeting"]').click();
  await page.locator("#btnNewNote").click();
  await page.waitForFunction(() => window.__prototypeState.notes.some(note => note.bodyLoaded));
  const original = (await fetchJson(apiBase, "/api/v1/directories/dir_fleeting_default/notes")).json.items[0];
  await putJson(apiBase, `/api/v1/notes/${original.id}`, { body: "# 未命名笔记\n\nSaved elsewhere. Keep this content." });
  await page.locator("#btnNewNote").click();
  await waitFor(async () => assert.equal((await fetchJson(apiBase, "/api/v1/directories/dir_fleeting_default/notes")).json.items.length, 2));
  const active = await page.evaluate(() => window.__prototypeState.tabs.find(tab => tab.id === window.__prototypeState.activeTabId)?.noteId);
  assert.notEqual(active, original.id);
  assert.match((await fetchJson(apiBase, `/api/v1/notes/${original.id}`)).json.item.body, /Keep this content/);
});

test("UX feedback: preparation timeout cancels late lookup and permits switching", async t => {
  const stack = await setup(t);
  if (!stack) return;
  const { page, apiBase, vaultPath } = stack;
  await page.locator('[data-action="quick-fleeting"]').click();
  await page.locator("#btnNewNote").click();
  await page.waitForFunction(() => window.__prototypeState.notes.some(note => note.bodyLoaded));
  const note = (await fetchJson(apiBase, "/api/v1/directories/dir_fleeting_default/notes")).json.items[0];
  await page.clock.install();
  let release, began, posts = 0;
  const held = new Promise(r => { release = r; }), started = new Promise(r => { began = r; });
  await page.route(`**/api/v1/notes/${note.id}`, async route => {
    const response = await route.fetch(); began(); await held;
    await route.fulfill({ response }).catch(() => {});
  });
  await page.route("**/api/v1/notes", route => { if (route.request().method() === "POST") posts++; return route.continue(); });
  try {
    await page.locator("#btnNewNote").click(); await started;
    await page.clock.fastForward(15001);
    await page.waitForFunction(() => document.querySelector("#statusText").textContent.includes("读取现有笔记超时"));
    assert.equal(await page.evaluate(() => Boolean(window.__prototypeState.pendingNoteCreation)), false);
    await page.locator('[data-module="settings"]').click();
    await page.locator('[data-settings-item="current-vault"]').click();
    const target = path.join(vaultPath, "after-read-timeout");
    await page.locator("#settingsVaultPath").fill(target);
    await page.locator("#settingsSwitchVault").click();
    await page.locator("[data-vault-switch-recovery]").waitFor({ state: "detached" });
    assert.equal((await fetchJson(apiBase, "/api/v1/vault")).json.item.vaultPath, target);
    release(); await page.clock.resume(); await page.waitForTimeout(100);
    assert.equal(posts, 0);
    assert.equal((await fetchJson(apiBase, "/api/v1/directories/dir_fleeting_default/notes")).json.items.length, 0);
  } finally { release(); }
});

test("UX feedback: rollback failure protects the note until restored", async t => {
  const stack = await setup(t);
  if (!stack) return;
  const { page, apiBase } = stack;
  const note = (await postJson(apiBase, "/api/v1/notes", { directoryId: "dir_fleeting_default", body: "# Recovery protected\n\nKeep this text" })).json.item;
  await page.locator("#btnToggleSearch").click();
  await page.locator(`[data-search-note="${note.id}"]`).click();
  await page.route(`**/api/v1/notes/${note.id}/move`, async route => {
    const response = await route.fetch();
    assert.equal(response.status(), 200);
    await route.fulfill({ status: 400, json: { error: { code: "NOTE_MOVE_RECOVERY_REQUIRED", message: "Restore the file to its original location", details: {
      originalDirectoryId: note.directoryId, originalMarkdownPath: note.markdownPath
    } } } });
  });
  await page.evaluate(async id => {
    const { handleNoteMoveStateChange } = await import('/app-shell-state-file-actions.js');
    const { moveNote, fetchNote } = await import('/prototype-api.js');
    await handleNoteMoveStateChange({ noteId: id, directoryId: 'dir_literature_default' }, {
      state: window.__prototypeState, moveNote, fetchNote
    });
  }, note.id);
  assert.equal(await page.locator("#editorWorkspace").evaluate(node => node.inert), true);
  await page.locator(".note-move-recovery button").click();
  assert.equal(await page.locator("#editorWorkspace").evaluate(node => node.inert), true);
  assert.equal((await postJson(apiBase, `/api/v1/notes/${note.id}/move`, { directoryId: note.directoryId })).status, 200);
  await page.locator(".note-move-recovery button").click();
  await page.locator(".note-move-recovery").waitFor({ state: "detached" });
  assert.equal(await page.locator("#editorWorkspace").evaluate(node => node.inert), false);
});

test("UX feedback: unresolved move blocks reopening or leaving the vault until verified", async t => {
  const stack = await setup(t);
  if (!stack) return;
  const { page, apiBase, vaultPath } = stack;
  const note = (await postJson(apiBase, "/api/v1/notes", { directoryId: "dir_fleeting_default", body: "# Pending move\n\nKeep the original content." })).json.item;
  await page.locator("#btnToggleSearch").click();
  await page.locator(`[data-search-note="${note.id}"]`).click();
  let release, switches = 0;
  const held = new Promise(resolve => { release = resolve; });
  await page.route(`**/api/v1/notes/${note.id}/move`, async route => {
    await held;
    await route.continue().catch(() => {});
  });
  await page.route(url => url.pathname === "/api/v1/vault", route => {
    if (route.request().method() === "POST") switches++;
    return route.continue();
  });
  try {
    await page.evaluate(async id => {
      const { handleNoteMoveStateChange } = await import('/app-shell-state-file-actions.js');
      const { moveNote, fetchNote } = await import('/prototype-api.js');
      await handleNoteMoveStateChange({ noteId: id, directoryId: 'dir_literature_default' }, {
        state: window.__prototypeState, moveNote, fetchNote, moveTimeoutMs: 10
      });
    }, note.id);
    assert.equal(await page.locator("#editorWorkspace").evaluate(node => node.inert), true);
    await page.locator('[data-module="settings"]').click();
    await page.locator('[data-settings-item="current-vault"]').click();
    const target = path.join(vaultPath, "after-move-verification");
    for (const attemptedPath of [vaultPath, target]) {
      await page.locator('[data-settings-item="current-vault"]').click();
      await page.locator("#settingsVaultPath").fill(attemptedPath);
      await page.locator("#settingsSwitchVault").click();
      await page.waitForFunction(() => document.querySelector("#statusText").textContent.includes("移动结果尚未确认"));
      assert.equal(switches, 0);
      assert.equal(await page.evaluate(() => window.__prototypeState.unresolvedNoteMove?.noteId), note.id);
      assert.equal((await fetchJson(apiBase, "/api/v1/vault")).json.item.vaultPath, vaultPath);
    }
    release();
    await waitFor(async () => assert.equal((await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item.directoryId, "dir_literature_default"));
    await page.locator(".note-move-recovery button").click();
    await page.locator(".note-move-recovery").waitFor({ state: "detached" });
    await page.locator('[data-settings-item="current-vault"]').click();
    await page.locator("#settingsVaultPath").fill(target);
    await page.locator("#settingsSwitchVault").click();
    await waitFor(async () => assert.equal((await fetchJson(apiBase, "/api/v1/vault")).json.item.vaultPath, target));
    await page.locator("[data-vault-switch-recovery]").waitFor({ state: "detached" });
    assert.equal(switches, 1);
  } finally { release(); }
});

for (const delayedPart of ["prepare", "post"]) {
  test(`UX feedback: lost move ${delayedPart} recovers without executing after switching vaults`, async t => {
    const stack = await setup(t);
    if (!stack) return;
    const { page, apiBase, vaultPath } = stack;
    const note = (await postJson(apiBase, "/api/v1/notes", { directoryId: "dir_fleeting_default", body: "# Unsent move\n\nKeep this original." })).json.item;
    await page.locator("#btnToggleSearch").click();
    await page.locator(`[data-search-note="${note.id}"]`).click();
    let release, online = false, operationId, instanceId, posts = 0;
    const held = new Promise(resolve => { release = resolve; });
    await page.route(`**/api/v1/notes/${note.id}/move-status`, async route => {
      const body = route.request().postDataJSON();
      if (body.action === "prepare") {
        operationId = body.operationId;
        const response = await route.fetch();
        instanceId = (await response.json()).item.instanceId;
        if (delayedPart === "prepare") await held;
        return route.fulfill({ response }).catch(() => {});
      }
      return online ? route.continue() : route.abort("failed");
    });
    await page.route(`**/api/v1/notes/${note.id}/move`, route => { posts++; return route.abort("failed"); });
    try {
      await page.evaluate(async id => {
        const { handleNoteMoveStateChange } = await import('/app-shell-state-file-actions.js');
        const { moveNote, fetchNote, checkNoteMove } = await import('/prototype-api.js');
        await handleNoteMoveStateChange({ noteId: id, directoryId: 'dir_literature_default' }, {
          state: window.__prototypeState, moveNote, fetchNote, checkNoteMove, moveTimeoutMs: 100
        });
      }, note.id);
      assert.equal(await page.evaluate(() => window.__prototypeState.unresolvedNoteMove?.noteId), note.id);
      online = true;
      await page.locator(".note-move-recovery button").click();
      await page.locator(".note-move-recovery").waitFor({ state: "detached" });
      assert.equal(await page.locator("#editorWorkspace").evaluate(node => node.inert), false);
      assert.equal((await fetchJson(apiBase, `/api/v1/notes/${note.id}`)).json.item.directoryId, note.directoryId);
      await page.locator('[data-module="settings"]').click();
      await page.locator('[data-settings-item="current-vault"]').click();
      const target = path.join(vaultPath, `after-lost-${delayedPart}`);
      await page.locator("#settingsVaultPath").fill(target);
      await page.locator("#settingsSwitchVault").click();
      await waitFor(async () => assert.equal((await fetchJson(apiBase, "/api/v1/vault")).json.item.vaultPath, target));
      release();
      await page.waitForTimeout(100);
      assert.equal(posts, delayedPart === "prepare" ? 0 : 1);
      const late = await postJson(apiBase, `/api/v1/notes/${note.id}/move`, { operationId, instanceId, directoryId: "dir_literature_default" });
      assert.equal(late.status, 400);
      assert.equal(late.json.error.code, "NOTE_MOVE_CANCELLED");
    } finally { release(); }
  });
}

test("UX feedback: pending creation blocks switching and stale vault requests cannot write", async t => {
  const stack = await setup(t);
  if (!stack) return;
  const { page, apiBase, vaultPath } = stack;
  let release, started, captured;
  const held = new Promise(r => { release = r; }), began = new Promise(r => { started = r; });
  await page.route("**/api/v1/notes", async route => {
    if (route.request().method() !== "POST") return route.continue();
    captured = route.request().postDataJSON(); started(); await held;
    await route.continue().catch(() => {});
  });
  try {
    await page.locator('[data-action="quick-fleeting"]').click();
    await page.locator("#btnNewNote").click(); await began;
    assert.equal(path.resolve(captured.expectedVaultPath), path.resolve(vaultPath));
    await page.locator('[data-module="settings"]').click();
    await page.locator('[data-settings-item="current-vault"]').click();
    const target = path.join(vaultPath, "target-b");
    await page.locator("#settingsVaultPath").fill(target);
    await page.locator("#settingsSwitchVault").click();
    await waitFor(async () => assert.match(await page.locator("#statusText").innerText(), /创建结果后再切换/));
    assert.equal((await fetchJson(apiBase, "/api/v1/vault")).json.item.vaultPath, path.resolve(vaultPath));
    release();
    await waitFor(async () => assert.equal((await fetchJson(apiBase, "/api/v1/directories/dir_fleeting_default/notes")).json.items.length, 1));
    await page.waitForFunction(() => !window.__prototypeState.pendingNoteCreation);
    await page.locator('[data-module="settings"]').click();
    await page.locator('[data-settings-item="current-vault"]').click();
    await page.locator("#settingsVaultPath").fill(target);
    await page.locator("#settingsSwitchVault").click();
    await waitFor(async () => assert.equal((await fetchJson(apiBase, "/api/v1/vault")).json.item.vaultPath, target));
    await page.locator("[data-vault-switch-recovery]").waitFor({ state: "detached" });
    const late = await postJson(apiBase, "/api/v1/notes", { ...captured, clientCreationId: "33333333-3333-4333-8333-333333333333" });
    assert.equal(late.status, 409);
    assert.equal(late.json.error.code, "VAULT_CHANGED");
    assert.equal((await fetchJson(apiBase, "/api/v1/directories/dir_fleeting_default/notes")).json.items.length, 0);
  } finally { release(); }
});

test("UX feedback: search refreshes previously opened clean content", async t => {
  const stack = await setup(t);
  if (!stack) return;
  const { page, apiBase } = stack;
  const note = (await postJson(apiBase, "/api/v1/notes", { directoryId: "dir_fleeting_default", body: "# Search freshness\n\nOld body" })).json.item;
  await page.locator("#btnToggleSearch").click();
  await page.locator(`[data-search-note="${note.id}"]`).click();
  await page.waitForFunction(() => document.querySelector("#editorBody").value.includes("Old body"));
  await putJson(apiBase, `/api/v1/notes/${note.id}`, { body: "# Search freshness\n\nUniqueNewSavedPhrase" });
  await page.locator("#btnToggleSearch").click();
  await page.locator("#globalNoteSearchInput").fill("UniqueNewSavedPhrase");
  const result = page.locator(`[data-search-note="${note.id}"]`);
  await waitFor(async () => assert.match(await result.innerText(), /UniqueNewSavedPhrase/));
  await result.click();
  await page.locator("#noteSearchDialog").waitFor({ state: "hidden" });
  assert.match(await page.locator("#editorBody").inputValue(), /UniqueNewSavedPhrase/);
});

test("UX feedback: duplicate creation IDs reject without writing another file", async t => {
  const stack = await setup(t);
  if (!stack) return;
  const { apiBase, vaultPath } = stack;
  const payload = { clientCreationId: "22222222-2222-4222-8222-222222222222", directoryId: "dir_fleeting_default", body: "# Stable\n\nKeep original" };
  const first = await postJson(apiBase, "/api/v1/notes", payload);
  assert.equal(first.status, 201);
  const repeat = await postJson(apiBase, "/api/v1/notes", { ...payload, body: "# Changed" });
  assert.equal(repeat.json.error.code, "NOTE_ID_EXISTS");
  assert.deepEqual(await fs.readdir(path.join(vaultPath, "notes/fleeting")), [path.basename(first.json.item.markdownPath)]);
});

for (const switchVault of [false, true]) {
  test(`UX feedback: stale search open is ignored after ${switchVault ? "switching vaults" : "selecting a different result"}`, async t => {
    const stack = await setup(t);
    if (!stack) return;
    const { page, apiBase, vaultPath } = stack;
    const a = (await postJson(apiBase, "/api/v1/notes", { directoryId: "dir_fleeting_default", body: "# Search A\n\nOld selection." })).json.item;
    const b = (await postJson(apiBase, "/api/v1/notes", { directoryId: "dir_fleeting_default", body: "# Search B\n\nLatest selection." })).json.item;
    let release, started, finished;
    const held = new Promise(r => { release = r; }), began = new Promise(r => { started = r; }), done = new Promise(r => { finished = r; });
    await page.route(`**/api/v1/notes/${a.id}`, async route => {
      const response = await route.fetch(); started(); await held;
      await route.fulfill({ response }).catch(() => {}); finished();
    });
    try {
      await page.locator("#btnToggleSearch").click();
      await page.locator(`[data-search-note="${a.id}"]`).click();
      await began;
      if (switchVault) {
        await page.keyboard.press("Escape");
        await page.locator('[data-module="settings"]').click();
        await page.locator('[data-settings-item="current-vault"]').click();
        await page.locator("#settingsVaultPath").fill(path.join(vaultPath, "search-target"));
        await page.locator("#settingsSwitchVault").click();
        await waitFor(async () => assert.equal((await fetchJson(apiBase, "/api/v1/vault")).json.item.vaultPath, path.join(vaultPath, "search-target")));
        await page.locator("[data-vault-switch-recovery]").waitFor({ state: "detached" });
      } else {
        await page.locator(`[data-search-note="${b.id}"]`).click();
        await page.waitForFunction(() => document.querySelector("#editorBody")?.value.includes("Latest selection."));
      }
      release(); await done;
      await page.waitForTimeout(100);
      assert.equal(await page.evaluate(id => window.__prototypeState.notes.some(note => note.id === id), a.id), false);
      const active = await page.evaluate(() => window.__prototypeState.tabs.find(tab => tab.id === window.__prototypeState.activeTabId)?.noteId || null);
      assert.equal(active, switchVault ? null : b.id);
    } finally { release(); }
  });
}

test("UX feedback: lost creation response is recovered by ID and persisted only once", async t => {
  const stack = await setup(t);
  if (!stack) return;
  const { page, apiBase, vaultPath } = stack;
  let posts = 0, creationId;
  await page.route("**/api/v1/notes", async route => {
    if (route.request().method() !== "POST") return route.continue();
    posts++; creationId = route.request().postDataJSON().clientCreationId;
    assert.ok(creationId);
    assert.equal((await route.fetch()).status(), 201);
    await route.abort("failed");
  });
  await page.locator('[data-action="quick-fleeting"]').click();
  await page.locator("#btnNewNote").click();
  await waitFor(async () => assert.match(await page.locator("#statusText").innerText(), /笔记已保存到本地/));
  const response = await fetchJson(apiBase, "/api/v1/directories/dir_fleeting_default/notes");
  assert.equal(posts, 1); assert.equal(response.json.items.length, 1);
  assert.equal(response.json.items[0].id, `note_${creationId}`);
  await fs.access(path.join(vaultPath, response.json.items[0].markdownPath));
});

test("UX feedback: a late creation response cannot restore the initial blank body", async t => {
  const stack = await setup(t);
  if (!stack) return;
  const { page, apiBase } = stack;
  await page.clock.install();
  let release, started, delivered, created, allowVerify = false, posts = 0;
  const held = new Promise(r => { release = r; }), began = new Promise(r => { started = r; }), done = new Promise(r => { delivered = r; });
  await page.route("**/api/v1/notes", async route => {
    if (route.request().method() !== "POST") return route.continue();
    posts++;
    const response = await route.fetch();
    created = (await response.json()).item; started(); await held;
    await route.fulfill({ response }).catch(() => {}); delivered();
  });
  await page.route(/\/api\/v1\/notes\/note_[^/]+$/, route => allowVerify ? route.continue()
    : route.fulfill({ status: 503, json: { error: { message: "Temporarily cannot verify" } } }));
  try {
    await page.locator('[data-action="quick-fleeting"]').click();
    await page.locator("#btnNewNote").click(); await began;
    await page.clock.fastForward(15001);
    await page.waitForFunction(() => document.querySelector("#statusText").textContent.includes("创建结果尚未确认"));
    release(); await done;
    const body = "# Saved after creation\n\nKeep the user's latest work.";
    assert.equal((await putJson(apiBase, `/api/v1/notes/${created.id}`, { body })).status, 200);
    allowVerify = true;
    await page.locator("#btnNewNote").click();
    await page.waitForFunction(() => document.querySelector("#editorBody")?.value.includes("Keep the user's latest work."));
    assert.equal(posts, 1);
    assert.match((await fetchJson(apiBase, `/api/v1/notes/${created.id}`)).json.item.body, /latest work/);
  } finally { release(); }
});

test("UX feedback: search restores the body of an existing unloaded tab", async t => {
  const stack = await setup(t);
  if (!stack) return;
  const { page, apiBase } = stack;
  const created = (await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_fleeting_default", body: "# Existing tab\n\nFull content recovered from disk."
  })).json.item;
  await page.evaluate(note => {
    window.__prototypeState.notes = [{ ...note, folderId: note.directoryId, body: "# Existing tab\n", bodyLoaded: false }];
    window.__prototypeEditor.openNoteTab(note.id);
  }, created);
  await page.locator("#btnToggleSearch").click();
  await page.locator(`[data-search-note="${created.id}"]`).click();
  await page.locator("#noteSearchDialog").waitFor({ state: "hidden" });
  assert.match(await page.locator("#editorBody").inputValue(), /Full content recovered from disk/);
  assert.equal(await page.evaluate(() => window.__prototypeState.tabs[0].body === window.__prototypeState.tabs[0].savedBody), true);
});

test("UX feedback: create persists a file and failure preserves the previous note", async (t) => {
  const stack = await setup(t);
  if (!stack) return;
  const { page, apiBase, vaultPath } = stack;
  await page.locator('[data-action="quick-fleeting"]').click();
  await page.locator("#btnNewNote").click();
  await waitFor(async () => {
    const res = await fetchJson(apiBase, "/api/v1/directories/dir_fleeting_default/notes");
    assert.equal(res.json.items.length, 1);
    const disk = await fs.readFile(path.join(vaultPath, res.json.items[0].markdownPath), "utf8");
    assert.match(disk, /未命名笔记/);
  });
  await page.locator('[data-action="quick-original"]').click();
  const before = await page.locator(".tab").count();
  await page.route("**/api/v1/notes", (route) => route.request().method() === "POST"
    ? route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { message: "Test: disk is read-only" } }) })
    : route.continue());
  await page.locator("#btnNewNote").click();
  await waitFor(async () => {
    assert.equal(await page.locator("#statusBar").isVisible(), true);
    assert.match(await page.locator("#statusText").innerText(), /未能创建笔记/);
    assert.equal(await page.locator(".tab").count(), before);
  });
  await page.screenshot({ path: path.join(os.tmpdir(), "yansilu-ux-create-error.png") });
});

test("UX feedback: empty folders expand with an explicit empty state", async (t) => {
  const stack = await setup(t);
  if (!stack) return;
  const { page } = stack;
  await page.locator('[data-action="quick-fleeting"]').click();
  const toggle = page.locator('[data-toggle-folder="dir_fleeting_default"]');
  if (await toggle.getAttribute("aria-expanded") === "true") await toggle.click();
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  await toggle.click();
  assert.equal(await toggle.getAttribute("aria-expanded"), "true");
  assert.equal(await page.locator('[data-empty-folder="dir_fleeting_default"]').isVisible(), true);
});

test("UX feedback: image preview decodes pixels and reports a missing asset", async (t) => {
  const stack = await setup(t);
  if (!stack) return;
  const { page, apiBase, webBase } = stack;
  const created = await postJson(apiBase, "/api/v1/notes", { directoryId: "dir_fleeting_default", body: "# Image note\n\nAn image." });
  assert.equal(created.status, 201);
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('[data-action="quick-fleeting"]').click();
  await page.locator(`.explorer-item[data-kind="file"][data-id="${created.json.item.id}"]`).click();
  await page.waitForFunction(() => document.querySelector("#editorBody")?.value.includes("An image."));
  if (!(await page.locator("#markdownSplit").evaluate((node) => node.classList.contains("editor-mode-wysiwyg")))) {
    await page.locator("#btnModeToggle").click();
  }
  await page.locator("#assetImageInput").setInputFiles({
    name: "image test.png", mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9l9wAAAABJRU5ErkJggg==", "base64")
  });
  const image = page.locator("#wysiwygHost img[data-preview-asset-url]:visible").first();
  await image.waitFor();
  await image.dispatchEvent("click");
  await page.waitForFunction(() => document.querySelector("#assetPreviewBody img")?.naturalWidth > 0);
  assert.equal(await page.locator("#assetPreviewMask").isVisible(), true);
  assert.equal(await page.locator("#assetPreviewBody img").isVisible(), true);
  assert.equal(await page.locator("#assetPreviewBody [role=status]").isVisible(), false);
  assert.equal(await page.getByRole("button", { name: "重新加载", exact: true }).isVisible(), false);
  await page.locator("#btnCloseAssetPreview").click();
  await image.evaluate((node) => { node.dataset.previewAssetUrl = node.dataset.previewAssetUrl.replace(/path=.*/, "path=assets%2Fmissing.png"); });
  await image.dispatchEvent("click");
  await waitFor(async () => assert.match(await page.locator("#assetPreviewBody").innerText(), /图片未能加载/));
  assert.equal(await page.locator("#assetPreviewBody img").isVisible(), false);
  assert.equal(await page.getByRole("button", { name: "重新加载", exact: true }).isVisible(), true);
});

test("UX feedback: global search finds unopened body text and opens the note", async (t) => {
  const stack = await setup(t);
  if (!stack) return;
  const { page, apiBase } = stack;
  const created = await postJson(apiBase, "/api/v1/notes", { directoryId: "dir_fleeting_default", body: "# Reading notes\n\n知识积累需要主动回忆，这段只在正文中。" });
  assert.equal(created.status, 201);
  await page.locator("#btnToggleSearch").click();
  await page.locator("#globalNoteSearchInput").fill("主动回忆");
  const result = page.locator(`[data-search-note="${created.json.item.id}"]`);
  await result.waitFor();
  assert.match(await result.innerText(), /知识积累需要主动回忆/);
  await result.click();
  await page.waitForFunction(() => document.querySelector("#editorBody")?.value.includes("主动回忆"));
  assert.equal(await page.locator("#noteSearchDialog").isVisible(), false);
  assert.equal(await page.locator("#editorWorkspace").isVisible(), true);
  assert.equal(await page.locator('[data-action="quick-fleeting"]').evaluate(node => node.classList.contains("current-root")), true);
  for (const module of ["settings", "graph", "writing"]) {
    await page.locator(`[data-module="${module}"]`).click();
    await page.locator("#btnToggleSearch").click();
    await result.click();
    await page.locator("#noteSearchDialog").waitFor({ state: "hidden" });
    assert.equal(await page.locator("#editorWorkspace").isVisible(), true, `search from ${module}`);
  }
});

test("UX feedback: first capture creates a fleeting note and offers explicit reclassification", async (t) => {
  const stack = await setup(t);
  if (!stack) return;
  const { page, apiBase } = stack;
  await page.locator('[data-today-action="start-first-note"]').click();
  await page.locator("#editorBody").waitFor({ state: "attached" });
  let id;
  await waitFor(async () => {
    const response = await fetchJson(apiBase, "/api/v1/directories/dir_fleeting_default/notes");
    assert.equal(response.json.items.length, 1);
    id = response.json.items[0].id;
  });
  const row = page.locator(`.explorer-item[data-kind="file"][data-id="${id}"]`);
  await row.click({ button: "right" });
  await page.getByText("归类与移动...", { exact: true }).click();
  await page.locator("#permanentNoteTargetFolder").selectOption("dir_literature_default");
  await page.locator("#permanentNoteCreate").click();
  await waitFor(async () => {
    const response = await fetchJson(apiBase, `/api/v1/notes/${id}`);
    assert.equal(response.json.item.noteType, "literature");
    assert.equal(await page.locator(`[data-action="quick-literature"]`).evaluate(node => node.classList.contains("current-root")), true);
  });
});

test("UX feedback: search keyboard, failures and responsive layout", async (t) => {
  const stack = await setup(t);
  if (!stack) return;
  const { page, apiBase } = stack;
  await postJson(apiBase, "/api/v1/notes", { directoryId: "dir_fleeting_default", body: "# 读书后的想法\n\n把一段内容讲给别人听，能帮助我发现理解中的缺口。" });
  await page.keyboard.press("Control+Shift+F");
  await page.locator("#globalNoteSearchInput").fill("理解中的缺口");
  await page.locator(".note-search-result").waitFor();
  for (const [width, height] of [[1366, 900], [390, 844]]) {
    await page.setViewportSize({ width, height });
    const dialog = page.locator(".note-search-dialog");
    const box = await dialog.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= width && box.y + box.height <= height);
    assert.equal(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth), true);
    await page.screenshot({ path: path.join(os.tmpdir(), `yansilu-ux-search-${width}.png`) });
  }
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#noteSearchDialog").isVisible(), false);
  await page.route("**/api/v1/notes/search?**", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { message: "服务暂时不可用" } }) }));
  await page.keyboard.press("Control+Shift+F");
  await waitFor(async () => assert.match(await page.locator("#noteSearchStatus").innerText(), /搜索失败/));
  await page.unroute("**/api/v1/notes/search?**");
  await page.route("**/api/v1/notes/search?**", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [], total: 0, unreadableCount: 2 }) }));
  await page.locator("#globalNoteSearchInput").fill("无法读取的文件");
  await waitFor(async () => assert.match(await page.locator("#noteSearchStatus").innerText(), /2 条笔记暂时无法读取/));
  await page.unroute("**/api/v1/notes/search?**");
  await page.locator("#globalNoteSearchInput").fill("缺口");
  await page.locator(".note-search-result").waitFor();
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelector("#editorBody")?.value.includes("缺口"));
});

test("UX feedback: help is readable offline without a local API", async (t) => {
  const stack = await setup(t);
  if (!stack) return;
  const { page } = stack;
  await page.locator('[data-module="settings"]').click();
  await page.locator('[data-settings-item="version-update"]').click();
  assert.match(await page.locator("#settingsUpdateCurrentVersion").innerText(), /0\.1\.1/);
  assert.match(await page.locator("#settingsUpdateChangelog").innerText(), /本机版本说明/);
  await page.screenshot({ path: path.join(os.tmpdir(), "yansilu-ux-about.png") });
  await page.goto(new URL("../../apps/web/src/help/quick-start.html", import.meta.url).href);
  await page.context().setOffline(true);
  await page.reload();
  assert.equal(await page.getByRole("heading", { name: "研思录使用指南", exact: true }).isVisible(), true);
  await page.getByText("图片无法打开", { exact: true }).click();
  assert.equal(await page.getByText(/如果附件文件已经被移动或删除/).isVisible(), true);
});

test("UX feedback: search isolates background shortcuts and preserves native input and result activation", async (t) => {
  const stack = await setup(t);
  if (!stack) return;
  const { page, apiBase, webBase } = stack;
  const background = await postJson(apiBase, "/api/v1/notes", { directoryId: "dir_fleeting_default", body: "# Background note\n\nKeep this note." });
  const target = await postJson(apiBase, "/api/v1/notes", { directoryId: "dir_fleeting_default", body: "# Search target\n\nOpen this result." });
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('[data-action="quick-fleeting"]').click();
  await page.locator(`.explorer-item[data-kind="file"][data-id="${background.json.item.id}"]`).click();
  await page.waitForFunction(() => document.querySelector("#editorBody")?.value.includes("Keep this note."));
  const dialogs = [], mutations = [];
  page.on("dialog", async (dialog) => { dialogs.push(dialog.message()); await dialog.dismiss(); });
  page.on("request", (request) => {
    if (["PUT", "PATCH", "DELETE"].includes(request.method()) && request.url().includes("/api/v1/notes/")) mutations.push(request.url());
  });
  await page.locator("#btnToggleSearch").click();
  const input = page.locator("#globalNoteSearchInput");
  await input.fill("Search targetX");
  await page.keyboard.press("Backspace");
  assert.equal(await input.inputValue(), "Search target");
  const result = page.locator(`[data-search-note="${target.json.item.id}"]`);
  await result.waitFor();
  await input.dispatchEvent("compositionstart", { data: "" });
  for (const key of ["Escape", "ArrowDown", "Enter"]) {
    const prevented = await input.evaluate((node, key) => {
      const event = new KeyboardEvent("keydown", { key, isComposing: true, bubbles: true, cancelable: true });
      node.dispatchEvent(event);
      return event.defaultPrevented;
    }, key);
    assert.equal(prevented, false);
    assert.equal(await page.locator("#noteSearchDialog").isVisible(), true);
    assert.equal(await input.evaluate(node => node === document.activeElement), true, await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 300)));
  }
  await input.dispatchEvent("compositionend", { data: "" });
  await page.keyboard.press("ArrowDown");
  assert.equal(await result.evaluate(node => node === document.activeElement), true);
  for (const key of ["Delete", "F2", "Control+s", "Control+ArrowLeft", "Alt+ArrowRight"]) await page.keyboard.press(key);
  assert.deepEqual(dialogs, []);
  assert.deepEqual(mutations, []);
  assert.match(await page.locator("#editorBody").inputValue(), /Keep this note/);
  assert.equal(await page.locator("#noteSearchDialog").isVisible(), true);
  await page.keyboard.press("Tab");
  assert.equal(await input.evaluate(node => node === document.activeElement), true);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelector("#editorBody")?.value.includes("Open this result."));
  assert.equal(await page.locator("#noteSearchDialog").isVisible(), false);
  await page.locator('#btnToggleSearch').click();
  await page.keyboard.press("Escape");
  await page.locator("#editorBody").evaluate(node => node.blur());
  await page.locator("#btnToggleSearch").focus();
  await page.keyboard.press("Delete");
  assert.equal(dialogs.length, 1);
  assert.match(dialogs[0], /Search target/);
});

for (const fail of [false, true]) {
  test(`UX feedback: pending move blocks edits and restores interaction after ${fail ? "failure" : "success"}`, async (t) => {
    const stack = await setup(t);
    if (!stack) return;
    const { page, apiBase, webBase, vaultPath } = stack;
    const directory = await postJson(apiBase, "/api/v1/directories", {
      title: "Nested", parentDirectoryId: "dir_fleeting_default", directoryType: "custom",
      fsPath: path.join(vaultPath, "notes", "fleeting", "nested"), maxNotes: 500
    });
    assert.equal(directory.status, 201);
    const created = await postJson(apiBase, "/api/v1/notes", { directoryId: "dir_fleeting_default", body: "# Move race\n\nOriginal text." });
    const id = created.json.item.id;
    const asset = await postJson(apiBase, "/api/v1/assets", {
      noteId: id, fileName: "test.png", mimeType: "image/png", kind: "image",
      contentBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9l9wAAAABJRU5ErkJggg=="
    });
    assert.equal(asset.status, 201);
    await putJson(apiBase, `/api/v1/notes/${id}`, { body: `${created.json.item.body}\n![test](${asset.json.item.markdownLinkPath})` });
    await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
    await page.locator('[data-action="quick-fleeting"]').click();
    const row = page.locator(`.explorer-item[data-kind="file"][data-id="${id}"]`);
    await row.click();
    await page.waitForFunction(() => document.querySelector("#editorBody")?.value.includes("![test]"));
    if (!(await page.locator("#editorHost .cm-content").isVisible())) await page.locator("#btnModeToggle").click();
    const before = await page.locator("#editorBody").inputValue();
    let release;
    const held = new Promise(resolve => { release = resolve; });
    const writes = [];
    page.on("request", request => { if (request.method() === "PUT" && request.url().includes(`/api/v1/notes/${id}`)) writes.push(request.url()); });
    await page.route("**/api/v1/notes/*/move", async route => {
      const response = fail ? null : await route.fetch();
      await held;
      if (fail) await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { message: "Move unavailable" } }) });
      else await route.fulfill({ response });
    });
    try {
      await row.click({ button: "right" });
      await page.getByText("归类与移动...", { exact: true }).click();
      await page.locator("#permanentNoteTargetFolder").selectOption(directory.json.item.id);
      await page.locator("#permanentNoteCreate").click();
      await page.locator("dialog[data-note-move-progress][open]").waitFor();
      await page.locator("#editorHost .cm-content").evaluate(node => node.focus());
      await page.keyboard.type("Must not enter the note.");
      await page.keyboard.press("Control+s");
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("dialog[data-note-move-progress][open]").isVisible(), true);
      assert.equal(await page.locator("#editorBody").inputValue(), before);
      assert.deepEqual(writes, []);
      if (!fail) await page.screenshot({ path: path.join(os.tmpdir(), "yansilu-move-progress.png") });
    } finally { release(); }
    await page.locator("dialog[data-note-move-progress]").waitFor({ state: "detached" });
    await page.locator("#editorHost .cm-content:visible").click();
    await page.keyboard.press("Control+End");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Editing works again.");
    const saved = page.waitForResponse(response => response.request().method() === "PUT" && response.url().includes(`/api/v1/notes/${id}`));
    await page.keyboard.press("Control+s");
    assert.equal((await saved).status(), 200);
    const current = (await fetchJson(apiBase, `/api/v1/notes/${id}`)).json.item;
    assert.match(current.body, /Editing works again/);
    assert.doesNotMatch(current.body, /Must not enter/);
    assert.equal(current.directoryId, fail ? "dir_fleeting_default" : directory.json.item.id);
    const link = current.body.match(/!\[test\]\(([^)]+)\)/)?.[1];
    assert.equal(path.posix.normalize(path.posix.join(path.posix.dirname(current.markdownPath), link)), asset.json.item.assetPath);
    await fs.access(path.join(vaultPath, asset.json.item.assetPath));
  });
}

for (const verificationFails of [false, true]) {
  test(`UX feedback: move timeout ${verificationFails ? "offers nonmodal recheck" : "verifies committed result"} without repeating POST`, async (t) => {
    const stack = await setup(t);
    if (!stack) return;
    const { page, apiBase, webBase } = stack;
    const note = await postJson(apiBase, "/api/v1/notes", { directoryId: "dir_fleeting_default", body: "# Timeout note\n\nKeep my content." });
    const other = await postJson(apiBase, "/api/v1/notes", { directoryId: "dir_fleeting_default", body: "# Other note\n\nOther content." });
    const id = note.json.item.id;
    await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
    await page.locator('[data-action="quick-fleeting"]').click();
    const row = page.locator(`.explorer-item[data-kind="file"][data-id="${id}"]`);
    await row.click();
    await page.waitForFunction(() => document.querySelector("#editorBody")?.value.includes("Keep my content."));
    let release, posts = 0;
    const held = new Promise(resolve => { release = resolve; });
    await page.route("**/api/v1/notes/*/move", async route => {
      posts++;
      const response = await route.fetch();
      await held;
      await route.fulfill({ response }).catch(() => {});
    });
    if (verificationFails) await page.route(`**/api/v1/notes/${id}`, route => route.fulfill({ status: 503, contentType: "application/json", body: "{}" }));
    try {
      await row.click({ button: "right" });
      await page.getByText("归类与移动...", { exact: true }).click();
      await page.locator("#permanentNoteTargetFolder").selectOption("dir_literature_default");
      await page.locator("#permanentNoteCreate").click();
      await page.locator("dialog[data-note-move-progress]").waitFor();
      await page.locator("dialog[data-note-move-progress]").waitFor({ state: "detached", timeout: 23000 });
      assert.equal(posts, 1);
      if (verificationFails) {
        assert.equal(await page.locator(".note-move-recovery").isVisible(), true);
        assert.equal(await page.locator("#editorWorkspace").evaluate(node => node.inert), true);
        await page.screenshot({ path: path.join(os.tmpdir(), "yansilu-move-recovery.png") });
        await row.click({ button: "right" });
        await page.locator('[data-action="rename"]:visible').click();
        await page.locator("[data-text-input-field]").fill("Must not rename");
        await page.locator("[data-text-input-confirm]").click();
        await waitFor(async () => assert.match(await page.locator("#statusText").innerText(), /暂不能保存/));
        assert.match(await row.innerText(), /Timeout note/);
        assert.doesNotMatch(await row.innerText(), /Must not rename/);
        await page.locator('[data-module="settings"]').click();
        assert.equal(await page.locator("#settingsPanel").isVisible(), true);
        await page.locator('[data-action="quick-fleeting"]').click();
        await page.locator(`.explorer-item[data-kind="file"][data-id="${other.json.item.id}"]`).click();
        assert.equal(await page.locator("#editorWorkspace").evaluate(node => node.inert), false);
        await page.unroute(`**/api/v1/notes/${id}`);
        await page.getByRole("button", { name: "重新核查", exact: true }).click();
        await page.locator(".note-move-recovery").waitFor({ state: "detached" });
      }
      assert.equal(posts, 1);
      assert.equal(await page.locator("#editorWorkspace").evaluate(node => node.inert), false);
      assert.equal((await fetchJson(apiBase, `/api/v1/notes/${id}`)).json.item.directoryId, "dir_literature_default");
    } finally { release(); }
  });
}

for (const hang of [false, true]) {
  test(`UX feedback: vault switch ${hang ? "times out with a usable recheck" : "recovers a lost response"}`, async t => {
    const stack = await setup(t);
    if (!stack) return;
    const { page, apiBase, vaultPath } = stack;
    const target = `${vaultPath}/unused/../switch-target`;
    const canonicalTarget = path.resolve(target);
    await page.locator('[data-module="settings"]').click();
    await page.locator('[data-settings-item="current-vault"]').click();
    await page.locator("#settingsVaultPath").fill(target);
    let posts = 0, allowVerify = !hang, release;
    const held = new Promise(resolve => { release = resolve; });
    await page.route(url => url.pathname === "/api/v1/vault", async route => {
      if (route.request().method() === "POST") {
        posts++;
        const response = await route.fetch();
        if (!hang) return route.abort("failed");
        await held;
        return route.fulfill({ response }).catch(() => {});
      }
      if (posts && !allowVerify) return route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
      return route.continue();
    });
    try {
      await page.locator("#settingsSwitchVault").click();
      const dialog = page.locator("[data-vault-switch-recovery]");
      if (hang) {
        const retry = dialog.getByRole("button", { name: "重新核查" });
        await waitFor(async () => assert.equal(await retry.isEnabled(), true), 23000);
        assert.equal(await dialog.evaluate(node => node.matches(":modal")), true);
        for (const width of [1366, 390]) {
          await page.setViewportSize({ width, height: 900 });
          const box = await dialog.boundingBox();
          assert.ok(box.x >= 0 && box.x + box.width <= width);
          await page.screenshot({ path: path.join(os.tmpdir(), `yansilu-vault-recovery-${width}.png`) });
        }
        allowVerify = true;
        await retry.click();
      }
      await dialog.waitFor({ state: "detached", timeout: 20000 });
      assert.equal(posts, 1);
      assert.equal((await fetchJson(apiBase, "/api/v1/vault")).json.item.vaultPath, canonicalTarget);
      assert.equal(await page.locator("#settingsVaultPath").inputValue(), canonicalTarget);
    } finally { release(); }
  });
}
