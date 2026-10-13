// Initial positioning must yield as soon as the user chooses where to edit.
const positions = new WeakMap();

function positionState(host) {
  let state = positions.get(host);
  if (state) return state;
  state = { revision: 0, requests: new Map() };
  positions.set(host, state);
  const roots = host.els?.editorWrap
    ? [host.els.editorWrap]
    : [host.els?.editorHost, host.els?.wysiwygHost, host.els?.body];
  const invalidate = () => { state.revision += 1; };
  for (const root of new Set(roots.filter(Boolean))) {
    for (const event of ["pointerdown", "keydown", "beforeinput", "input", "compositionstart", "paste", "drop", "wheel"]) {
      root.addEventListener(event, invalidate, true);
    }
  }
  return state;
}

export function cancelEditorInitialPosition(host) {
  const state = positions.get(host);
  if (state) state.revision += 1;
}

export function beginEditorInitialPosition(host, kind) {
  const state = positionState(host);
  const request = {};
  state.requests.set(kind, request);
  const revision = state.revision;
  const tab = host.activeTab?.();
  const noteId = tab?.noteId;
  const vault = host.vaultScope?.();
  const mode = host.state?.previewMode;
  const module = host.state?.module;
  return () => Boolean(tab) && state.revision === revision && state.requests.get(kind) === request &&
    host.activeTab?.() === tab && tab.noteId === noteId && host.vaultScope?.() === vault &&
    host.state?.previewMode === mode && host.state?.module === module;
}
