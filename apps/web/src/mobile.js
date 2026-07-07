const API_BASE = window.__MOBILE_API_BASE__ || "/mobile/api";
const TOKEN_KEY = "yansilu.mobileAccessToken";
const DEVICE_NAME_KEY = "yansilu.mobileDeviceName";
const QUICK_IMAGE_LIMIT = 4;
const QUICK_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

const query = new URLSearchParams(window.location.search);

const state = {
  view: "home",
  token: localStorage.getItem(TOKEN_KEY) || "",
  deviceName: localStorage.getItem(DEVICE_NAME_KEY) || defaultDeviceName(),
  pairCode: query.get("pairCode") || query.get("code") || "",
  pairRequestId: "",
  pairRequestSecret: "",
  pairStatus: "",
  pairMessage: "",
  pairPolling: null,
  overview: null,
  todayNotes: [],
  notes: [],
  themes: [],
  selectedNote: null,
  quickContext: null,
  message: ""
};

const app = document.querySelector("#app");
const lockButton = document.querySelector("#lockButton");
const tabs = [...document.querySelectorAll(".tab")];

function defaultDeviceName() {
  const ua = navigator.userAgent || "";
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/Android/i.test(ua)) return "Android 手机";
  return "手机浏览器";
}

function escapeHtml(value = "") {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value = "") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (state.token) headers["X-Yansilu-Mobile-Token"] = state.token;
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error?.message || "请求失败");
    error.code = data?.error?.code || "REQUEST_FAILED";
    error.status = response.status;
    throw error;
  }
  return data;
}

function stopPairPolling() {
  if (state.pairPolling) window.clearInterval(state.pairPolling);
  state.pairPolling = null;
}

function setView(view) {
  state.view = view;
  state.selectedNote = null;
  tabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.view === view));
  render();
}

function renderConnectGate(error = null) {
  stopPairPolling();
  const hasPairCode = Boolean(state.pairCode);
  app.innerHTML = `
    <section class="panel hero-panel">
      <p class="eyebrow">连接电脑</p>
      <h2>${hasPairCode ? "请求连接" : "扫码后开始记录"}</h2>
      <p class="muted">${hasPairCode ? "发起后，在电脑端点“允许连接”。" : "在电脑端打开“手机访问”，用手机扫码。"}</p>
      ${error ? `<div class="inline-error">${escapeHtml(error.message || error)}</div>` : ""}
      ${hasPairCode ? `
        <form class="quick-form" id="pairForm">
          <label for="deviceName">这台手机的名称</label>
          <input id="deviceName" type="text" autocomplete="nickname" value="${escapeHtml(state.deviceName)}" />
          <button class="primary-button" type="submit">请求连接电脑</button>
        </form>
      ` : `
        <div class="empty">手机只连接正在运行的电脑端。</div>
      `}
    </section>
  `;
}

function renderPairWaiting() {
  app.innerHTML = `
    <section class="panel hero-panel">
      <p class="eyebrow">等待电脑确认</p>
      <h2>请在电脑端点“允许连接”</h2>
      <p class="muted">确认后手机会自动进入首页。如果配对码过期，请在电脑端刷新二维码后重试。</p>
      <div class="pair-waiting">
        <span class="pulse-dot" aria-hidden="true"></span>
        <strong>${escapeHtml(state.pairMessage || "正在等待确认...")}</strong>
      </div>
      <button class="secondary-button" type="button" data-cancel-pair>重新扫码</button>
    </section>
  `;
}

function renderHome() {
  const overview = state.overview;
  if (!overview) {
    app.innerHTML = `<section class="panel"><h2>正在读取</h2><p class="muted">正在连接电脑上的研思录。</p></section>`;
    return;
  }
  app.innerHTML = `
    <section class="panel mobile-capture-card">
      <p class="eyebrow">现在就记</p>
      <h2>把刚想到的东西先放进电脑</h2>
      <button class="primary-button full capture-button" type="button" data-go="quick">快速记录</button>
      <div class="mobile-home-actions">
        <button class="secondary-button" type="button" data-go="today">待整理</button>
        <button class="secondary-button" type="button" data-go="notes">看笔记</button>
        <button class="secondary-button" type="button" data-go="themes">看素材</button>
      </div>
      <div class="stat-row">
        <div class="stat"><strong>${overview.counts?.fleetingNotes || 0}</strong><span>待整理</span></div>
        <div class="stat"><strong>${overview.counts?.permanentNotes || 0}</strong><span>永久笔记</span></div>
        <div class="stat"><strong>${overview.counts?.themes || 0}</strong><span>主题</span></div>
      </div>
    </section>
    <section class="mobile-section">
      <div class="section-head">
        <h2 class="section-title">刚保存</h2>
        <button class="text-button" type="button" data-go="today">查看全部</button>
      </div>
      <div class="card-list">
        ${(overview.today?.recentFleetingNotes || []).slice(0, 4).map(compactNoteCard).join("") || `<div class="empty">还没有手机随笔。先点“快速记录”保存一个想法。</div>`}
      </div>
    </section>
    <section class="mobile-section">
      <div class="section-head">
        <h2 class="section-title">写作素材</h2>
        <button class="text-button" type="button" data-go="themes">查看全部</button>
      </div>
      <div class="card-list">
        ${(overview.themes || []).slice(0, 3).map(themeCard).join("") || `<div class="empty">还没有主题索引。回电脑端整理几条永久笔记后，这里会显示写作素材。</div>`}
      </div>
    </section>
  `;
}

