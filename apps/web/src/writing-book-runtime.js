import {
  currentWritingBookStructureForRuntime,
  deriveWritingBookDesign as deriveWritingBookDesignModel,
  deriveWritingLocalBookIdeas as deriveWritingLocalBookIdeasModel,
  normalizeWritingBookStructure as normalizeWritingBookStructureModel,
  uniqueWritingBookPoolItems,
  writingBookMatchesAny,
  writingBookPlainText,
  writingBookProjectAudienceForRuntime,
  writingBookProjectGoalForRuntime,
  writingBookProjectTitleForRuntime,
  writingBookSectionFromNote,
  writingBookShortText,
  writingBookStructureStats
} from "./prototype-writing-workspace.js";

export {
  uniqueWritingBookPoolItems,
  writingBookMatchesAny,
  writingBookPlainText,
  writingBookSectionFromNote,
  writingBookShortText
};

export function createWritingBookRuntime(host = {}) {
  const select = typeof host.$ === "function" ? host.$ : () => null;
  const writingState = host.writingState || {};
  const writingBasketEntries = typeof host.writingBasketEntries === "function"
    ? host.writingBasketEntries
    : () => [];

  function writingBookProjectTitle() {
    return writingBookProjectTitleForRuntime({
      projectTitle: writingState.project?.title,
      inputTitle: select("writingTitle")?.value
    });
  }

  function writingBookProjectGoal() {
    return writingBookProjectGoalForRuntime({
      projectGoal: writingState.project?.goal,
      inputGoal: select("writingGoal")?.value
    });
  }

  function writingBookProjectAudience() {
    return writingBookProjectAudienceForRuntime({
      projectAudience: writingState.project?.audience,
      inputAudience: select("writingAudience")?.value
    });
  }

  function deriveWritingBookDesign({
    notes = writingBasketEntries(),
    project = writingState.project,
    scaffold = writingState.scaffold
  } = {}) {
    return deriveWritingBookDesignModel({
      notes,
      project,
      scaffold,
      title: writingBookProjectTitle(),
      goal: writingBookProjectGoal(),
      audience: writingBookProjectAudience()
    });
  }

  function deriveWritingLocalBookIdeas({
    notes = writingBasketEntries(),
    project = writingState.project
  } = {}) {
    return deriveWritingLocalBookIdeasModel({
      notes,
      project,
      title: String(select("writingTitle")?.value || "").trim()
    });
  }

  function currentWritingBookStructure({
    notes = writingBasketEntries(),
    includeLocalIdeas = true
  } = {}) {
    return currentWritingBookStructureForRuntime({
      persistedStructure: writingState.project?.book_structure || {},
      derivedDesign: deriveWritingBookDesign({ notes }),
      localBookIdeas: writingState.localBookIdeas,
      includeLocalIdeas
    });
  }

  return {
    currentWritingBookStructure,
    deriveWritingBookDesign,
    deriveWritingLocalBookIdeas,
    normalizeWritingBookStructure: normalizeWritingBookStructureModel,
    uniqueWritingBookPoolItems,
    writingBookMatchesAny,
    writingBookPlainText,
    writingBookProjectAudience,
    writingBookProjectGoal,
    writingBookProjectTitle,
    writingBookSectionFromNote,
    writingBookShortText,
    writingBookStructureStats
  };
}
