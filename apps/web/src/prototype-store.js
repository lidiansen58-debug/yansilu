export function createInitialState() {
  const VAULT_ROOT = "E:\\Projects\\Thinking in Notes\\yansilu-vault";

  return {
    module: "today",
    browserRootId: "dir_original_default",
    selectedFolderId: "dir_original_default",
    selectedFileId: null,
    contextTarget: null,
    folders: [
      {
        id: "dir_fleeting_default",
        name: "随笔卡片盒",
        parentId: null,
        isDefault: true,
        hidden: false,
        maxCards: 500,
        fsPath: `${VAULT_ROOT}\\notes\\fleeting`
      },
      {
        id: "dir_literature_default",
        name: "文献卡片盒",
        parentId: null,
        isDefault: true,
        hidden: false,
        maxCards: 500,
        fsPath: `${VAULT_ROOT}\\notes\\literature`
      },
      {
        id: "dir_original_default",
        name: "永久笔记盒",
        parentId: null,
        isDefault: true,
        hidden: false,
        maxCards: 500,
        fsPath: `${VAULT_ROOT}\\notes\\original`
      }
    ],
    notes: [],
    tabs: [],
    activeTabId: null,
    searchQuery: "",
    searchVisible: false,
    inspectorVisible: false,
    previewMode: "wysiwyg",
    focusMode: false,
    appStartupPending: false,
    todayNoticeMessage: ""
  };
}

export function uid(prefix) {
  return `${prefix}_${Date.now().toString().slice(-6)}_${Math.floor(Math.random() * 99)}`;
}

export function parseTags(text) {
  return [...new Set((text.match(/#([\u4e00-\u9fa5\w-]+)/g) || []).map((x) => x.slice(1)))];
}

export function parseLinks(text) {
  const links = [];
  for (const match of String(text || "").matchAll(/\[\[([^[\]]+)\]\]/g)) {
    const raw = String(match[1] || "").trim();
    const [targetPart] = raw.split("|");
    const [pathAndHeading] = String(targetPart || "").split("^");
    const [targetRaw] = String(pathAndHeading || "").split("#");
    const target = String(targetRaw || "").trim();
    if (target) links.push(target);
  }
  return [...new Set(links)];
}

export function rootBoxIdFromFolder(state, folderId) {
  let cursor = folderById(state, folderId);
  while (cursor && cursor.parentId) {
    cursor = folderById(state, cursor.parentId);
  }
  return cursor?.id || "dir_original_default";
}

export function typeFromFolder(state, folderId) {
  const rootId = rootBoxIdFromFolder(state, folderId);
  if (rootId === "dir_fleeting_default") return "fleeting";
  if (rootId === "dir_literature_default") return "literature";
  return "permanent";
}

export function typeLabel(type) {
  return type === "fleeting" ? "随笔" : type === "literature" ? "文献笔记" : "永久笔记";
}

export function folderById(state, id) {
  return state.folders.find((f) => f.id === id) || null;
}

export function notesInFolder(state, folderId) {
  return state.notes.filter((n) => n.folderId === folderId);
}

export function childFolders(state, folderId) {
  return state.folders.filter((f) => f.parentId === folderId && !f.hidden);
}

export function joinFsPath(base, child) {
  const cleanBase = String(base || "").replace(/[\\/]+$/, "");
  const cleanChild = String(child || "").replace(/^[\\/]+/, "");
  if (!cleanBase) return cleanChild;
  if (!cleanChild) return cleanBase;
  return `${cleanBase}\\${cleanChild}`;
}
