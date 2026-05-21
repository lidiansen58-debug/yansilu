import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

test("prototype empty writing center uses 项目 wording in the initial result area", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page } = stack;

  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.waitForFunction(() => !document.querySelector("#writingPanel")?.classList.contains("hidden"));

  await waitFor(async () => {
    const headingText = await page.locator("#writingPanel .writing-topline strong").textContent();
    assert.equal(String(headingText || "").trim(), "写作中心：把永久笔记组织成可推进的项目与草稿骨架");
    const projectInfoNoteText = String((await page.locator("#writingPanel .writing-section-note").first().textContent()) || "").trim();
    assert.equal(projectInfoNoteText, "先明确要推进的论题，再从已有永久笔记里挑选观点与证据，组织进写作篮和草稿骨架。");
    const stepFourText = await page.locator("#writingFlowSteps .writing-flow-step").nth(3).textContent();
    assert.match(String(stepFourText || ""), /生成草稿骨架后再保存/);
    const previewHeadingText = await page.locator("#writingScaffoldPreview h4").textContent();
    assert.equal(String(previewHeadingText || "").trim(), "草稿骨架预览");

    const resultText = await page.locator("#writingResult").textContent();
    assert.equal(String(resultText || "").trim(), "尚未开始项目。");

    const progressNoteText = String((await page.locator("#writingPanel .writing-section-note").nth(1).textContent()) || "").trim();
    assert.equal(progressNoteText, "看项目是否已创建、草稿骨架是否已生成，以及下一步能否导出或保存草稿。");

    const projectsHintText = String((await page.locator("#writingProjectsHint").textContent()) || "").trim();
    assert.match(projectsHintText, /显示最近更新的项目，支持恢复到当前工作区。|还没有项目，创建后会出现在这里。/);
    assert.doesNotMatch(projectsHintText, /写作项目/);

    const themeHintText = String((await page.locator("#writingThemeDetailHint").textContent()) || "").trim();
    assert.equal(themeHintText, "查看中心问题、主题压缩、相关永久笔记，并从主题直接创建项目。");

    const themeIndexListText = String((await page.locator("#writingThemeIndexList").textContent()) || "").trim();
    assert.match(themeIndexListText, /后续就能从这里直接进入写作中心。/);
    assert.doesNotMatch(themeIndexListText, /后续就能从这里直接开始写作。/);

    const scopeHintText = String((await page.locator("#writingScopeHint").textContent()) || "").trim();
    assert.match(scopeHintText, /写作中心入口默认从已有观点开始。/);
    assert.doesNotMatch(scopeHintText, /写作入口默认从已有观点开始。/);

    const basketSummaryText = String((await page.locator("#writingBasketSummary").textContent()) || "").trim();
    assert.match(basketSummaryText, /写作中心入口：尚未记录。/);
    assert.doesNotMatch(basketSummaryText, /主题入口：尚未记录。/);

    const scaffoldVersionsTitleText = String((await page.locator(".writing-section-title", { hasText: "草稿骨架版本" }).textContent()) || "").trim();
    assert.equal(scaffoldVersionsTitleText, "草稿骨架版本");

    const scaffoldHintText = String((await page.locator("#writingScaffoldVersionsHint").textContent()) || "").trim();
    assert.match(scaffoldHintText, /每次生成草稿骨架都会保留历史版本。|先创建或打开一个项目，这里才会显示版本。/);
    assert.doesNotMatch(scaffoldHintText, /写作项目/);

    const draftHintText = String((await page.locator("#writingDraftVersionsHint").textContent()) || "").trim();
    assert.match(draftHintText, /每次保存草稿都会保留一个新版本，并记录来源草稿骨架。|先创建或打开一个项目，这里才会显示草稿版本。/);
    assert.doesNotMatch(draftHintText, /写作项目/);

    const panelText = await page.locator("#writingPanel").textContent();
    assert.doesNotMatch(String(panelText || ""), /创建写作项目/);
    assert.doesNotMatch(String(panelText || ""), /尚未开始写作项目/);
    assert.doesNotMatch(String(panelText || ""), /进入写作项目/);
    assert.doesNotMatch(String(panelText || ""), /先创建写作项目/);
  }, 10000);
});
