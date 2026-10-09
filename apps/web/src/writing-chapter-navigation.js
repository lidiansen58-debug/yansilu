import { selectedWritingBookChapter } from "./writing-book-chapter-controller.js";

/** A chapter directory replaces the redundant desktop selector. */
export function renderWritingChapterNavigation(deps = {}) {
  const host = deps.$?.("writingChapterNavigation");
  if (!host) return;
  const project = deps.writingState?.project;
  const parts = project?.book_structure?.parts || [];
  const hasChapters = parts.some(part => part.chapters?.length);
  host.hidden = !hasChapters;
  if (!hasChapters) { host.innerHTML = ""; return; }
  const escape = deps.escapeHtml || String;
  const currentId = selectedWritingBookChapter(deps.writingState)?.id || "";
  const button = (id, title) => `<button class="writing-sidebar-action${id === currentId ? " is-active" : ""}" type="button" data-writing-chapter="${escape(id)}"${id === currentId ? ' aria-current="page"' : ""}>${escape(title)}</button>`;
  const markup = `<h3>内容目录</h3>${button("", "文章正文")}${parts.filter(part => part.chapters?.length).map(part =>
    `<div class="writing-chapter-group"><p>${escape(part.title || "章节")}</p>${part.chapters.map(chapter => button(chapter.id, chapter.title)).join("")}</div>`
  ).join("")}`;
  if (host.innerHTML === markup) return;
  const active = host.ownerDocument?.activeElement;
  const focusedId = host.contains(active) ? active?.getAttribute?.("data-writing-chapter") : null;
  const scroll = host.scrollTop;
  host.innerHTML = markup;
  host.scrollTop = scroll;
  if (focusedId !== null) [...host.querySelectorAll('[data-writing-chapter]')].find(button => button.dataset.writingChapter === focusedId)?.focus();
}
