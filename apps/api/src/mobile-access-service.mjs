import {
  assertMobileTokenAllowed,
  buildDesktopMobileAccessStatus,
  confirmPairRequest,
  createPairRequest,
  getPairRequestStatus,
  revokeMobileDevice,
  rotatePairingSession
} from "./mobile-pairing-service.mjs";

const DEFAULT_PERMANENT_DIRECTORY_ID = "dir_original_default";
const DEFAULT_FLEETING_DIRECTORY_ID = "dir_fleeting_default";
const QUICK_NOTE_MAX_IMAGE_COUNT = 4;
const QUICK_NOTE_MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function cleanText(value = "") {
  return String(value || "").trim();
}

function clampLimit(value, fallback = 20, max = 50) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.max(1, Math.min(max, Math.floor(parsed)));
}

function firstBodyLine(value = "") {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .find(Boolean) || "";
}

export function readMobileAccessTokenFromRequest(req) {
  const headerToken = req?.headers?.["x-yansilu-mobile-token"];
  return cleanText(Array.isArray(headerToken) ? headerToken[0] : headerToken);
}

function clientHintFromRequest(req) {
  const remote = cleanText(req?.socket?.remoteAddress || "");
  const userAgent = cleanText(req?.headers?.["user-agent"] || "");
  return [remote, userAgent].filter(Boolean).join(" · ").slice(0, 180);
}

async function assertMobileAccessAllowed(vaultPath, req) {
  return assertMobileTokenAllowed(vaultPath, readMobileAccessTokenFromRequest(req));
}

function publicNote(item = {}) {
  return {
    id: item.id,
    noteType: item.noteType,
    title: item.title || item.id,
    status: item.status || "",
    directoryId: item.directoryId || "",
    updatedAt: item.updatedAt || item.updated_at || "",
    createdAt: item.createdAt || item.created_at || "",
    markdownPath: item.markdownPath || ""
  };
}

function publicTheme(item = {}) {
  return {
    id: item.id,
    title: item.title || "未命名主题",
    summary: item.summary || item.thesis || "",
    centralQuestion: item.central_question || item.centralQuestion || "",
    noteCount: Number(item.note_count ?? item.noteCount ?? 0),
    updatedAt: item.updated_at || item.updatedAt || "",
    keyNotes: Array.isArray(item.items)
      ? item.items.slice(0, 5).map((entry) => ({
          noteId: entry.note_id || entry.noteId,
          title: entry.note_title || entry.title || entry.short_label || entry.note_id || "",
          rationale: entry.rationale || ""
        }))
      : []
  };
}

function makeQuickNoteTitle(input = {}, now = new Date()) {
  const explicit = cleanText(input.title);
  if (explicit) return explicit.slice(0, 80);
  const fromBody = firstBodyLine(input.body || input.content || input.excerpt);
  if (fromBody) return fromBody.slice(0, 80);
  return `手机随笔 ${now.toLocaleString("zh-CN", { hour12: false })}`;
}

function makeQuickNoteBody(input = {}, title = "") {
  const body = cleanText(input.body || input.content);
  const excerpt = cleanText(input.excerpt);
  const sourceUrl = cleanText(input.sourceUrl || input.source_url);
  const safeTitle = cleanText(title) || "手机随笔";
  const sections = [`# ${safeTitle}`, ""];
  if (body) sections.push(body);
  if (excerpt) sections.push("", "## 摘录", excerpt);
  if (sourceUrl) sections.push("", `来源：${sourceUrl}`);
  if (!body && !excerpt && !sourceUrl) sections.push("从手机快速记录，稍后在电脑端整理。");
  return sections.join("\n");
}