function compactNoteCard(note) {
  return `
    <article class="note-card is-readonly">
      <h3>${escapeHtml(note.title)}</h3>
      <div class="meta">${escapeHtml(formatDate(note.updatedAt))}</div>
    </article>
  `;
}

function noteCard(note) {
  return `
    <button class="note-card" type="button" data-note-id="${escapeHtml(note.id)}">
      <h3>${escapeHtml(note.title)}</h3>
      <div class="meta">${escapeHtml(note.noteType || "note")} · ${escapeHtml(formatDate(note.updatedAt))}</div>
    </button>
  `;
}

function themeCard(theme) {
  return `
    <article class="theme-card">
      <h3>${escapeHtml(theme.title)}</h3>
      <p class="muted">${escapeHtml(theme.centralQuestion || theme.summary || "围绕这个主题继续积累写作素材。")}</p>
      <div class="theme-card-foot">
        <span class="meta">${theme.noteCount || 0} 条关键笔记</span>
        <button class="ghost-button" type="button" data-theme-capture="${escapeHtml(theme.title)}">补充素材</button>
      </div>
    </article>
  `;
}

function renderToday() {
  app.innerHTML = `
    <section class="panel">
      <p class="eyebrow">今日待整理</p>
      <h2>这些回电脑继续加工</h2>
      <button class="primary-button full" type="button" data-go="quick">再记录一条</button>
    </section>
    <div class="card-list">${state.todayNotes.map(compactNoteCard).join("") || `<div class="empty">还没有待整理随笔。</div>`}</div>
  `;
}

function renderNotes() {
  app.innerHTML = `
    <section class="panel">
      <p class="eyebrow">永久笔记</p>
      <h2>查一条已经沉淀的想法</h2>
      <form class="search-row" id="searchForm">
        <label class="sr-only" for="searchInput">搜索永久笔记</label>
        <input id="searchInput" type="search" placeholder="搜索标题或路径" />
        <button class="secondary-button" type="submit">搜索</button>
      </form>
    </section>
    <div class="card-list">${state.notes.map(noteCard).join("") || `<div class="empty">没有找到永久笔记。</div>`}</div>
  `;
}

function renderThemes() {
  app.innerHTML = `
    <section class="panel">
      <p class="eyebrow">写作素材</p>
      <h2>给主题补素材</h2>
    </section>
    <div class="card-list">${state.themes.map(themeCard).join("") || `<div class="empty">还没有主题索引。</div>`}</div>
  `;
}

function renderQuick() {
  const contextTitle = state.quickContext?.themeTitle || "";
  app.innerHTML = `
    <section class="panel quick-panel">
      <p class="eyebrow">快速记录</p>
      <h2>${contextTitle ? `补充素材` : "先写下来"}</h2>
      <form class="quick-form" id="quickForm">
        <label for="quickBody">正文</label>
        <textarea id="quickBody" class="quick-main-textarea" placeholder="写一句想法、课堂内容、摘录或灵感"></textarea>
        <details class="mobile-details">
          <summary>标题和摘录</summary>
          <label for="quickTitle">标题</label>
          <input id="quickTitle" type="text" placeholder="可不填，系统会取正文第一行" value="${contextTitle ? escapeHtml(`${contextTitle}：`) : ""}" />
          <label for="quickExcerpt">摘录</label>
          <textarea id="quickExcerpt" class="compact-textarea" placeholder="可选：粘贴原文片段"></textarea>
        </details>
        <div class="quick-image-picker">
          <span class="quick-image-title">图片</span>
          <div class="quick-image-actions">
            <label class="secondary-button file-button" for="quickImagesAlbum">从相册选择</label>
            <input id="quickImagesAlbum" type="file" accept="image/*" multiple />
            <label class="secondary-button file-button" for="quickImagesCamera">拍照</label>
            <input id="quickImagesCamera" type="file" accept="image/*" capture="environment" />
          </div>
          <div class="quick-image-summary" id="quickImageSummary">最多添加 4 张图片。</div>
        </div>
        <button class="primary-button full" type="submit">保存到电脑</button>
      </form>
      ${state.message ? `<p class="success-text">${escapeHtml(state.message)}</p>` : ""}
    </section>
  `;
}

