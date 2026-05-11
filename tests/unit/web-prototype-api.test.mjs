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
