function changedSpan(base, value) {
  let from = 0, end = base.length, valueEnd = value.length;
  while (from < end && from < valueEnd && base[from] === value[from]) from++;
  while (end > from && valueEnd > from && base[end - 1] === value[valueEnd - 1]) {
    end--;
    valueEnd--;
  }
  return { from, end, text: value.slice(from, valueEnd) };
}

export function mapDistillationSelection(before, after, selection) {
  if (!selection || !Number.isFinite(selection.from) || !Number.isFinite(selection.to)) return null;
  const change = changedSpan(before, after);
  const offset = position => position < change.from ? position : position >= change.end
    ? position + change.text.length - (change.end - change.from) : change.from + change.text.length;
  return { from: Math.max(0, Math.min(after.length, offset(selection.from))),
    to: Math.max(0, Math.min(after.length, offset(selection.to))) };
}

// Only merge disjoint edits. Ambiguous or overlapping changes keep the old revision guard.
export function mergeDistillationText(base, local, remote) {
  if (local === remote || local === base) return remote;
  if (remote === base) return local;
  if (![base, local, remote].every(value => typeof value === "string")) return null;
  const left = changedSpan(base, local), right = changedSpan(base, remote);
  if (left.from === right.from || !(left.end <= right.from || right.end <= left.from)) return null;
  const [first, second] = [left, right].sort((a, b) => a.from - b.from);
  return base.slice(0, first.from) + first.text + base.slice(first.end, second.from)
    + second.text + base.slice(second.end);
}

export function reconcileDistillationTab(tab, saved, baseline, body = tab.body) {
  const mergedBody = mergeDistillationText(baseline.savedBody, body, saved.body);
  const remoteTitle = saved.title || baseline.title;
  const mergedTitle = tab.title === remoteTitle || tab.title === baseline.savedTitle ? remoteTitle
    : remoteTitle === baseline.savedTitle ? tab.title : null;
  if (mergedBody === null || mergedTitle === null) {
    tab.body = body;
    tab.savedBody = baseline.savedBody;
    tab.savedTitle = baseline.savedTitle;
    tab.savedFileRevision = baseline.savedFileRevision;
    tab.dirty = true;
    tab.saveConflict = true;
    tab.saveUiState = { mode: "conflict" };
    return false;
  }
  tab.body = mergedBody;
  tab.title = mergedTitle;
  tab.savedBody = saved.body;
  tab.savedTitle = remoteTitle;
  tab.savedFileRevision = saved.fileRevision;
  tab.dirty = tab.body !== tab.savedBody || tab.title !== tab.savedTitle;
  return true;
}
