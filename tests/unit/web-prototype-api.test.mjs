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

test("prototype API fetches note relations through the public endpoint", async () => {
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return new Response(
      JSON.stringify({
        item: {
          noteId: "note with space",
          tags: [],
          outgoingLinks: [],
          backlinks: []
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  };

  try {
    const api = await importPrototypeApi("relations", { __API_BASE__: "http://127.0.0.1:3999" });
    const relations = await api.fetchNoteRelations("note with space");

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "http://127.0.0.1:3999/api/v1/notes/note%20with%20space/relations");
    assert.equal(calls[0].options.method, undefined);
    assert.deepEqual(relations, {
      noteId: "note with space",
      tags: [],
      outgoingLinks: [],
      backlinks: []
    });
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});

test("prototype API searches notes through the public endpoint", async () => {
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return new Response(
      JSON.stringify({
        rootDirectoryId: "dir_original_default",
        query: "target",
        items: [{ id: "pn_target", title: "Target note", directoryId: "dir_child" }],
        total: 1
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  };

  try {
    const api = await importPrototypeApi("search-notes", { __API_BASE__: "http://127.0.0.1:3999" });
    const result = await api.searchNotes({
      query: "target",
      rootDirectoryId: "dir_original_default",
      excludeNoteId: "pn_source",
      limit: 30
    });

    assert.equal(calls.length, 1);
    assert.equal(
      calls[0].url,
      "http://127.0.0.1:3999/api/v1/notes/search?q=target&rootDirectoryId=dir_original_default&excludeNoteId=pn_source&limit=30"
    );
    assert.equal(calls[0].options.method, undefined);
    assert.equal(result.total, 1);
    assert.equal(result.items[0].id, "pn_target");
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});

test("prototype API creates note relations through the public endpoint", async () => {
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return new Response(
      JSON.stringify({
        item: {
          id: "lnk_test",
          fromNoteId: "source note",
          toNoteId: "target note",
          relationType: "supports",
          rationale: "A supports B.",
          status: "confirmed"
        }
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" }
      }
    );
  };

  try {
    const api = await importPrototypeApi("create-relation", { __API_BASE__: "http://127.0.0.1:3999" });
    const relation = await api.createNoteRelation("source note", {
      toNoteId: "target note",
      relationType: "supports",
      rationale: "A supports B."
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "http://127.0.0.1:3999/api/v1/notes/source%20note/relations");
    assert.equal(calls[0].options.method, "POST");
    assert.deepEqual(JSON.parse(calls[0].options.body), {
      toNoteId: "target note",
      relationType: "supports",
      rationale: "A supports B."
    });
    assert.equal(relation.id, "lnk_test");
    assert.equal(relation.status, "confirmed");
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});

test("prototype API seeds the Yijing knowledge-network demo through the public endpoint", async () => {
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return new Response(
      JSON.stringify({
        item: {
          kind: "prototype_demo_seed",
          demoOnly: true,
          importLifecycle: "none",
          fixtureId: "yijing-judgment-training",
          directoryId: "dir_demo_yijing_knowledge_network",
          summary: { totalNodes: 16, totalEdges: 20 }
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  };

  try {
    const api = await importPrototypeApi("seed-yijing-network", { __API_BASE__: "http://127.0.0.1:3999" });
    const result = await api.seedYijingKnowledgeNetwork();

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "http://127.0.0.1:3999/api/v1/demo/knowledge-network/yijing");
    assert.equal(calls[0].options.method, "POST");
    assert.deepEqual(JSON.parse(calls[0].options.body), {});
    assert.equal(result.kind, "prototype_demo_seed");
    assert.equal(result.demoOnly, true);
    assert.equal(result.importLifecycle, "none");
    assert.equal(result.directoryId, "dir_demo_yijing_knowledge_network");
    assert.equal(result.summary.totalNodes, 16);
    assert.equal(result.summary.totalEdges, 20);
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});

test("prototype API updates note relations through the public endpoint", async () => {
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return new Response(
      JSON.stringify({
        item: {
          id: "lnk test",
          relationType: "qualifies",
          rationale: "Updated rationale.",
          status: "draft"
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  };

  try {
    const api = await importPrototypeApi("update-relation", { __API_BASE__: "http://127.0.0.1:3999" });
    const relation = await api.updateNoteRelation("lnk test", {
      relationType: "qualifies",
      rationale: "Updated rationale.",
      status: "draft"
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "http://127.0.0.1:3999/api/v1/relations/lnk%20test");
    assert.equal(calls[0].options.method, "PATCH");
    assert.deepEqual(JSON.parse(calls[0].options.body), {
      relationType: "qualifies",
      rationale: "Updated rationale.",
      status: "draft"
    });
    assert.equal(relation.relationType, "qualifies");
    assert.equal(relation.status, "draft");
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});

test("prototype API deletes note relations through the public endpoint", async () => {
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return new Response(JSON.stringify({ deleted: true, relationId: "lnk test" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  try {
    const api = await importPrototypeApi("delete-relation", { __API_BASE__: "http://127.0.0.1:3999" });
    const result = await api.deleteNoteRelation("lnk test");

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "http://127.0.0.1:3999/api/v1/relations/lnk%20test");
    assert.equal(calls[0].options.method, "DELETE");
    assert.deepEqual(result, { deleted: true, relationId: "lnk test" });
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});
