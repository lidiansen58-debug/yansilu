import {
  createWritingEntryRuntimeController
} from "./writing-entry-runtime-controller.js";

export function createWritingEntryRuntimeHost(depsProvider = () => ({})) {
  const controller = createWritingEntryRuntimeController(depsProvider);

  return {
    beginWritingEntry(noteIds = [], options = {}) {
      return controller.beginWritingEntry(noteIds, options);
    },
    continueWritingEntry(noteIds = [], options = {}) {
      return controller.continueWritingEntry(noteIds, options);
    },
    openWritingModule(options = {}) {
      return controller.openWritingModule(options);
    }
  };
}
