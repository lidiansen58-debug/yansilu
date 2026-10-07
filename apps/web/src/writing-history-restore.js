export function createWritingRestorationId(cryptoRef = globalThis.crypto) {
  const id = typeof cryptoRef?.randomUUID === "function" ? cryptoRef.randomUUID()
    : Array.from(cryptoRef.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, "0")).join("");
  return `ds_${id}`;
}

export async function restoreWritingHistoryWithReadback(deps, projectId, payload, isCurrent = () => true) {
  const { restoreDraftScaffold, fetchDraftScaffold, fetchWritingProject } = deps;
  try { return await restoreDraftScaffold(projectId, payload); }
  catch (error) {
    if (!isCurrent() || error?.status === 400 || error?.status === 409) throw error;
    try {
      const saved = await fetchDraftScaffold(payload.restorationId);
      if (!isCurrent()) throw error;
      const project = await fetchWritingProject(projectId);
      if (!isCurrent() || project?.id !== projectId || project.scaffold_id !== payload.restorationId
        || saved?.item?.id !== payload.restorationId || saved.item.writing_project_id !== projectId
        || saved.item.generated_by !== `restored:${payload.sourceScaffoldId}` || !Array.isArray(saved.item.sections)) throw error;
      return { ...saved.item, writing_project: project };
    } catch { throw error; }
  }
}
