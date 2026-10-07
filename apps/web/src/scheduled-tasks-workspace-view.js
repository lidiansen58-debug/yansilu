import { renderScheduledTasksPanel } from "./scheduled-tasks-panel.js";

export function mountScheduledTasksPanel(mount, state, { preserveForm = false } = {}) {
  if (!mount) return;
  const panel = mount.querySelector(".scheduled-task-panel");
  const details = panel?.querySelector(".scheduled-task-form-details");
  const vaultScope = String(state.vaultScope || "");
  const keepForm = preserveForm && panel?.dataset.vaultScope === vaultScope && state.formOpen && !state.actionLoading && details?.open;
  if (!keepForm) {
    mount.innerHTML = renderScheduledTasksPanel(state);
    mount.querySelector(".scheduled-task-panel").dataset.vaultScope = vaultScope;
    return;
  }

  const template = mount.ownerDocument.createElement("template");
  template.innerHTML = renderScheduledTasksPanel(state);
  const nextPanel = template.content.querySelector(".scheduled-task-panel");
  const nextForm = nextPanel.querySelector("#scheduledTaskForm");
  const form = details.querySelector("#scheduledTaskForm");
  const select = form.querySelector("#scheduledTaskTemplateSelect");
  const nextSelect = nextForm.querySelector("#scheduledTaskTemplateSelect");
  if (select.innerHTML !== nextSelect.innerHTML) select.innerHTML = nextSelect.innerHTML;
  select.value = nextSelect.value;
  const save = form.querySelector("#btnScheduledTaskSave");
  const nextSave = nextForm.querySelector("#btnScheduledTaskSave");
  save.disabled = nextSave.disabled;
  save.textContent = nextSave.textContent;
  for (const message of [...form.children].filter(node => node.matches(".scheduled-task-feedback"))) message.remove();
  for (const message of [...nextForm.children].filter(node => node.matches(".scheduled-task-feedback"))) {
    form.insertBefore(message, form.querySelector("fieldset"));
  }
  // Keep the live form attached while replacing only the refreshed list/toolbar.
  for (const child of [...panel.children]) {
    if (child !== details) child.remove();
  }
  let beforeForm = true;
  for (const child of [...nextPanel.children]) {
    if (child.matches(".scheduled-task-form-details")) {
      beforeForm = false;
      continue;
    }
    if (beforeForm) panel.insertBefore(child, details);
    else panel.appendChild(child);
  }
}
