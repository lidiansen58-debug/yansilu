import { assertWritingDraftCanLeave } from "./writing-draft-save-controller.js";
import { captureWritingProjectCreationContext } from "./writing-project-creation-context.js";
import { createWritingProjectKeepingForm, syncWritingProjectForm } from "./writing-project-form-sync.js";

// A manual theme starts in the existing form. Sources and an outline are optional.
export function createWritingManualThemeController(deps) {
  let pending = null;
  function begin() {
    if (pending) return;
    assertWritingDraftCanLeave(deps.writingState);
    deps.resetWritingStrongModelState();
    deps.resetWritingLocalBookIdeas();
    deps.clearWritingSourceIndexIds();
    deps.setSelectedWritingThemeIndex("");
    deps.setWritingBasketIds([]);
    deps.resetWritingProjectContext();
    deps.writingState.manualThemeEntry = true;
    deps.openTheme();
    deps.$("writingTitle")?.focus();
  }
  async function start() {
    const { writingState, $ } = deps;
    const context = captureWritingProjectCreationContext(deps);
    const title = String($("writingTitle")?.value || "").trim();
    if (!title) { $("writingTitle")?.focus(); return null; }
    if (!writingState.project?.id) {
      await createWritingProjectKeepingForm(deps, context, {
        title, entryMode: "manual", basketNoteIds: deps.parseWritingBasketIds(), relatedIndexIds: [],
        bookStructure: { schema_version: 1, parts: [] }
      });
      context.assertCurrent();
      writingState.draftMarkdown = "";
      writingState.draftSaveState = "idle";
    }
    await syncWritingProjectForm(deps);
    context.assertCurrent();
    const project = writingState.project;
    writingState.projects = [project, ...(writingState.projects || []).filter(item => item.id !== project.id)];
    writingState.manualThemeEntry = false;
    deps.openDraft();
    return writingState.project;
  }
  return {
    begin,
    start() {
      if (!pending) pending = start().finally(() => { pending = null; });
      return pending;
    }
  };
}
