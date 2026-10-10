// Basket and theme reads share a small queue. Each refresh still reads fresh
// relations; a queued read may not cross a vault switch into cloned note IDs.
export function createWritingRelationCountLoader({ fetchNoteRelations, countRelations, getScope = () => "", canRead = () => true }) {
  const queue = [];
  let active = 0;
  const currentScope = () => JSON.stringify(getScope());
  const cancelled = () => Object.assign(new Error("Writing relation context changed"), { code: "WRITING_CONTEXT_CHANGED" });

  function pump() {
    while (active < 4 && queue.length) {
      const job = queue.shift();
      if (!canRead() || job.scope !== currentScope()) { job.reject(cancelled()); continue; }
      active++;
      const run = async () => {
        try {
          const relations = await fetchNoteRelations(job.id);
          if (!canRead() || job.scope !== currentScope()) throw cancelled();
          return [job.id, { count: countRelations(relations), error: false }];
        } catch (error) {
          if (!canRead() || job.scope !== currentScope()) throw cancelled();
          return [job.id, { count: 0, error: true }];
        }
      };
      void run().then(job.resolve, job.reject).then(() => { active--; pump(); });
    }
  }

  return async function loadWritingRelationCounts(noteIds = []) {
    if (!canRead()) throw cancelled();
    const scope = currentScope();
    const ids = [...new Set(noteIds.map(id => String(id || "").trim()).filter(Boolean))];
    const results = await Promise.all(ids.map(id => new Promise((resolve, reject) => {
      queue.push({ id, scope, resolve, reject });
      pump();
    })));
    if (!canRead() || scope !== currentScope()) throw cancelled();
    return results.reduce((result, [id, value]) => {
      result.counts[id] = value.count;
      result.errors[id] = value.error;
      return result;
    }, { counts: {}, errors: {} });
  };
}
