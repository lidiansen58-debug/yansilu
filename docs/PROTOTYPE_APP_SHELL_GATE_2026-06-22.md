# Prototype App Shell Gate

Goal 21 validation result:

- `prototype-app.js` is still not a pure shell. Graph and writing rendering remain the largest runtime blocks.
- The acceptable near-term role is app shell plus global state injection, module wiring, and a small amount of cross-module coordination.
- New domain logic should continue to move into focused model/controller/view/helper modules before adding more branches to `prototype-app.js`.

Automated guardrails:

- `tests/unit/web-prototype-app-shell-audit.test.mjs` keeps `prototype-app.js` under the current line budget and verifies key module wiring.
- Unit tests that read `prototype-app.js` source are capped so source-string tests do not spread back into many copy-level assertions.
- Graph and writing shell boundary checks are centralized in `web-prototype-graph-shell-boundary.test.mjs` and `web-prototype-writing-shell-boundary.test.mjs`.

Current source-string test budget after Goal 21:

- Files reading `prototype-app.js`: 18
- Source reference points: 68

Remaining high-value extraction targets:

- Graph visual rendering and selection panels.
- Writing panel rendering and project/scaffold/draft surface composition.
- Note browser action routing in `web-note-browser-actions.test.mjs`, which is now the largest remaining source-string test cluster.
