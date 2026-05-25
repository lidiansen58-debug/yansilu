import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("graph relation review cards ask the user to补关系理由 instead of generic relation followup", () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");

  assert.match(
    source,
    /data-graph-followup-action="relations-edit"[\s\S]*?>去补关系理由<\/span>/
  );
  assert.doesNotMatch(
    source,
    /data-graph-followup-action="relations-edit"[\s\S]*?>去补关系<\/span>/
  );
});
