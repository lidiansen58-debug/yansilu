function escapeHtmlValue(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fallbackPrompt({ title = "请输入", value = "" } = {}) {
  if (typeof window === "undefined" || typeof window.prompt !== "function") return Promise.resolve("");
  return Promise.resolve(window.prompt(title, value) || "");
}

export function createTextInputDialog({
  documentRef = typeof document !== "undefined" ? document : null,
  escapeHtml = escapeHtmlValue
} = {}) {
  if (!documentRef?.body) return fallbackPrompt;

  let activeResolve = null;
  let previousFocus = null;
  const root = documentRef.createElement("div");
  root.className = "modal-mask text-input-modal hidden";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.innerHTML = `
    <div class="modal text-input-dialog">
      <div class="modal-head" data-text-input-title>重命名</div>
      <div class="modal-body">
        <div class="modal-note" data-text-input-note>输入新名称。</div>
        <label>
          <span data-text-input-label>名称</span>
          <input data-text-input-field />
        </label>
        <div class="modal-field-note" data-text-input-error hidden></div>
      </div>
      <div class="modal-foot">
        <button class="mini-btn" type="button" data-text-input-cancel>取消</button>
        <button class="mini-btn primary" type="button" data-text-input-confirm>保存</button>
      </div>
    </div>
  `;
  documentRef.body.appendChild(root);

  const titleEl = root.querySelector("[data-text-input-title]");
  const noteEl = root.querySelector("[data-text-input-note]");
  const labelEl = root.querySelector("[data-text-input-label]");
  const inputEl = root.querySelector("[data-text-input-field]");
  const errorEl = root.querySelector("[data-text-input-error]");

  function close(value = "") {
    root.classList.add("hidden");
    if (errorEl) {
      errorEl.hidden = true;
      errorEl.textContent = "";
    }
    const resolve = activeResolve;
    activeResolve = null;
    if (previousFocus?.focus) previousFocus.focus();
    previousFocus = null;
    resolve?.(value);
  }

  function submit() {
    const value = String(inputEl?.value || "").trim();
    if (!value) {
      if (errorEl) {
        errorEl.hidden = false;
        errorEl.textContent = "名称不能为空。";
      }
      inputEl?.focus();
      return;
    }
    close(value);
  }

  root.querySelector("[data-text-input-cancel]")?.addEventListener("click", () => close(""));
  root.querySelector("[data-text-input-confirm]")?.addEventListener("click", submit);
  root.addEventListener("click", (event) => {
    if (event.target === root) close("");
  });
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close("");
    }
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  });

  return function requestTextInput({
    title = "重命名",
    note = "输入新名称。",
    label = "名称",
    value = ""
  } = {}) {
    if (activeResolve) close("");
    previousFocus = documentRef.activeElement;
    if (titleEl) titleEl.textContent = title;
    if (noteEl) noteEl.textContent = note;
    if (labelEl) labelEl.textContent = label;
    if (inputEl) {
      inputEl.value = String(value || "");
      inputEl.setAttribute("aria-label", label);
    }
    if (errorEl) {
      errorEl.hidden = true;
      errorEl.textContent = "";
    }
    root.classList.remove("hidden");
    globalThis.setTimeout?.(() => {
      inputEl?.focus();
      inputEl?.select();
    }, 0);
    return new Promise((resolve) => {
      activeResolve = resolve;
    });
  };
}
