import { spawnSync } from "node:child_process";

const testFile = "./tests/e2e/prototype-browser.test.mjs";

function exactTestPattern(testName) {
  return `^${String(testName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`;
}

const groups = [
  {
    name: "desktop-smoke",
    description: "Desktop updater, basic note flow, standalone route, settings, and directory persistence.",
    tests: [
      "prototype desktop updater check no-ops cleanly when no update is available",
      "prototype browser flow creates, edits, and persists a markdown note",
      "prototype permanent note can save and persists content after authorship confirmation flow",
      "prototype permanent note structured workspace round-trips through source mode without losing fields",
      "prototype literature note keeps permanent-note actions out of the editor toolbar",
      "prototype literature note with missing metadata has no toolbar recording action",
      "standalone editor route loads and saves a note without workspace chrome",
      "prototype settings switches and initializes the active vault",
      "prototype settings browse vault uses picker fallback and fills the path",
      "prototype browser flow creates a directory and persists notes inside it after reload"
    ]
  },
  {
    name: "editor-core",
    description: "Editor creation, modes, toolbar, keyboard behavior, dirty state, drafts, and navigation guards.",
    tests: [
      "prototype new note auto-selects placeholder title for immediate typing",
      "prototype editor keeps related inspector collapsed until explicitly opened",
      "prototype editor focus mode switches into a low-distraction writing chrome",
      "prototype editor defaults to note mode and toggles markdown source",
      "prototype editor helper can dismiss once or mute future hints",
      "prototype editor inserts code blocks tables and dividers with preview support",
      "prototype editor contextual code tools can switch the current code block language",
      "prototype editor mode shortcuts switch note and source",
      "prototype new note exposes editable body area below title",
      "prototype editor toolbar keeps title in place and formats rich text blocks",
      "prototype editor tab indents and shift-tab outdents selected lines",
      "prototype editor enter continues list quote and checklist structures",
      "prototype editor enter preserves ordinary blank paragraphs",
      "prototype editor enter preserves ordinary blank paragraphs in wysiwyg",
      "prototype editor shows dirty state and supports Ctrl/Cmd+S sync",
      "prototype editor keeps long-form dirty drafts and save state isolated per tab",
      "prototype editor stays editable after opening related panel and switching directories",
      "prototype editor keeps content editable when toggling source and wysiwyg with related panel open",
      "prototype editor confirms before closing or switching away from dirty note",
      "prototype editor restores autosaved draft after reload"
    ]
  },
  {
    name: "editor-assets-links",
    description: "Editor asset insertion, external links, wikilinks, tag search, and inline picker flows.",
    tests: [
      "prototype editor inserts uploaded image into markdown and preview",
      "prototype editor inserts uploaded file into markdown and preview action",
      "prototype editor preserves consecutive blank lines in wysiwyg",
      "prototype editor opens external links without navigating the app",
      "prototype editor can insert image and attachment",
      "prototype editor opens wikilinks and tag results from wysiwyg tokens",
      "prototype editor inline wikilink picker inserts ranked candidate",
      "prototype tag click searches SQLite beyond the loaded directory",
      "prototype editor inline tag picker inserts SQLite-backed tag suggestion"
    ]
  },
  {
    name: "import-workflow",
    description: "Simplified Obsidian-only import preview and confirmation flow.",
    tests: [
      "prototype import panel previews and confirms realistic Obsidian import"
    ]
  },
  {
    name: "export-writing-graph-explorer",
    description: "Export, writing scaffold, graph, and explorer file operation flows.",
    tests: [
      "prototype export panel exports markdown files through real API",
      "prototype writing panel creates project and draft scaffold through real API",
      "prototype graph panel renders directory wikilinks and opens graph nodes",
      "prototype explorer keeps current-note context when selecting a different folder",
      "prototype explorer close-all clears stale file highlight and current-note state",
      "prototype close-all lets a new note reopen from a clean explorer and tab state",
      "prototype explorer context rename moves directory fsPath and note markdown path",
      "prototype explorer set-folder-path updates directory fsPath and moves markdown files",
      "prototype explorer drag and drop moves directory under another folder and updates note path",
      "prototype explorer note context rename updates markdown title and keeps file addressable",
      "prototype explorer reveal note uses tauri opener when desktop shell is available",
      "prototype explorer note context move and delete update disk state"
    ]
  },
  {
    name: "relations-graph-closeout",
    description: "Related-note and graph followup closeout flows, including followup entry, remembered templates, and preference clearing.",
    tests: [
      "prototype graph panel bridge gap followup opens relation creation on an isolated note",
      "prototype graph panel tension followup opens boundary field on the source note",
      "prototype graph ai analysis badge counts candidates and opens on failure",
      "prototype graph AI connect suggests a relation from notes without relation data",
      "prototype graph local candidate save removes isolated state and updates graph",
      "prototype graph followup remembers relation template preference after reload",
      "prototype graph followup can clear remembered template preference for relation and boundary flows",
      "prototype route shell exposes graph workspace without explorer rail assumptions"
    ]
  },
  {
    name: "permanent-relation-workspace",
    description: "Permanent-note relation workspace flows for manual search, AI recommendation, pre-save refresh, continuity, and note switching.",
    tests: [
      "prototype permanent relation workspace saves manually, refreshes before save, and resets on note switch",
      "prototype permanent relation workspace saves an AI recommended relation in place",
      "prototype right sidebar relation entry saves through overlay and appears in graph"
    ]
  },
  {
    name: "mobile-responsive",
    description: "Mobile viewport entry points and responsive capture flows.",
    tests: [
      "prototype mobile viewport keeps new note entry discoverable",
      "prototype mobile viewport keeps permanent-note entry usable"
    ]
  },
  {
    name: "paper-workspace",
    description: "Standalone paper workspace flow for draft persistence, selection recovery, failure continuity, and permanent-note continuity across reload.",
    tests: [
      "paper workspace browser flow preserves draft, selection, failure, and permanent-note continuity across reload"
    ]
  }
];

