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