function normalizeQuickNoteImages(input = {}) {
  const images = Array.isArray(input.images) ? input.images : [];
  return images.slice(0, QUICK_NOTE_MAX_IMAGE_COUNT).map((image, index) => {
    const mimeType = cleanText(image.mimeType || image.type).toLowerCase();
    if (!mimeType.startsWith("image/")) {
      const error = new Error("手机端快速记录只支持从相册或拍照添加图片。");
      error.code = "MOBILE_QUICK_IMAGE_TYPE_UNSUPPORTED";
      throw error;
    }
    const contentBase64 = cleanText(image.contentBase64 || image.base64).replace(/^data:image\/[a-z0-9.+-]+;base64,/i, "");
    if (!contentBase64) {
      const error = new Error("图片内容为空，请重新选择或拍照。");
      error.code = "MOBILE_QUICK_IMAGE_EMPTY";
      throw error;
    }
    const approxBytes = Math.floor((contentBase64.length * 3) / 4);
    if (approxBytes > QUICK_NOTE_MAX_IMAGE_BYTES) {
      const error = new Error("单张图片过大，请选择 8MB 以内的图片。");
      error.code = "MOBILE_QUICK_IMAGE_TOO_LARGE";
      throw error;
    }
    return {
      kind: "image",
      fileName: cleanText(image.fileName || image.name) || `mobile-photo-${index + 1}.jpg`,
      mimeType,
      contentBase64
    };
  });
}

function appendImageLinksToBody(body = "", assets = []) {
  if (!assets.length) return body;
  const links = assets.map((asset, index) => {
    const alt = markdownImageAltText(asset.fileName || `手机图片 ${index + 1}`);
    return `![${alt}](${asset.markdownLinkPath})`;
  });
  return [body, "", "## 手机图片", ...links].join("\n");
}

function markdownImageAltText(value = "") {
  return cleanText(value)
    .replace(/[\r\n]+/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\]/g, "\\]")
    .replace(/\[/g, "\\[")
    .slice(0, 80) || "手机图片";
}

export async function buildMobileOverview(vaultPath, deps = {}) {
  const {
    initVault,
    listNotesInDirectory,
    listIndexCards,
    listDirectories
  } = deps;
  await initVault(vaultPath);
  const [directories, permanentNotes, fleetingNotes, themes] = await Promise.all([
    listDirectories(vaultPath, { includeHidden: false }),
    listNotesInDirectory(vaultPath, DEFAULT_PERMANENT_DIRECTORY_ID),
    listNotesInDirectory(vaultPath, DEFAULT_FLEETING_DIRECTORY_ID),
    listIndexCards(vaultPath, { limit: 12 })
  ]);

  const recentPermanentNotes = permanentNotes.slice(0, 8).map(publicNote);
  const recentFleetingNotes = fleetingNotes.slice(0, 8).map(publicNote);
  const themeItems = themes.slice(0, 8).map(publicTheme);
  return {
    status: "ready",
    mode: "mobile-capture-and-reading",
    directories: directories.map((directory) => ({
      id: directory.id,
      title: directory.title,
      type: directory.directoryType || directory.directory_type || ""
    })),
    counts: {
      permanentNotes: permanentNotes.length,
      fleetingNotes: fleetingNotes.length,
      themes: themes.length
    },
    today: {
      title: "今日待整理",
      actions: [
        "快速记录一个想法",
        "回看最近的永久笔记",
        "给一个写作主题补充素材"
      ],
      recentPermanentNotes,
      recentFleetingNotes
    },
    themes: themeItems
  };
}

export async function listMobileFleetingNotes(vaultPath, input = {}, deps = {}) {
  const { initVault, listNotesInDirectory } = deps;
  await initVault(vaultPath);
  const limit = clampLimit(input.limit, 20, 50);
  const items = await listNotesInDirectory(vaultPath, DEFAULT_FLEETING_DIRECTORY_ID);
  return {
    items: items.slice(0, limit).map(publicNote),
    total: items.length
  };
}

export async function listMobilePermanentNotes(vaultPath, input = {}, deps = {}) {
  const { initVault, listNotesInDirectory, searchNotes } = deps;
  await initVault(vaultPath);
  const limit = clampLimit(input.limit, 30, 80);
  const query = cleanText(input.query || input.q);
  if (query) {
    const result = await searchNotes(vaultPath, {
      query,
      rootDirectoryId: DEFAULT_PERMANENT_DIRECTORY_ID,
      limit
    });
    return {
      query,
      items: result.items.map(publicNote),
      total: result.total
    };
  }
  const items = await listNotesInDirectory(vaultPath, DEFAULT_PERMANENT_DIRECTORY_ID);
  return {
    query: "",
    items: items.slice(0, limit).map(publicNote),
    total: items.length
  };
}

