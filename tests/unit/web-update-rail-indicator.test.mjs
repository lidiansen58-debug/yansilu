import test from "node:test";
import assert from "node:assert/strict";
import { readPrototypeCssSource } from "./copy-source-helpers.mjs";

test("settings rail has a restrained update indicator style", async () => {
  const cssSource = await readPrototypeCssSource();

  assert.match(cssSource, /\.rail-btn\.has-update::before/);
});
