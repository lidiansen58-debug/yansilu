import test from "node:test";
import assert from "node:assert/strict";

const moduleUrl = new URL("../../apps/web/src/prototype-api.js", import.meta.url);
let importCounter = 0;

async function importPrototypeApi(caseName, windowValue) {
  const previousWindow = globalThis.window;
  if (windowValue === undefined) delete globalThis.window;
  else globalThis.window = windowValue;

  try {
    const url = new URL(moduleUrl);
    url.searchParams.set("case", `${caseName}-${++importCounter}`);
    return await import(url.href);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
}

test("prototype API falls back when packaged API placeholder is not replaced", async () => {
  const api = await importPrototypeApi("placeholder", { __API_BASE__: "__API_BASE__" });
  assert.equal(api.getApiBase(), "http://localhost:3000");
});

test("prototype API uses injected API base from dev server", async () => {
  const api = await importPrototypeApi("injected", { __API_BASE__: "http://127.0.0.1:3999" });
  assert.equal(api.getApiBase(), "http://127.0.0.1:3999");
});

test("prototype API fetches AI inbox evaluation summary with filters", async () => {
  const previousFetch = globalThis.fetch;
  const api = await importPrototypeApi("ai-inbox-evaluation-summary", { __API_BASE__: "http://127.0.0.1:3999" });
  let capturedUrl = "";
  globalThis.fetch = async (url) => {
    capturedUrl = String(url);
    return {
      ok: true,
      async json() {
        return { item: { artifacts: { total: 1 }, feedback: { all: { useful: 1 } } } };
      }
    };
  };

  try {
    const item = await api.fetchAiInboxEvaluationSummary({
      view: "reviewed",
      type: "ReflectionPrompt",
      sourceNoteId: "note_1",
      privacyMode: "local_only"
    });
    const url = new URL(capturedUrl);
    assert.equal(url.origin, "http://127.0.0.1:3999");
    assert.equal(url.pathname, "/api/v1/ai/inbox/evaluation-summary");
    assert.equal(url.searchParams.get("view"), "reviewed");
    assert.equal(url.searchParams.get("type"), "ReflectionPrompt");
    assert.equal(url.searchParams.get("sourceNoteId"), "note_1");
    assert.equal(url.searchParams.get("privacyMode"), "local_only");
    assert.equal(item.feedback.all.useful, 1);
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});

test("prototype API forces accept-link confirmation", async () => {
  const previousFetch = globalThis.fetch;
  const api = await importPrototypeApi("ai-inbox-accept-link", { __API_BASE__: "http://127.0.0.1:3999" });
  let capturedBody = "";
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), "http://127.0.0.1:3999/api/v1/ai/inbox/artifact_1/accept-link");
    capturedBody = options.body;
    return {
      ok: true,
      async json() {
        return { item: { artifactId: "artifact_1" } };
      }
    };
  };

  try {
    await api.acceptAiInboxLink("artifact_1", { confirm: false, comment: "Promote this relation." });
    assert.equal(JSON.parse(capturedBody).confirm, true);
    assert.equal(JSON.parse(capturedBody).comment, "Promote this relation.");
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});

test("prototype API forces promote-note confirmation", async () => {
  const previousFetch = globalThis.fetch;
  const api = await importPrototypeApi("ai-inbox-promote-note", { __API_BASE__: "http://127.0.0.1:3999" });
  let capturedBody = "";
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), "http://127.0.0.1:3999/api/v1/ai/inbox/artifact_2/promote-note");
    capturedBody = options.body;
    return {
      ok: true,
      async json() {
        return { item: { artifactId: "artifact_2" }, note: { id: "note_1" } };
      }
    };
  };

  try {
    await api.promoteAiInboxNote("artifact_2", { confirm: false, comment: "Make a draft." });
    assert.equal(JSON.parse(capturedBody).confirm, true);
    assert.equal(JSON.parse(capturedBody).comment, "Make a draft.");
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});

test("prototype API manages scheduled tasks", async () => {
  const previousFetch = globalThis.fetch;
  const api = await importPrototypeApi("ai-scheduled-tasks", { __API_BASE__: "http://127.0.0.1:3999" });
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes("/status")) {
      return {
        ok: true,
        async json() {
          return { item: { scheduledTaskId: "sched_1", status: "paused" } };
        }
      };
    }
    if (String(url).endsWith("/run-due")) {
      return {
        ok: true,
        async json() {
          return { item: { total: 1, succeeded: 1 } };
        }
      };
    }
    if (String(url).includes("/scheduled-task-templates")) {
      return {
        ok: true,
        async json() {
          return { items: [{ templateId: "reflection_reminder" }], total: 1 };
        }
      };
    }
    if (options.method === "POST" && String(url).endsWith("/scheduled-tasks")) {
      return {
        ok: true,
        async json() {
          return { item: { scheduledTaskId: "sched_created", status: "paused" } };
        }
      };
    }
    if (options.method === "DELETE") {
      return {
        ok: true,
        async json() {
          return { ok: true, deleted: true };
        }
      };
    }
    return {
      ok: true,
      async json() {
        return { items: [{ scheduledTaskId: "sched_1" }], total: 1 };
      }
    };
  };

  try {
    const listed = await api.fetchAiScheduledTasks({ status: "active", taskType: "reflection_prompt", limit: 250 });
    assert.equal(listed.total, 1);
    const listUrl = new URL(calls[0].url);
    assert.equal(listUrl.pathname, "/api/v1/ai/scheduled-tasks");
    assert.equal(listUrl.searchParams.get("status"), "active");
    assert.equal(listUrl.searchParams.get("taskType"), "reflection_prompt");
    assert.equal(listUrl.searchParams.get("limit"), "100");

    const updated = await api.updateAiScheduledTaskStatus("sched_1", "paused");
    assert.equal(updated.status, "paused");
    assert.equal(calls[1].url, "http://127.0.0.1:3999/api/v1/ai/scheduled-tasks/sched_1/status");
    assert.equal(JSON.parse(calls[1].options.body).status, "paused");

    const due = await api.runDueAiScheduledTasks({ limit: 500 });
    assert.equal(due.succeeded, 1);
    assert.equal(calls[2].url, "http://127.0.0.1:3999/api/v1/ai/scheduled-tasks/run-due");
    assert.equal(JSON.parse(calls[2].options.body).limit, 100);

    const templates = await api.fetchAiScheduledTaskTemplates({ implementationReady: true });
    assert.equal(templates.items[0].templateId, "reflection_reminder");
    const templateUrl = new URL(calls[3].url);
    assert.equal(templateUrl.pathname, "/api/v1/ai/scheduled-task-templates");
    assert.equal(templateUrl.searchParams.get("implementationReady"), "true");

    const saved = await api.saveAiScheduledTask({ templateId: "reflection_reminder", status: "paused" });
    assert.equal(saved.scheduledTaskId, "sched_created");
    assert.equal(calls[4].url, "http://127.0.0.1:3999/api/v1/ai/scheduled-tasks");
    assert.equal(JSON.parse(calls[4].options.body).templateId, "reflection_reminder");

    const deleted = await api.deleteAiScheduledTask("sched_created");
    assert.equal(deleted.deleted, true);
    assert.equal(calls[5].url, "http://127.0.0.1:3999/api/v1/ai/scheduled-tasks/sched_created");
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});
