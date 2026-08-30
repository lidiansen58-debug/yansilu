import test from "node:test";
import assert from "node:assert/strict";
import { createDirectoryOptionRuntime } from "../../apps/web/src/directory-option-runtime.js";
import { rootBoxIdFromFolder } from "../../apps/web/src/prototype-store.js";

test("custom-root moves retain siblings and add default type destinations only", () => {
  const state = { folders: [
    { id: "custom", parentId: null }, { id: "source", parentId: "custom" },
    { id: "sibling", parentId: "custom" }, { id: "hidden", parentId: "custom", hidden: true },
    { id: "other-root", parentId: null },
    { id: "dir_fleeting_default", parentId: null }, { id: "dir_original_default", parentId: null }
  ] };
  const runtime = createDirectoryOptionRuntime(() => ({ state, rootBoxIdFromFolder, directoryPathLabel: id => id }));
  const options = runtime.noteMoveDirectoryOptions("source");
  assert.deepEqual(options.map(x => x.id).sort(), ["custom", "dir_fleeting_default", "dir_original_default", "sibling"]);
  assert.doesNotMatch(options.find(x => x.id === "sibling").hint, /草稿/);
});