export async function listMobileThemes(vaultPath, input = {}, deps = {}) {
  const { initVault, listIndexCards } = deps;
  await initVault(vaultPath);
  const limit = clampLimit(input.limit, 20, 50);
  const items = await listIndexCards(vaultPath, { limit });
  return {
    items: items.map(publicTheme),
    total: items.length
  };
}

export async function getMobileNote(vaultPath, noteId, deps = {}) {
  const { initVault, getNoteById } = deps;
  await initVault(vaultPath);
  const item = await getNoteById(vaultPath, noteId);
  if (item.noteType !== "permanent") {
    const error = new Error("手机端永久笔记详情只开放永久笔记。随笔请回电脑端今日整理继续加工。");
    error.code = "MOBILE_NOTE_SCOPE_UNSUPPORTED";
    error.status = 403;
    throw error;
  }
  return {
    ...publicNote(item),
    body: item.body || "",
    thesis: item.thesis || "",
    threeLineSummary: Array.isArray(item.threeLineSummary) ? item.threeLineSummary : []
  };
}

export async function createMobileQuickNote(vaultPath, input = {}, deps = {}) {
  const { initVault, createNoteInDirectory, saveNoteAsset, updateNoteContent } = deps;
  await initVault(vaultPath);
  const title = makeQuickNoteTitle(input);
  const body = makeQuickNoteBody(input, title);
  const images = normalizeQuickNoteImages(input);
  const item = await createNoteInDirectory(vaultPath, {
    directoryId: DEFAULT_FLEETING_DIRECTORY_ID,
    title,
    body,
    status: "draft"
  });
  if (!images.length) return publicNote(item);
  if (typeof saveNoteAsset !== "function" || typeof updateNoteContent !== "function") {
    const error = new Error("当前电脑端暂不支持保存手机图片。");
    error.code = "MOBILE_QUICK_IMAGE_SAVE_UNAVAILABLE";
    throw error;
  }
  const assets = [];
  for (const image of images) {
    assets.push(await saveNoteAsset(vaultPath, item.id, image));
  }
  const nextBody = appendImageLinksToBody(body, assets);
  const updated = await updateNoteContent(vaultPath, item.id, {
    title,
    body: nextBody,
    status: "draft"
  });
  return {
    ...publicNote(updated || item),
    assets
  };
}