function renderNoteDetail() {
  const note = state.selectedNote;
  app.innerHTML = `
    <section class="panel">
      <button class="ghost-button" type="button" data-back="notes">返回列表</button>
      <h2>${escapeHtml(note.title)}</h2>
      <div class="meta">${escapeHtml(note.noteType || "note")} · ${escapeHtml(formatDate(note.updatedAt))}</div>
      ${note.thesis ? `<p class="note-thesis">${escapeHtml(note.thesis)}</p>` : ""}
      <div class="note-body">${escapeHtml(note.body || "没有正文。")}</div>
    </section>
  `;
}

function renderError(error) {
  if (error?.status === 401 || error?.status === 503) {
    localStorage.removeItem(TOKEN_KEY);
    state.token = "";
    renderConnectGate(error);
    return;
  }
  app.innerHTML = `
    <section class="panel">
      <p class="eyebrow">连接失败</p>
      <h2>手机暂时连不上电脑</h2>
      <p class="muted">${escapeHtml(error?.message || "请确认电脑端服务正在运行，并且手机和电脑在同一网络或私网隧道里。")}</p>
      <button class="primary-button" type="button" data-retry>重试</button>
    </section>
  `;
}

function render() {
  if (!state.token) {
    if (state.pairStatus === "pending") renderPairWaiting();
    else renderConnectGate();
    return;
  }
  if (state.selectedNote) {
    renderNoteDetail();
    return;
  }
  if (state.view === "today") renderToday();
  else if (state.view === "notes") renderNotes();
  else if (state.view === "themes") renderThemes();
  else if (state.view === "quick") renderQuick();
  else renderHome();
}

async function loadHome() {
  try {
    stopPairPolling();
    state.overview = (await api("/overview")).item;
    state.todayNotes = state.overview.today?.recentFleetingNotes || [];
    state.notes = state.overview.today?.recentPermanentNotes || [];
    state.themes = state.overview.themes || [];
    state.selectedNote = null;
    state.message = "";
    setView("home");
  } catch (error) {
    renderError(error);
  }
}

async function loadToday() {
  try {
    const result = await api("/today");
    state.todayNotes = result.items || [];
    setView("today");
  } catch (error) {
    renderError(error);
  }
}

async function loadNotes(query = "") {
  try {
    const params = query ? `?q=${encodeURIComponent(query)}` : "";
    const result = await api(`/notes${params}`);
    state.notes = result.items || [];
    setView("notes");
  } catch (error) {
    renderError(error);
  }
}

async function loadThemes() {
  try {
    const result = await api("/themes");
    state.themes = result.items || [];
    setView("themes");
  } catch (error) {
    renderError(error);
  }
}

async function loadNoteDetail(noteId) {
  try {
    state.selectedNote = (await api(`/notes/${encodeURIComponent(noteId)}`)).item;
    render();
  } catch (error) {
    renderError(error);
  }
}

async function saveQuickNote() {
  const title = document.querySelector("#quickTitle").value.trim();
  const body = document.querySelector("#quickBody").value.trim();
  const excerpt = document.querySelector("#quickExcerpt").value.trim();
  try {
    const images = await readQuickImages();
    if (!title && !body && !excerpt && !images.length) {
      state.message = "先写一点内容，或从相册/拍照添加图片，再保存。";
      renderQuick();
      return;
    }
    await api("/quick-notes", {
      method: "POST",
      body: JSON.stringify({ title, body, excerpt, images })
    });
    state.message = "已保存到电脑。回到电脑端的首页继续加工。";
    state.quickContext = null;
    state.overview = (await api("/overview")).item;
    state.todayNotes = state.overview.today?.recentFleetingNotes || [];
    renderQuick();
  } catch (error) {
    renderError(error);
  }
}

function quickImageFiles() {
  const albumFiles = [...(document.querySelector("#quickImagesAlbum")?.files || [])];
  const cameraFiles = [...(document.querySelector("#quickImagesCamera")?.files || [])];
  return [...albumFiles, ...cameraFiles].slice(0, QUICK_IMAGE_LIMIT);
}

function updateQuickImageSummary() {
  const summary = document.querySelector("#quickImageSummary");
  if (!summary) return;
  const files = quickImageFiles();
  if (!files.length) {
    summary.textContent = "最多添加 4 张图片。";
    return;
  }
  const totalMb = files.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024;
  summary.textContent = `已选择 ${files.length} 张图片，约 ${totalMb.toFixed(1)} MB。`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("图片读取失败。"));
    reader.readAsDataURL(file);
  });
}