const groupsByName = new Map(groups.map((group) => [group.name, group]));
const args = process.argv.slice(2);
const listRequested = args.includes("--list") || args.includes("-l");
const selectedNames = args.filter((arg) => !arg.startsWith("-"));

if (listRequested) {
  console.log("Available browser e2e groups:");
  for (const group of groups) {
    console.log(`- ${group.name}: ${group.tests.length} tests`);
    console.log(`  ${group.description}`);
  }
  process.exit(0);
}

const selectedGroups = selectedNames.length ? selectedNames.map((name) => groupsByName.get(name)) : groups;
const missing = selectedNames.filter((name) => !groupsByName.has(name));
if (missing.length) {
  console.error(`Unknown browser e2e group(s): ${missing.join(", ")}`);
  console.error("Run `npm.cmd run test:e2e:browser -- --list` to see available groups.");
  process.exit(1);
}

let passed = 0;
const total = selectedGroups.reduce((sum, group) => sum + group.tests.length, 0);

for (const group of selectedGroups) {
  console.log(`\n## Browser E2E group: ${group.name}`);
  console.log(group.description);

  for (const testName of group.tests) {
    console.log(`\n== ${testName} ==`);
    const result = spawnSync(
      process.execPath,
      ["--test", "--test-isolation=none", "--test-name-pattern", exactTestPattern(testName), testFile],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          RUN_BROWSER_E2E: "1"
        },
        stdio: "inherit",
        shell: false
      }
    );

    if (result.error) {
      console.error(result.error);
      process.exit(1);
    }

    if ((result.status ?? 1) !== 0) {
      console.error(`Browser E2E failed in group ${group.name}: ${testName}`);
      process.exit(result.status ?? 1);
    }

    passed += 1;
  }
}

console.log(`\nBrowser E2E check passed: ${passed}/${total} tests.`);
