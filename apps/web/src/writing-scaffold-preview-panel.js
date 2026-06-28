export function renderWritingScaffoldPreviewDom(deps = {}) {
  const {
    $,
    state,
    writingState,
    currentWritingContinuationEntry,
    describeWritingProjectPreflight,
    describeProjectPreflight,
    groupWritingPreflightChecks,
    writingDraftDirectoryId,
    folderById,
    parseWritingBasketIds,
    describeWritingNextActionFromState,
    escapeHtml
  } = deps;
  const el = $("writingScaffoldPreview");
  if (!el) return;
  const projectEntry = (!writingState.project?.id && currentWritingContinuationEntry("当前写作篮")) || null;
  const projectPreflightSummary = describeWritingProjectPreflight(writingState.project?.preflight || null);
  if (!writingState.scaffold) {
    el.innerHTML = `
      <h4>草稿骨架预览</h4>
      <div class="writing-empty">${
        projectEntry?.projectId && projectEntry?.actionLabel
          ? `当前写作篮已经对应${escapeHtml(projectEntry.status)}。先用上面的“${escapeHtml(projectEntry.actionLabel)}”继续，再回来查看草稿骨架预览。`
          : `当前写作篮入口：${escapeHtml(projectEntry?.status || "先补写作材料")}。${escapeHtml(projectEntry?.hint || "先补齐写作材料，再回来查看草稿骨架预览。")}`
      }</div>
    `;
    return;
  }

  const sections = Array.isArray(writingState.scaffold.sections) ? writingState.scaffold.sections : [];
  const questions = Array.isArray(writingState.scaffold.open_questions) ? writingState.scaffold.open_questions : [];
  const preflight = writingState.scaffold.preflight || null;
  const preflightSummary = describeProjectPreflight(preflight);
  const { checks: preflightChecks, blocking: blockingChecks, warnings: warningChecks, passes: passingChecks } = groupWritingPreflightChecks(preflight);
  const markdown = String(writingState.scaffoldMarkdown || "").trim();
  const targetDirectoryId = writingDraftDirectoryId();
  const targetFolder = folderById(state, targetDirectoryId);
  const nextAction = describeWritingNextActionFromState({
    basketCount: parseWritingBasketIds().length,
    hasProject: Boolean(writingState.project?.id),
    hasScaffold: Boolean(writingState.scaffold?.id),
    hasDraft: Boolean(writingState.project?.draft_note_id),
    projectEntryProjectId: Boolean(writingState.project?.id) ? "" : String(projectEntry?.projectId || "").trim(),
    projectEntryAction: Boolean(writingState.project?.id) ? "" : String(projectEntry?.action || "").trim(),
    projectEntryActionLabel: Boolean(writingState.project?.id) ? "" : String(projectEntry?.actionLabel || "").trim(),
    projectPreflightLevel: Boolean(writingState.project?.id) ? projectPreflightSummary.level : "",
    projectPreflightHint: Boolean(writingState.project?.id) ? projectPreflightSummary.hint : "",
    projectPreflightChecksLength: Array.isArray(writingState.project?.preflight?.checks) ? writingState.project.preflight.checks.length : 0,
    blockingCount: blockingChecks.length,
    warningCount: warningChecks.length
  });
  el.innerHTML = `
    <h4>草稿骨架预览</h4>
    <div class="writing-summary">
      草稿骨架：${escapeHtml(writingState.scaffold.id || "未命名")}；章节 ${escapeHtml(sections.length || 0)} 个；开放问题 ${escapeHtml(questions.length || 0)} 个。
    </div>
    <div class="writing-summary">
      保存草稿时会写入：${escapeHtml(targetFolder?.name || targetDirectoryId)}。
    </div>
    <div class="writing-summary">
      下一步：${escapeHtml(nextAction.title)}。${escapeHtml(nextAction.note)}
    </div>
    ${
      preflightChecks.length
        ? `<div>
            <h4>生成前检查</h4>
            <div class="writing-summary">
              ${escapeHtml(preflightSummary.level === "ready" ? preflightSummary.status : preflightSummary.hint)}
            </div>
            ${
              warningChecks.length
                ? `<div class="writing-summary">提醒项：${escapeHtml(String(warningChecks.length))} 个，建议先补齐再保存草稿。</div>`
                : ""
            }
            ${
              passingChecks.length
                ? `<div class="writing-summary">已通过：${escapeHtml(String(passingChecks.length))} 项。</div>`
                : ""
            }
            <ul>
              ${preflightChecks
                .map(
                  (check) =>
                    `<li><strong>${escapeHtml(check.status === "pass" ? "通过" : "提醒")}：${escapeHtml(check.label || "")}</strong> ${escapeHtml(check.message || "")}</li>`
                )
                .join("")}
            </ul>
          </div>`
        : ""
    }
    <div>
      <h4>章节结构</h4>
      ${
        sections.length
          ? `<ol>${sections
              .map((section) => {
                const gaps = Array.isArray(section.gaps) ? section.gaps : [];
                const counterpoints = Array.isArray(section.counterpoints) ? section.counterpoints : [];
                const sectionQuestions = Array.isArray(section.open_questions) ? section.open_questions : [];
                return `
                  <li>
                    <strong>${escapeHtml(section.heading || `Section ${section.order || ""}`)}</strong> ${escapeHtml(section.purpose || "")}
                    ${
                      gaps.length
                        ? `<div class="writing-summary">待补缺口：${escapeHtml(gaps.join(" / "))}</div>`
                        : ""
                    }
                    ${
                      counterpoints.length
                        ? `<div class="writing-summary">反方/边界：${escapeHtml(counterpoints.join(" / "))}</div>`
                        : ""
                    }
                    ${
                      sectionQuestions.length
                        ? `<div class="writing-summary">待回答问题：${escapeHtml(sectionQuestions.join(" / "))}</div>`
                        : ""
                    }
                  </li>
                `;
              })
              .join("")}</ol>`
          : `<div class="writing-empty">当前草稿骨架还没有章节。</div>`
      }
    </div>
    <div>
      <h4>待处理的反方与漏洞</h4>
      ${
        questions.length
          ? `<ul>${questions.map((question) => `<li>${escapeHtml(question)}</li>`).join("")}</ul>`
          : `<div class="writing-empty">当前草稿骨架还没有开放问题。</div>`
      }
    </div>
    <div>
      <h4>Markdown 预览</h4>
      ${markdown ? `<pre>${escapeHtml(markdown)}</pre>` : `<div class="writing-empty">本次返回里还没有 Markdown 内容。</div>`}
    </div>
  `;
}
