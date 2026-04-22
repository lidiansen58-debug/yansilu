import { parseLinks, parseTags, rootBoxIdFromFolder, typeFromFolder } from "./prototype-store.js";
import { checkOriginality } from "./prototype-api.js";

function titleFromBody(body) {
  const lines = String(body || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return "未命名笔记";
  return lines[0].replace(/^#+\s*/, "").slice(0, 60) || "未命名笔记";
}

function tokenAtCursor(text, cursor) {
  const startChars = [" ", "\n", "\t", "，", "。", ",", ":", "：", "(", ")", "[", "]"];
  let s = cursor;
  let e = cursor;
  while (s > 0 && !startChars.includes(text[s - 1])) s--;
  while (e < text.length && !startChars.includes(text[e])) e++;
  return text.slice(s, e).trim();
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

export class EditorPane {
  constructor({ state, elements, onStatus, onStateChange, onOpenNote }) {
    this.state = state;
    this.els = elements;
    this.onStatus = onStatus;
    this.onStateChange = onStateChange;
    this.onOpenNote = onOpenNote;
    this.currentLinkCandidates = [];
    this.currentLinkIndex = 0;
    this.currentLinkContext = null;
    this.bind();
  }

  activeTab() {
    return this.state.tabs.find((t) => t.id === this.state.activeTabId) || null;
  }

  activeNote() {
    const t = this.activeTab();
    if (!t) return null;
    return this.state.notes.find((n) => n.id === t.noteId) || null;
  }

  openNoteTab(noteId) {
    const n = this.state.notes.find((x) => x.id === noteId);
    if (!n) return;
    const tabId = `tab_${noteId}`;
    let t = this.state.tabs.find((x) => x.id === tabId);
    if (!t) {
      t = { id: tabId, noteId: n.id, title: n.title, body: n.body };
      this.state.tabs.push(t);
    }
    this.state.activeTabId = tabId;
    this.fillEditorFromTab();
  }

  closeTab(tabId) {
    const idx = this.state.tabs.findIndex((t) => t.id === tabId);
    if (idx < 0) return;
    this.state.tabs.splice(idx, 1);
    if (this.state.activeTabId === tabId) {
      this.state.activeTabId = this.state.tabs[idx]?.id || this.state.tabs[idx - 1]?.id || null;
    }
    this.fillEditorFromTab();
    this.onStateChange("switch-tab");
  }

  closeAllTabs() {
    this.state.tabs = [];
    this.state.activeTabId = null;
    this.fillEditorFromTab();
    this.onStateChange("switch-tab");
  }

  renderTabs() {
    const tabsHtml = this.state.tabs
      .map(
        (t) => `
      <div class="tab ${t.id === this.state.activeTabId ? "active" : ""}" data-tab="${t.id}" title="${t.title}">
        <span class="tab-title">${t.title}</span>
        <button class="tab-close" data-close-tab="${t.id}" aria-label="关闭">×</button>
      </div>
    `
      )
      .join("");

    const menuItems = this.state.tabs.length
      ? this.state.tabs
          .map(
            (t) =>
              `<button class="tab-menu-item ${t.id === this.state.activeTabId ? "active" : ""}" data-switch-tab="${t.id}">${t.title}${
                t.id === this.state.activeTabId ? " ✓" : ""
              }</button>`
          )
          .join("")
      : `<div class="tab-menu-empty">暂无打开标签页</div>`;

    this.els.tabs.innerHTML = `
      <div class="tabs-shell">
        <div class="tabs-list">${tabsHtml || `<div class="tab active" data-tab="welcome"><span class="tab-title">欢迎</span></div>`}</div>
        <div class="tabs-actions">
          <button class="tab-act" data-tabs-action="new" title="新建笔记">+</button>
          <button class="tab-act" data-tabs-action="new-window" title="新建编辑窗口">⧉</button>
          <button class="tab-act" data-tabs-action="toggle-menu" title="标签页菜单">▾</button>
        </div>
      </div>
      <div class="tab-menu hidden" data-tab-menu>
        <button class="tab-menu-item" data-tabs-action="close-all">全部关闭</button>
        <div class="tab-menu-sep"></div>
        ${menuItems}
      </div>
    `;
  }

  fillEditorFromTab() {
    const t = this.activeTab();
    if (!t) {
      this.els.body.value = "";
      this.els.result.innerHTML = "打开一个笔记后，这里显示与当前笔记关联的其他笔记。";
      return;
    }
    this.els.body.value = t.body || "";
    this.renderRelated();
  }

  updateActiveTabFromEditor() {
    const t = this.activeTab();
    if (!t) return null;
    t.body = this.els.body.value;
    t.title = titleFromBody(t.body);
    return t;
  }

  insertAtCursor(text) {
    const el = this.els.body;
    const s = el.selectionStart;
    const e = el.selectionEnd;
    el.setRangeText(text, s, e, "end");
    el.focus();
  }

  wrapSelection(prefix, suffix = "") {
    const el = this.els.body;
    const s = el.selectionStart;
    const e = el.selectionEnd;
    const sel = el.value.slice(s, e);
    el.setRangeText(`${prefix}${sel}${suffix}`, s, e, "end");
    el.focus();
  }

  scopedLinkCandidates() {
    const note = this.activeNote();
    if (!note) return [];
    const rootId = rootBoxIdFromFolder(this.state, note.folderId);
    return this.state.notes.filter(
      (n) => rootBoxIdFromFolder(this.state, n.folderId) === rootId && n.id !== note.id
    );
  }

  folderLabel(folderId) {
    const folder = this.state.folders.find((f) => f.id === folderId);
    if (!folder) return "未知目录";
    const names = [folder.name];
    let cursor = folder;
    while (cursor?.parentId) {
      cursor = this.state.folders.find((f) => f.id === cursor.parentId) || null;
      if (cursor) names.unshift(cursor.name);
    }
    return names.join(" / ");
  }

  resolveLinkToken(token, scopedNotes = this.scopedLinkCandidates()) {
    const raw = String(token || "").trim();
    if (!raw) return null;

    const byId = scopedNotes.find((n) => normalizeText(n.id) === normalizeText(raw));
    if (byId) return { note: byId, ambiguous: false, mode: "id" };

    const exactTitle = scopedNotes.filter((n) => normalizeText(n.title) === normalizeText(raw));
    if (exactTitle.length === 1) return { note: exactTitle[0], ambiguous: false, mode: "title" };
    if (exactTitle.length > 1) return { note: exactTitle[0], ambiguous: true, mode: "title" };

    const fuzzy = scopedNotes.find(
      (n) => normalizeText(n.title).includes(normalizeText(raw)) || normalizeText(n.id).includes(normalizeText(raw))
    );
    if (fuzzy) return { note: fuzzy, ambiguous: false, mode: "fuzzy" };
    return null;
  }

  detectInlineLinkContext() {
    const text = this.els.body.value;
    const cursor = this.els.body.selectionStart || 0;
    const left = text.slice(0, cursor);
    const start = left.lastIndexOf("[[");
    if (start < 0) return null;
    const lastClose = left.lastIndexOf("]]");
    if (lastClose > start) return null;
    const query = left.slice(start + 2);
    if (query.includes("\n")) return null;
    return { start, end: cursor, query };
  }

  renderLinkCandidates(query = "", preferredId = "") {
    const q = String(query || "").trim().toLowerCase();
    const all = this.scopedLinkCandidates();
    const list = q
      ? all.filter((n) => n.id.toLowerCase().includes(q) || n.title.toLowerCase().includes(q))
      : all;
    this.currentLinkCandidates = list;
    this.currentLinkIndex = 0;
    if (preferredId) {
      const idx = list.findIndex((n) => n.id === preferredId);
      if (idx >= 0) this.currentLinkIndex = idx;
    }
    this.els.linkSearchList.innerHTML = list.length
      ? list
          .slice(0, 50)
          .map(
            (n, idx) =>
              `<button class="link-picker-item ${idx === this.currentLinkIndex ? "active" : ""}" data-link-note-id="${n.id}"><strong>${n.title}</strong><br><small>${n.id} · ${this.folderLabel(
                n.folderId
              )}</small></button>`
          )
          .join("")
      : `<div style="padding:10px;color:#94a3b8;">无匹配笔记</div>`;
  }

  openLinkPicker(initialQuery = "", options = {}) {
    this.els.linkPicker.classList.remove("hidden");
    this.els.linkSearchInput.value = initialQuery;
    this.currentLinkContext = options.inlineContext || null;
    this.renderLinkCandidates(initialQuery, options.preferredId || "");
    if (options.keepFocusInEditor) {
      this.els.body.focus();
      return;
    }
    this.els.linkSearchInput.focus();
    this.els.linkSearchInput.select();
  }

  closeLinkPicker() {
    this.els.linkPicker.classList.add("hidden");
    this.currentLinkContext = null;
  }

  insertSelectedLinkNote(noteId) {
    if (!noteId) return;
    const target = this.state.notes.find((n) => n.id === noteId);
    if (!target) return;
    if (this.currentLinkContext) {
      const { start, end } = this.currentLinkContext;
      this.els.body.setRangeText(`[[${target.title}]]`, start, end, "end");
      this.els.body.focus();
    } else {
      this.insertAtCursor(`[[${target.title}]]`);
    }
    this.closeLinkPicker();
    this.onStatus(`已插入关联笔记：${target.title}`, "ok");
  }

  moveLinkCandidate(step) {
    if (!this.currentLinkCandidates.length) return;
    const max = Math.min(this.currentLinkCandidates.length, 50);
    this.currentLinkIndex = (this.currentLinkIndex + step + max) % max;
    const preferredId = this.currentLinkCandidates[this.currentLinkIndex]?.id || "";
    this.renderLinkCandidates(this.els.linkSearchInput.value, preferredId);
  }

  renderRelated(extraTitle = "") {
    const note = this.activeNote();
    const tab = this.activeTab();
    if (!note || !tab) {
      this.els.result.innerHTML = "打开一个笔记后，这里显示与当前笔记关联的其他笔记。";
      return;
    }

    const links = parseLinks(tab.body || "");
    const tags = parseTags(tab.body || "");
    const rootId = rootBoxIdFromFolder(this.state, note.folderId);
    const scoped = this.state.notes.filter((n) => rootBoxIdFromFolder(this.state, n.folderId) === rootId && n.id !== note.id);

    const resolvedForwardIds = new Set(
      links
        .map((token) => this.resolveLinkToken(token, scoped))
        .filter((x) => x?.note?.id)
        .map((x) => x.note.id)
    );

    const forward = scoped.filter((n) => resolvedForwardIds.has(n.id));
    const backward = scoped.filter((n) => {
      const refs = parseLinks(n.body || "");
      return refs.some((token) => this.resolveLinkToken(token, scoped)?.note?.id === note.id);
    });

    const tagRelated = tags.length
      ? scoped.filter((n) => (n.tags || []).some((tg) => tags.includes(tg))).slice(0, 20)
      : [];

    const block = (title, list) => `
      <div style="margin-bottom:10px;">
        <div style="font-weight:600;color:#334155;margin-bottom:4px;">${title}（${list.length}）</div>
        ${list.length ? list.map((n) => `<div class="related-item" data-open-note="${n.id}" style="padding:4px 0;cursor:pointer;color:#0f4f8a;">• ${n.title}</div>`).join("") : `<div style="color:#94a3b8;">无</div>`}
      </div>
    `;

    this.els.result.innerHTML = `
      ${extraTitle ? `<div style="margin-bottom:8px;color:#0f4f8a;font-weight:600;">${extraTitle}</div>` : ""}
      ${block("本笔记引用的笔记", forward)}
      ${block("引用到本笔记的笔记", backward)}
      ${block("同标签相关笔记", tagRelated)}
    `;
  }

  handleTokenAction(token) {
    if (!token) return;

    if (token.startsWith("#")) {
      const tag = token.slice(1);
      const note = this.activeNote();
      if (!note) return;
      const rootId = rootBoxIdFromFolder(this.state, note.folderId);
      const list = this.state.notes.filter(
        (n) => n.id !== note.id && rootBoxIdFromFolder(this.state, n.folderId) === rootId && (n.tags || []).includes(tag)
      );
      this.els.result.innerHTML = `
        <div style="margin-bottom:8px;color:#0f4f8a;font-weight:600;">标签 #${tag} 的笔记（${list.length}）</div>
        ${list.length ? list.map((n) => `<div class="related-item" data-open-note="${n.id}" style="padding:4px 0;cursor:pointer;color:#0f4f8a;">• ${n.title}</div>`).join("") : `<div style="color:#94a3b8;">无</div>`}
      `;
      this.onStatus(`已检索标签 #${tag}`, "ok");
      return;
    }

    const linkMatch = token.match(/^\[\[([^\]]+)\]\]$/);
    if (linkMatch) {
      const note = this.activeNote();
      if (!note) return;
      const tokenValue = linkMatch[1];
      const rootId = rootBoxIdFromFolder(this.state, note.folderId);
      const scoped = this.state.notes.filter(
        (n) => rootBoxIdFromFolder(this.state, n.folderId) === rootId && n.id !== note.id
      );
      const resolved = this.resolveLinkToken(tokenValue, scoped);
      if (resolved?.note) {
        this.onOpenNote(resolved.note.id);
        this.onStatus(
          resolved.ambiguous ? `已打开关联笔记：${resolved.note.title}（存在重名）` : `已打开关联笔记：${resolved.note.title}`,
          resolved.ambiguous ? "warn" : "ok"
        );
      } else {
        this.onStatus(`未找到关联笔记：${tokenValue}`, "warn");
      }
    }
  }

  extractCoreClaimFromBody(body) {
    const lines = String(body || "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.replace(/^#+\s*/, "").trim())
      .filter(Boolean);
    return lines.join(" ").slice(0, 4000);
  }

  resolvePlanFromWindow() {
    const raw = typeof window !== "undefined" ? window.__ORIGINALITY_PLAN__ : null;
    if (!raw || typeof raw !== "object") return {};
    return {
      warnThreshold: Number(raw.warnThreshold),
      blockThreshold: Number(raw.blockThreshold),
      requireCitationLocator: raw.requireCitationLocator,
      allowDraftOnWarning: raw.allowDraftOnWarning,
      blockOnBlocked: raw.blockOnBlocked
    };
  }

  buildOriginalityPayload(note) {
    const currentBody = this.els.body.value || note.body || "";
    const links = parseLinks(currentBody);
    const scoped = this.scopedLinkCandidates();
    const linkedLiterature = links
      .map((token) => this.resolveLinkToken(token, scoped))
      .map((x) => x?.note)
      .filter((x) => x && x.noteType === "literature");

    const dedupLiterature = [];
    const seen = new Set();
    for (const ln of linkedLiterature) {
      if (seen.has(ln.id)) continue;
      seen.add(ln.id);
      dedupLiterature.push(ln);
    }

    const literature = dedupLiterature.map((ln) => ({
      source_id: `src_from_${ln.id}`,
      quote_text: String(ln.body || "").trim()
    }));

    const citations = dedupLiterature.map((ln) => ({
      source_id: `src_from_${ln.id}`
    }));

    return {
      originalityPlan: this.resolvePlanFromWindow(),
      literature,
      permanent: [
        {
          id: note.id,
          core_claim: this.extractCoreClaimFromBody(currentBody),
          citations
        }
      ]
    };
  }

  async runOriginalityCheck(note, { forSave = false } = {}) {
    const payload = this.buildOriginalityPayload(note);
    const result = await checkOriginality(payload);
    const evalItem = result?.originalityGuard?.evaluations?.[0] || null;
    if (!evalItem) {
      return {
        status: "warning",
        similarity: 0,
        reasons: ["missing_evaluation"],
        raw: result
      };
    }

    if (evalItem.status === "blocked") {
      this.onStatus(
        `blocked：原创性检查未通过（相似度 ${Math.round((Number(evalItem.similarity) || 0) * 100)}%）`,
        "bad"
      );
      return { ...evalItem, raw: result };
    }

    if (evalItem.status === "warning") {
      const base = `warning：建议补充转述/引用定位（相似度 ${Math.round((Number(evalItem.similarity) || 0) * 100)}%）`;
      this.onStatus(forSave ? `${base}，将按 draft 保存` : base, "warn");
      return { ...evalItem, raw: result };
    }

    this.onStatus(`pass：原创性检测通过（相似度 ${Math.round((Number(evalItem.similarity) || 0) * 100)}%）`, "ok");
    return { ...evalItem, raw: result };
  }
  bind() {
    this.els.tabs.addEventListener("click", (e) => {
      const closeBtn = e.target.closest("button[data-close-tab]");
      if (closeBtn) {
        this.closeTab(closeBtn.dataset.closeTab);
        this.onStatus("已关闭标签页", "ok");
        return;
      }

      const switchBtn = e.target.closest("button[data-switch-tab]");
      if (switchBtn) {
        this.state.activeTabId = switchBtn.dataset.switchTab;
        this.fillEditorFromTab();
        this.onStateChange("switch-tab");
        const menu = this.els.tabs.querySelector("[data-tab-menu]");
        if (menu) menu.classList.add("hidden");
        return;
      }

      const actBtn = e.target.closest("button[data-tabs-action]");
      if (actBtn) {
        const action = actBtn.dataset.tabsAction;
        if (action === "new") {
          this.onStateChange("create-note-in-selected-folder");
          return;
        }
        if (action === "new-window") {
          const t = this.activeTab();
          const noteId = t?.noteId;
          const url = noteId
            ? `${window.location.origin}${window.location.pathname}?note=${encodeURIComponent(noteId)}`
            : `${window.location.origin}${window.location.pathname}`;
          window.open(url, "_blank", "noopener,noreferrer");
          this.onStatus("已打开独立编辑窗口", "ok");
          return;
        }
        if (action === "toggle-menu") {
          const menu = this.els.tabs.querySelector("[data-tab-menu]");
          if (menu) menu.classList.toggle("hidden");
          return;
        }
        if (action === "close-all") {
          this.closeAllTabs();
          this.onStatus("已关闭全部标签页", "ok");
          return;
        }
      }

      const tab = e.target.closest(".tab[data-tab]");
      if (!tab) return;
      if (tab.dataset.tab === "welcome") return;
      this.state.activeTabId = tab.dataset.tab;
      this.fillEditorFromTab();
      this.onStateChange("switch-tab");
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest("#tabs")) {
        const menu = this.els.tabs.querySelector("[data-tab-menu]");
        if (menu) menu.classList.add("hidden");
      }
    });

    this.els.result.addEventListener("click", (e) => {
      const row = e.target.closest("[data-open-note]");
      if (!row) return;
      this.onOpenNote(row.dataset.openNote);
    });

    document.querySelectorAll(".tb[data-md]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const t = btn.dataset.md;
        if (t === "bold") this.wrapSelection("**", "**");
        if (t === "italic") this.wrapSelection("*", "*");
        if (t === "h2") this.insertAtCursor("\n## ");
        if (t === "quote") this.insertAtCursor("\n> ");
        if (t === "ul") this.insertAtCursor("\n- ");
      });
    });

    this.els.insertLink.addEventListener("click", () => {
      const note = this.activeNote();
      if (!note) return this.onStatus("请先打开一个笔记", "warn");
      const candidates = this.scopedLinkCandidates();
      if (!candidates.length) return this.onStatus("当前目录下无可关联笔记", "warn");
      this.openLinkPicker("");
    });

    this.els.closeLinkPicker.addEventListener("click", () => this.closeLinkPicker());
    this.els.linkSearchInput.addEventListener("input", () => this.renderLinkCandidates(this.els.linkSearchInput.value));
    this.els.linkSearchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeLinkPicker();
        return;
      }
      if (e.key === "ArrowDown") {
        this.moveLinkCandidate(1);
        e.preventDefault();
        return;
      }
      if (e.key === "ArrowUp") {
        this.moveLinkCandidate(-1);
        e.preventDefault();
        return;
      }
      if (e.key === "Enter") {
        const chosen = this.currentLinkCandidates[this.currentLinkIndex] || this.currentLinkCandidates[0];
        if (chosen) this.insertSelectedLinkNote(chosen.id);
        e.preventDefault();
      }
    });
    this.els.linkSearchList.addEventListener("click", (e) => {
      const row = e.target.closest("[data-link-note-id]");
      if (!row) return;
      this.insertSelectedLinkNote(row.dataset.linkNoteId);
    });

    this.els.insertTag.addEventListener("click", () => {
      const tag = prompt("输入标签（不含#）：");
      if (!tag) return;
      this.insertAtCursor(` #${tag.trim()}`);
      this.onStatus("已插入标签", "ok");
    });

    this.els.runGuard.addEventListener("click", async () => {
      const note = this.activeNote();
      if (!note) return this.onStatus("请先打开一个笔记", "warn");
      if (note.noteType !== "original") {
        this.onStatus("仅原创笔记执行原创性检测", "warn");
        return;
      }
      try {
        await this.runOriginalityCheck(note, { forSave: false });
      } catch (error) {
        this.onStatus(`检测失败：${String(error?.message || error)}`, "warn");
      }
    });

    this.els.save.addEventListener("click", async () => {
      const tab = this.updateActiveTabFromEditor();
      if (!tab) return this.onStatus("请先打开一个笔记", "warn");
      const note = this.state.notes.find((n) => n.id === tab.noteId);
      if (!note) return this.onStatus("找不到对应笔记", "bad");

      note.body = tab.body;
      note.title = titleFromBody(tab.body);
      note.noteType = typeFromFolder(this.state, note.folderId);
      note.tags = parseTags(note.body);
      note.links = parseLinks(note.body);
      note.updatedAt = new Date().toISOString();

      tab.title = note.title;

      let originality = null;
      if (note.noteType === "original") {
        try {
          originality = await this.runOriginalityCheck(note, { forSave: true });
        } catch (error) {
          this.onStatus(`原创性检查不可用，按 draft 保存：${String(error?.message || error)}`, "warn");
          originality = { status: "warning", similarity: 0, reasons: ["check_unavailable"] };
        }
        if (originality?.status === "blocked") return;
        note.originalityStatus = originality?.status || "warning";
        note.originalitySimilarity = Number(originality?.similarity || 0);
      }

      if (note.noteType !== "original") {
        this.onStatus("保存成功（标题取正文第一行）", "ok");
      }
      this.renderRelated();
      await this.onStateChange("save-note", {
        originalityStatus: note.originalityStatus,
        originalitySimilarity: note.originalitySimilarity
      });
    });

    this.els.body.addEventListener("input", () => {
      const tab = this.activeTab();
      if (!tab) return;
      tab.body = this.els.body.value;
      tab.title = titleFromBody(tab.body);

      const inline = this.detectInlineLinkContext();
      if (inline) {
        this.openLinkPicker(inline.query, { inlineContext: inline, keepFocusInEditor: true });
      } else if (!this.els.linkPicker.classList.contains("hidden") && this.currentLinkContext) {
        this.closeLinkPicker();
      }

      this.onStateChange("switch-tab");
    });

    this.els.body.addEventListener("keydown", (e) => {
      if (this.els.linkPicker.classList.contains("hidden")) return;
      if (!this.currentLinkContext) return;

      if (e.key === "ArrowDown") {
        this.moveLinkCandidate(1);
        e.preventDefault();
        return;
      }
      if (e.key === "ArrowUp") {
        this.moveLinkCandidate(-1);
        e.preventDefault();
        return;
      }
      if (e.key === "Enter") {
        const chosen = this.currentLinkCandidates[this.currentLinkIndex] || this.currentLinkCandidates[0];
        if (chosen) {
          this.insertSelectedLinkNote(chosen.id);
          e.preventDefault();
        }
        return;
      }
      if (e.key === "Escape") {
        this.closeLinkPicker();
        e.preventDefault();
      }
    });

    this.els.body.addEventListener("click", (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      const value = this.els.body.value;
      const token = tokenAtCursor(value, this.els.body.selectionStart || 0);
      this.handleTokenAction(token);
    });

    this.els.showRelated.addEventListener("click", () => {
      this.renderRelated("当前笔记关联总览");
    });
  }
}



