import test from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { optionalPlaywright, startPrototypeStack, createWritingReadyPermanentNote, postJson, waitFor } from "./prototype-copy-test-helpers.mjs";

async function controlsFit(page, locator, width) {
  const report = await locator.evaluate(el => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return { left: rect.left, right: rect.right, width: rect.width, height: rect.height, font: style.fontSize };
  });
  assert.ok(report.width > 0 && report.left >= 0 && report.right <= width + 1, JSON.stringify(report));
  assert.ok(report.height >= (width <= 700 ? 44 : 40), JSON.stringify(report));
  assert.equal(report.font, "14px");
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
}

async function graphToolsFit(page, width) {
  // Task changes can replace the toolbar: inspect one complete DOM snapshot.
  await waitFor(async () => {
    const report = await page.locator('.graph-map-floater').evaluateAll(floaters => floaters.map(floater => ({
      buttons: [...floater.querySelectorAll('button')].map(button => {
        const rect = button.getBoundingClientRect();
        return { left: rect.left, right: rect.right, width: rect.width, height: rect.height, font: getComputedStyle(button).fontSize };
      }),
      labels: [...floater.querySelectorAll('.graph-zoom-btn span')].map(label => ({
        width: label.getBoundingClientRect().width, display: getComputedStyle(label).display, opacity: getComputedStyle(label).opacity
      }))
    })));
    assert.equal(report.length, 1);
    assert.equal(report[0].buttons.length, 6);
    for (const button of report[0].buttons) {
      assert.ok(button.width > 0 && button.left >= 0 && button.right <= width + 1, JSON.stringify(button));
      assert.ok(button.height >= (width <= 700 ? 44 : 40), JSON.stringify(button));
      assert.equal(button.font, '14px');
    }
    assert.equal(report[0].labels.length, 3);
    for (const label of report[0].labels) {
      assert.ok(label.width > 0 && label.display !== 'none', 'Zoom labels must be available without hover');
      assert.equal(label.opacity, '1');
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  });
}

test("home, graph, theme suggestions and settings keep clear actions and usable controls across viewport sizes", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { apiBase, webBase, page } = stack;
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const notes = [];
  for (const title of ["解释能发现理解的缺口", "核对原文可以补上遗漏", "反例帮助划清观点边界"]) {
    notes.push((await createWritingReadyPermanentNote(apiBase, {
      title, body: `# ${title}\n\n用阅读实践检验理解。 #理解检验`, thesis: title,
      threeLineSummary: [title, "解释后应回到原文核对。", "反例帮助检验这个判断。"], boundaryOrCounterpoint: "还需要不同读者的实践。"
    })).json.item);
  }
  for (let i = 0; i < notes.length - 1; i++) {
    assert.equal((await postJson(apiBase, `/api/v1/notes/${notes[i].id}/relations`, {
      toNoteId: notes[i + 1].id, relationType: "supports", rationale: "一起说明检验理解的方法。"
    })).status, 201);
  }
  assert.equal((await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_fleeting_default", title: "今天阅读后留下的一个问题", body: "# 今天阅读后留下的一个问题\n\n解释时为什么会遗漏前提？"
  })).status, 201);
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await mkdir("output/main-flow-design-system", { recursive: true });

  for (const width of [1366, 390, 375, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator('.rail-btn[data-module="today"]').click();
    const home = page.locator("#todayOrganizingPanel");
    const primary = home.locator('.today-primary-step button');
    await primary.waitFor({ state: "visible" });
    assert.equal(await primary.innerText(), "整理这条记录");
    await controlsFit(page, primary, width);
    await home.locator('[data-today-secondary-tab="path"]').focus();
    await page.keyboard.press("Enter");
    assert.equal(await home.locator('[data-today-secondary-panel="path"]').isVisible(), true);
    assert.equal(await home.locator('.today-beginner-guide, .today-overview-compact').count(), 0);
    for (const button of await home.locator('.today-secondary-tab').all()) await controlsFit(page, button, width);
    await home.locator('[data-today-secondary-tab="path"]').click();
    await page.screenshot({ path: `output/main-flow-design-system/home-${width}.png` });

    await page.locator('.rail-btn[data-module="graph"]').click();
    await page.waitForFunction(() => window.__prototypeState.graphConnectivityReady);
    for (const view of ["structure", "relations", "themes"]) {
      const button = page.locator(`.graph-view-tabs [data-graph-task-view="${view}"]`);
      await controlsFit(page, button, width);
      await button.click();
      await waitFor(async () => assert.equal(await button.getAttribute("aria-pressed"), "true"));
      await graphToolsFit(page, width);
      assert.equal(await page.locator('.graph-pan-hint').count(), 0);
      assert.equal(await page.locator('.graph-map-star, .graph-map-nebula').count(), 0);
      assert.equal(await page.locator('.graph-map-backdrop').evaluate(el => getComputedStyle(el).fill), "rgb(245, 247, 248)");
      const hintStyles = await page.locator('.graph-canvas-help-hint').evaluateAll(hints => hints.map(hint => ({
        animation: getComputedStyle(hint).animationName, color: getComputedStyle(hint).color
      })));
      for (const hint of hintStyles) {
        assert.equal(hint.animation, 'none');
        assert.equal(hint.color, 'rgb(82, 97, 116)');
      }
      await page.screenshot({ path: `output/main-flow-design-system/graph-${view}-${width}.png` });
    }

    let releaseProjects, requested = false, responseCompleted = false;
    const projectsGate = new Promise(resolve => { releaseProjects = resolve; });
    const projectsRoute = async route => {
      if (route.request().method() !== "GET") return route.continue();
      requested = true;
      await projectsGate;
      await route.continue();
      responseCompleted = true;
    };
    await page.route('**/api/v1/writing-projects?*', projectsRoute);
    await page.locator('.rail-btn[data-module="writing"]').click();
    await page.locator("#btnWritingDiscoverThemes").click();
    const suggestion = page.locator('[data-theme-discovery-suggestion-id]').first();
    await suggestion.waitFor({ state: "visible" });
    const details = suggestion.locator('.writing-theme-explanation');
    assert.equal(await details.getAttribute("open"), null);
    const title = suggestion.getByLabel("主题名称", { exact: true });
    try {
      await waitFor(() => assert.ok(requested));
      await title.fill(`理解检验主题 ${width}`);
      const focusedField = await title.elementHandle();
      releaseProjects();
      await waitFor(() => assert.ok(responseCompleted));
      await page.waitForFunction(() => !document.querySelector('#writingProjectsList')?.innerText.includes('正在加载'));
      assert.equal(await focusedField.evaluate(el => el.isConnected && el === document.activeElement), true, "Background loading must retain the field being edited");
    } finally {
      releaseProjects();
      await page.unroute('**/api/v1/writing-projects?*', projectsRoute);
    }
    assert.equal(await suggestion.locator('[data-theme-discovery-field="title"]').inputValue(), `理解检验主题 ${width}`);
    for (const note of notes) assert.ok(!(await suggestion.innerText()).includes(note.id));
    await controlsFit(page, suggestion.locator('[data-theme-discovery-action="save"]'), width);
    await details.locator("summary").focus();
    await page.keyboard.press("Enter");
    assert.equal(await details.evaluate(el => el.open), true);
    await page.keyboard.press("Enter");
    assert.equal(await details.evaluate(el => el.open), false);
    await page.screenshot({ path: `output/main-flow-design-system/theme-${width}.png` });

    await page.locator('.rail-btn[data-module="settings"]').click();
    if (width < 1024) await page.locator("#settingsMobileItemSelect").selectOption("permanent-template");
    else await page.locator('[data-settings-item="permanent-template"]').click();
    const save = page.locator('[data-settings-template-kind="permanent"] [data-settings-template-action="save"]');
    await save.waitFor({ state: "visible" });
    await controlsFit(page, save, width);
    await waitFor(async () => assert.equal(await page.locator('#settingsPermanentTemplateEditor').evaluate(el => getComputedStyle(el).borderRadius), "8px"));
    await page.screenshot({ path: `output/main-flow-design-system/settings-${width}.png` });
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('.rail-btn[data-module="graph"]').click();
  await graphToolsFit(page, 844);
  assert.equal(await page.locator('.graph-map-node-core').first().evaluate(el => getComputedStyle(el).animationName), 'none');
  await page.screenshot({ path: 'output/main-flow-design-system/graph-landscape-reduced-motion.png' });
  assert.deepEqual(errors, []);
});
