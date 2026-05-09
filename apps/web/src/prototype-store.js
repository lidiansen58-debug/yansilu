export function createInitialState() {
  const VAULT_ROOT = "E:\\Projects\\Thinking in Notes\\yansilu-vault";

  return {
    module: "explorer",
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
        name: "原创卡片盒",
        parentId: null,
        isDefault: true,
        hidden: false,
        maxCards: 500,
        fsPath: `${VAULT_ROOT}\\notes\\original`
      },
      {
        id: "dir_original_method",
        name: "写作方法",
        parentId: "dir_original_default",
        isDefault: false,
        hidden: false,
        maxCards: 500,
        fsPath: `${VAULT_ROOT}\\notes\\original\\写作方法`
      }
    ],
    notes: [
      {
        id: "pn_001",
        title: "写作应从原创笔记中生长",
        folderId: "dir_original_default",
        noteType: "original",
        body: "核心观点：先有思想单元，再做结构化写作。\n\n#写作 #原创笔记",
        tags: ["写作", "原创笔记"],
        links: [],
        updatedAt: new Date().toISOString()
      },
      {
        id: "pn_002",
        title: "主题索引是写作入口",
        folderId: "dir_original_method",
        noteType: "original",
        body: "索引不是标签集合，而是路径入口。\n\n[[写作应从原创笔记中生长]] #索引",
        tags: ["索引"],
        links: ["写作应从原创笔记中生长"],
        updatedAt: new Date().toISOString()
      }
    ],
    tabs: [],
    activeTabId: null,
    searchQuery: "",
    searchVisible: false,
    inspectorVisible: false,
    previewMode: "source",
    focusMode: false
    };
  }

export function uid(prefix) {
  return `${prefix}_${Date.now().toString().slice(-6)}_${Math.floor(Math.random() * 99)}`;
}

export function parseTags(text) {
  return [...new Set((text.match(/#([\u4e00-\u9fa5\w-]+)/g) || []).map((x) => x.slice(1)))];
}

export function parseLinks(text) {
  return [...new Set((text.match(/\[\[([^[\]]+)\]\]/g) || []).map((x) => x.slice(2, -2)))];
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
  return "original";
}

export function typeLabel(type) {
  return type === "fleeting" ? "随笔笔记" : type === "literature" ? "文献笔记" : "原创笔记";
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