function pairRequestIdFromPath(pathname = "") {
  const match = String(pathname || "").match(/^\/api\/v1\/mobile\/pair-requests\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : "";
}

function desktopPairRequestIdFromPath(pathname = "") {
  const match = String(pathname || "").match(/^\/api\/v1\/mobile\/desktop\/pair-requests\/([^/]+)\/confirm$/);
  return match ? decodeURIComponent(match[1]) : "";
}

function desktopDeviceIdFromPath(pathname = "") {
  const match = String(pathname || "").match(/^\/api\/v1\/mobile\/desktop\/devices\/([^/]+)\/revoke$/);
  return match ? decodeURIComponent(match[1]) : "";
}

export async function handleMobileApiRequest({
  req,
  res,
  url,
  sendJson,
  readJson,
  err,
  requestId,
  vaultPath,
  deps,
  assertDesktopControlAllowed = () => {}
}) {
  try {
    if (req.method === "GET" && url.pathname === "/api/v1/mobile/desktop/status") {
      assertDesktopControlAllowed(req);
      await deps.initVault(vaultPath);
      const item = await buildDesktopMobileAccessStatus(vaultPath);
      return sendJson(res, 200, { item, requestId, timestamp: new Date().toISOString() });
    }

    if (req.method === "POST" && url.pathname === "/api/v1/mobile/desktop/pairing-code/rotate") {
      assertDesktopControlAllowed(req);
      await deps.initVault(vaultPath);
      const item = rotatePairingSession(vaultPath);
      return sendJson(res, 200, { item, requestId, timestamp: new Date().toISOString() });
    }

    const confirmRequestId = desktopPairRequestIdFromPath(url.pathname);
    if (req.method === "POST" && confirmRequestId) {
      assertDesktopControlAllowed(req);
      await deps.initVault(vaultPath);
      const item = await confirmPairRequest(vaultPath, confirmRequestId);
      return sendJson(res, 200, { item, requestId, timestamp: new Date().toISOString() });
    }

    const revokeDeviceId = desktopDeviceIdFromPath(url.pathname);
    if (req.method === "POST" && revokeDeviceId) {
      assertDesktopControlAllowed(req);
      await deps.initVault(vaultPath);
      const item = await revokeMobileDevice(vaultPath, revokeDeviceId);
      return sendJson(res, 200, { item, requestId, timestamp: new Date().toISOString() });
    }

    if (req.method === "POST" && url.pathname === "/api/v1/mobile/pair-requests") {
      await deps.initVault(vaultPath);
      const body = await readJson(req);
      const item = await createPairRequest(vaultPath, body, {
        clientAddress: cleanText(req?.socket?.remoteAddress || ""),
        clientHint: clientHintFromRequest(req)
      });
      return sendJson(res, 201, { item, requestId, timestamp: new Date().toISOString() });
    }

    const pairRequestId = pairRequestIdFromPath(url.pathname);
    if (req.method === "GET" && pairRequestId) {
      await deps.initVault(vaultPath);
      const item = getPairRequestStatus(vaultPath, pairRequestId, url.searchParams.get("requestSecret") || "");
      return sendJson(res, 200, { item, requestId, timestamp: new Date().toISOString() });
    }

    await assertMobileAccessAllowed(vaultPath, req);

    if (req.method === "GET" && url.pathname === "/api/v1/mobile/overview") {
      const item = await buildMobileOverview(vaultPath, deps);
      return sendJson(res, 200, { item, requestId, timestamp: new Date().toISOString() });
    }

    if (req.method === "GET" && url.pathname === "/api/v1/mobile/today") {
      const item = await listMobileFleetingNotes(vaultPath, { limit: url.searchParams.get("limit") || "" }, deps);
      return sendJson(res, 200, { ...item, requestId, timestamp: new Date().toISOString() });
    }

    if (req.method === "GET" && url.pathname === "/api/v1/mobile/notes") {
      const item = await listMobilePermanentNotes(
        vaultPath,
        { query: url.searchParams.get("q") || "", limit: url.searchParams.get("limit") || "" },
        deps
      );
      return sendJson(res, 200, { ...item, requestId, timestamp: new Date().toISOString() });
    }

    const noteMatch = url.pathname.match(/^\/api\/v1\/mobile\/notes\/([^/]+)$/);
    if (req.method === "GET" && noteMatch) {
      const item = await getMobileNote(vaultPath, decodeURIComponent(noteMatch[1]), deps);
      return sendJson(res, 200, { item, requestId, timestamp: new Date().toISOString() });
    }

    if (req.method === "GET" && url.pathname === "/api/v1/mobile/themes") {
      const item = await listMobileThemes(vaultPath, { limit: url.searchParams.get("limit") || "" }, deps);
      return sendJson(res, 200, { ...item, requestId, timestamp: new Date().toISOString() });
    }

    if (req.method === "POST" && url.pathname === "/api/v1/mobile/quick-notes") {
      const body = await readJson(req);
      const item = await createMobileQuickNote(vaultPath, body, deps);
      return sendJson(res, 201, { item, requestId, timestamp: new Date().toISOString() });
    }

    return sendJson(res, 404, err("MOBILE_ROUTE_NOT_FOUND", "Mobile route not found.", requestId));
  } catch (error) {
    if (String(error?.code || "").startsWith("LOCAL_RUNTIME_CONTROL_")) {
      console.warn(`Mobile desktop control rejected: ${JSON.stringify({
        code: error.code,
        details: error.details || {},
        requestId
      })}`);
    }
    const status = Number(error?.status || 400);
    return sendJson(res, status, err(error?.code || "MOBILE_ACCESS_ERROR", String(error?.message || error), requestId, error?.details));
  }
}
