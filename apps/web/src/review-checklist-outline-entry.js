import { uniqueStrings } from "./prototype-collection-utils.js";
import { sameUniqueStringSetForRuntime } from "./writing-theme-state.js";

function projectIds(projects = []) {
  return uniqueStrings(projects.map((project) => project?.id));
}

function mergeProjects(projectGroups = []) {
  const seen = new Set();
  const projects = [];
  projectGroups.flat().forEach((project) => {
    const id = String(project?.id || "").trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
    projects.push(project);
  });
  return projects;
}

export function reviewOutlineProjectMatches(project, { themeId = "", noteIds = [] } = {}) {
  const normalizedThemeId = String(themeId || "").trim();
  const normalizedNoteIds = uniqueStrings(noteIds);
  if (!project?.id) return false;

  const relatedIndexIds = uniqueStrings(project?.related_index_ids || project?.relatedIndexIds || []);
  const basketNoteIds = uniqueStrings(project?.basket_note_ids || project?.basketNoteIds || []);
  if (normalizedThemeId && relatedIndexIds.includes(normalizedThemeId)) return true;
  return normalizedNoteIds.length > 0 && sameUniqueStringSetForRuntime(basketNoteIds, normalizedNoteIds);
}

export function findReviewOutlineProject(projects = [], options = {}) {
  return (Array.isArray(projects) ? projects : []).find((project) => reviewOutlineProjectMatches(project, options)) || null;
}

async function loadProjectSearch(listWritingProjects, options = {}) {
  if (typeof listWritingProjects !== "function") return [];
  const projects = await listWritingProjects(options);
  return Array.isArray(projects) ? projects : [];
}

export async function findReviewOutlineProjectWithRefresh({
  indexCard = null,
  noteIds = [],
  writingState = {},
  listWritingProjects
} = {}) {
  const themeId = String(indexCard?.id || "").trim();
  const themeTitle = String(indexCard?.title || "").trim();
  const normalizedNoteIds = uniqueStrings(noteIds);
  const localProjects = mergeProjects([
    [writingState.project],
    Array.isArray(writingState.projects) ? writingState.projects : []
  ]);
  const localMatch = findReviewOutlineProject(localProjects, { themeId, noteIds: normalizedNoteIds });
  if (localMatch) return localMatch;

  const searchTerms = uniqueStrings([themeId, themeTitle]);
  const refreshedGroups = await Promise.all([
    loadProjectSearch(listWritingProjects, { limit: 50 }),
    ...searchTerms.map((q) => loadProjectSearch(listWritingProjects, { limit: 50, q }))
  ]);
  const refreshedProjects = mergeProjects(refreshedGroups);
  const refreshedMatch = findReviewOutlineProject(refreshedProjects, { themeId, noteIds: normalizedNoteIds });
  if (!refreshedMatch) return null;

  const knownIds = new Set(projectIds(localProjects));
  const refreshedMatchId = String(refreshedMatch?.id || "").trim();
  if (refreshedMatchId && !knownIds.has(refreshedMatchId)) {
    writingState.projects = [
      ...(Array.isArray(writingState.projects) ? writingState.projects : []),
      refreshedMatch
    ];
  }
  return refreshedMatch;
}