async function readQuickImages() {
  const files = quickImageFiles();
  const images = [];
  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      throw new Error("只能从手机相册或拍照添加图片。");
    }
    if (file.size > QUICK_IMAGE_MAX_BYTES) {
      throw new Error("单张图片不能超过 8MB，请换一张较小的图片。");
    }
    const dataUrl = await readFileAsDataUrl(file);
    images.push({
      fileName: file.name || "mobile-photo.jpg",
      mimeType: file.type || "image/jpeg",
      contentBase64: dataUrl.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, "")
    });
  }
  return images;
}

async function submitPairRequest() {
  const deviceName = document.querySelector("#deviceName").value.trim() || defaultDeviceName();
  localStorage.setItem(DEVICE_NAME_KEY, deviceName);
  state.deviceName = deviceName;
  try {
    const result = await api("/pair-requests", {
      method: "POST",
      body: JSON.stringify({ pairCode: state.pairCode, deviceName })
    });
    state.pairRequestId = result.item?.request?.id || "";
    state.pairRequestSecret = result.item?.requestSecret || "";
    state.pairStatus = "pending";
    state.pairMessage = "请求已发送。";
    renderPairWaiting();
    startPairPolling();
  } catch (error) {
    renderConnectGate(error);
  }
}

function startPairPolling() {
  stopPairPolling();
  state.pairPolling = window.setInterval(checkPairRequest, 1800);
  checkPairRequest();
}

async function checkPairRequest() {
  if (!state.pairRequestId || !state.pairRequestSecret) return;
  try {
    const result = await api(`/pair-requests/${encodeURIComponent(state.pairRequestId)}?requestSecret=${encodeURIComponent(state.pairRequestSecret)}`);
    const request = result.item?.request || {};
    state.pairStatus = request.status || "pending";
    if (result.item?.token) {
      state.token = result.item.token;
      localStorage.setItem(TOKEN_KEY, state.token);
      stopPairPolling();
      await loadHome();
      return;
    }
    state.pairMessage = state.pairStatus === "expired" ? "配对请求已过期，请重新扫码。" : "正在等待电脑端确认...";
    renderPairWaiting();
  } catch (error) {
    state.pairMessage = error.message || "配对状态读取失败。";
    renderPairWaiting();
  }
}

document.addEventListener("click", async (event) => {
  const go = event.target.closest("[data-go]")?.dataset.go;
  if (go === "quick") {
    state.quickContext = null;
    setView("quick");
  }
  if (go === "today") await loadToday();
  if (go === "notes") await loadNotes();
  if (go === "themes") await loadThemes();

  const themeCapture = event.target.closest("[data-theme-capture]")?.dataset.themeCapture;
  if (themeCapture) {
    state.quickContext = { themeTitle: themeCapture };
    setView("quick");
  }

  const noteId = event.target.closest("[data-note-id]")?.dataset.noteId;
  if (noteId) await loadNoteDetail(noteId);

  if (event.target.closest("[data-back='notes']")) {
    state.selectedNote = null;
    setView("notes");
  }
  if (event.target.closest("[data-retry]")) await loadHome();
  if (event.target.closest("[data-cancel-pair]")) {
    stopPairPolling();
    state.pairStatus = "";
    state.pairMessage = "";
    renderConnectGate();
  }
});

document.addEventListener("submit", async (event) => {
  if (event.target.id === "pairForm") {
    event.preventDefault();
    await submitPairRequest();
  }
  if (event.target.id === "searchForm") {
    event.preventDefault();
    await loadNotes(document.querySelector("#searchInput").value.trim());
  }
  if (event.target.id === "quickForm") {
    event.preventDefault();
    await saveQuickNote();
  }
});

document.addEventListener("change", (event) => {
  if (event.target.id === "quickImagesAlbum" || event.target.id === "quickImagesCamera") {
    updateQuickImageSummary();
  }
});

  tabs.forEach((tab) => {
    tab.addEventListener("click", async () => {
      const view = tab.dataset.view;
      if (view === "today") await loadToday();
      else if (view === "notes") await loadNotes();
      else if (view === "themes") await loadThemes();
      else if (view === "home") await loadHome();
      else {
        state.quickContext = null;
        setView(view);
      }
    });
});

lockButton.addEventListener("click", () => {
  localStorage.removeItem(TOKEN_KEY);
  state.token = "";
  stopPairPolling();
  renderConnectGate();
});

if (state.token) loadHome();
else renderConnectGate();
