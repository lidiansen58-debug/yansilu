import { escapeHtml } from "./editor-render-utils.js";
import {
  isHiddenRelation,
  isMarkdownWikilinkRelation,
  relationTypeLabel
} from "./editor-relation-helpers.js";
import { explicitPermanentNoteRelations } from "./permanent-note-sidebar-model.js";

function noteTitle(note = null) {
  return String(note?.title || note?.id || "未命名笔记").trim();
}

function noteId(note = null) {
  return String(note?.id || "").trim();
}

function relationEndpoint(link = {}, direction = "outgoing", notes = []) {
  const endpointId = direction === "outgoing" ? link?.toNoteId || link?.to_note_id : link?.fromNoteId || link?.from_note_id;
  const apiNote = direction === "outgoing" ? link?.target : link?.source;
  const cached = notes.find((item) => item?.id === endpointId) || null;
  return {
    id: endpointId || apiNote?.id || cached?.id || "",
    title: apiNote?.title || cached?.title || endpointId || "未命名笔记"
  };
}

function uniqueNotes(notes = []) {
  const seen = new Set();
  return notes.filter((note) => {
    const id = noteId(note);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function relationLinkId(link = {}) {
  return String(link?.id || link?.relationId || "").trim();
}

function savedRelationForEndpoint({ link, direction, notes }) {
  const endpoint = relationEndpoint(link, direction, notes);
  if (!endpoint.id) return null;
  const label = direction === "outgoing" ? "关联到" : "关联了这条";
  return {
    id: relationLinkId(link),
    endpoint,
    direction,
    label,
    relationType: link?.relationType || "associated_with",
    relationTypeLabel: relationTypeLabel(link?.relationType || "associated_with"),
    rationale: String(link?.rationale || "").trim()
  };
}

function savedRelationsByEndpoint(explicit, notes = []) {
  const map = new Map();
  const add = (relation) => {
    if (!relation?.endpoint?.id) return;
    const current = map.get(relation.endpoint.id) || [];
    current.push(relation);
    map.set(relation.endpoint.id, current);
  };
  explicit.outgoing.forEach((link) => add(savedRelationForEndpoint({ link, direction: "outgoing", notes })));
  explicit.backlinks.forEach((link) => add(savedRelationForEndpoint({ link, direction: "incoming", notes })));
  return map;
}

export function relationRowsByEndpoint(items = [], notes = []) {
  const rows = new Map();
  items.forEach(({ link, direction }) => {
    const endpoint = relationEndpoint(link, direction, notes);
    if (!endpoint.id) return;
    const current = rows.get(endpoint.id) || {
      endpoint,
      links: [],
      directions: new Set(),
      relationTypes: new Set()
    };
    current.links.push({ link, direction });
    current.directions.add(direction);
    current.relationTypes.add(String(link?.relationType || "associated_with").trim().toLowerCase() || "associated_with");
    rows.set(endpoint.id, current);
  });
  return [...rows.values()];
}

function relationRowCountByEndpoint(items = [], notes = []) {
  return relationRowsByEndpoint(items, notes).length;
}

function renderExistingRelationPopover(note, relations = []) {
  const id = noteId(note);
  if (!id || !relations.length) return "";
  const rows = relations.map((relation) => {
    const reason = relation.rationale || "还没有关系理由。";
    return `
      <article class="editor-related-existing-row">
        <div>
          <span>${escapeHtml(relation.label)} · ${escapeHtml(relation.relationTypeLabel)}</span>
          <p>${escapeHtml(reason)}</p>
        </div>
        ${
          relation.id
            ? `<button class="mini-btn is-ghost" type="button" data-relation-action="open-edit" data-relation-id="${escapeHtml(relation.id)}">编辑</button>`
            : ""
        }
      </article>
    `;
  }).join("");
  return `
    <div class="editor-related-existing-popover" hidden data-editor-related-popover data-editor-related-popover-for="${escapeHtml(id)}">
      <div class="editor-related-existing-head">
        <strong>${escapeHtml(noteTitle(note))}</strong>
        <button class="mini-btn is-ghost" type="button" data-editor-related-popover-close>关闭</button>
      </div>
      <div class="editor-related-existing-list">
        ${rows}
      </div>
    </div>
  `;
}

function renderBodyLinkRow(note, relations = []) {
  const id = noteId(note);
  if (!id) return "";
  const hasRelations = relations.length > 0;
  return `
    <article class="editor-related-note-row" data-editor-related-note-row data-editor-related-note-id="${escapeHtml(id)}">
      <button class="editor-related-note-main" type="button" data-preview-note="${escapeHtml(id)}">
        <strong>${escapeHtml(noteTitle(note))}</strong>
      </button>
      ${
        hasRelations
          ? ""
          : `<button
              class="mini-btn primary"
              type="button"
              data-permanent-relation-action="open"
              data-permanent-relation-target-note="${escapeHtml(id)}"
              data-relation-entry-mode="manual"
            >补关系</button>`
      }
    </article>
  `;
}

function renderLinkList(rows, emptyText) {
  return `
    ${
      rows.length
        ? `<div class="editor-related-note-list">${rows.join("")}</div>`
        : `<div class="editor-related-note-empty">${escapeHtml(emptyText)}</div>`
    }
  `;
}

export function editorRelatedNotesSummary({
  relations = null,
  relationState = "idle",
  forward = [],
  backward = [],
  notes = []
} = {}) {
  const explicit = explicitPermanentNoteRelations(relations);
  const relationMap = savedRelationsByEndpoint(explicit, notes);
  const savedCount = explicit.all.length;
  const bodyLinks = uniqueNotes(forward);
  const allBodyLinks = uniqueNotes([...forward, ...backward]);
  const linkedBodyCount = bodyLinks.filter((note) => (relationMap.get(noteId(note)) || []).length > 0).length;
  const rawOutgoing = Array.isArray(relations?.outgoingLinks) ? relations.outgoingLinks.filter((link) => !isHiddenRelation(link)) : [];
  const bodyRelationCount = relationRowCountByEndpoint(
    rawOutgoing
      .filter((link) => isMarkdownWikilinkRelation(link))
      .map((link) => ({ link, direction: "outgoing" })),
    notes
  );
  const externalRelationCount = relationRowCountByEndpoint(
    [
      ...explicit.outgoing.map((link) => ({ link, direction: "outgoing" })),
      ...explicit.backlinks.map((link) => ({ link, direction: "incoming" }))
    ],
    notes
  );
  const totalRelationCount = bodyRelationCount + externalRelationCount;
  return {
    relationState: String(relationState || "idle"),
    savedCount,
    bodyLinkCount: bodyLinks.length,
    linkedBodyCount,
    totalRelationCount,
    bodyRelationCount,
    externalRelationCount,
    allBodyLinkCount: allBodyLinks.length,
    outgoing: explicit.outgoing,
    incoming: explicit.backlinks,
    relationMap,
    bodyLinks,
    totalCount: bodyLinks.length,
    notes
  };
}

export function renderEditorRelatedNotesPanel(options = {}) {
  const summary = editorRelatedNotesSummary(options);
  const noteIdValue = String(options.note?.id || options.noteId || "").trim();
  if (!noteIdValue) return "";
  if (summary.relationState === "loading") {
    return `
      <section class="inspector-section editor-related-notes-panel" data-editor-related-notes-panel data-note-id="${escapeHtml(noteIdValue)}">
        <div class="inspector-section-head">
          <div class="inspector-section-title">正文中提到</div>
          <div class="inspector-count">读取中</div>
        </div>
        <div class="editor-related-note-empty">正在读取这条笔记的关系。</div>
      </section>
    `;
  }
  if (summary.relationState === "error") {
    return `
      <section class="inspector-section editor-related-notes-panel" data-editor-related-notes-panel data-note-id="${escapeHtml(noteIdValue)}">
        <div class="inspector-section-head">
          <div class="inspector-section-title">正文中提到</div>
          <div class="inspector-count">读取失败</div>
        </div>
        <div class="editor-related-note-empty">关系暂时没有读出来，可以稍后重试。</div>
      </section>
    `;
  }

  const bodyRows = summary.bodyLinks
    .map((note) => renderBodyLinkRow(note, summary.relationMap.get(noteId(note)) || []))
    .filter(Boolean);

  return `
    <section class="inspector-section editor-related-notes-panel" data-editor-related-notes-panel data-note-id="${escapeHtml(noteIdValue)}">
      <div class="inspector-section-head">
        <div class="inspector-section-title">正文中提到</div>
        <div class="inspector-count">${summary.linkedBodyCount}/${summary.bodyLinkCount} 已关联</div>
      </div>
      ${renderLinkList(bodyRows, "正文里还没有提到其他笔记。")}
    </section>
  `;
}

export function renderEditorBodyRelationActions(options = {}) {
  const summary = editorRelatedNotesSummary(options);
  if (summary.relationState !== "loaded" || !summary.totalRelationCount) return "";

  return `
    <div class="editor-body-relation-actions-inner">
      <button class="editor-body-related-button" type="button" data-note-main-route-action="relations">
        关联 ${escapeHtml(String(summary.totalRelationCount))}
      </button>
    </div>
  `;
}
