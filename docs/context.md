# Persistent Project Context

## Purpose

This file is the concise handoff for resuming LunaTOC work after a session restart, context loss, compaction, or agent handoff. It records only the current working state; durable architecture and decisions belong in `docs/ARCHITECTURE.md` and `docs/DECISIONS.md`.

## Project

- LunaTOC is a Chrome extension that adds a prompt table-of-contents sidebar to ChatGPT.
- The source is TypeScript and React, built with Vite and CRXJS into `dist/`.
- Chrome must load the generated `dist/` directory rather than the repository root.
- The root `manifest.json` is the source Manifest and authoritative extension version.

## Current Architecture

- `src/content.ts` is the minimal Isolated World entry.
- `src/app/applicationShell.ts` creates and coordinates the sidebar application.
- `src/components/sidebar` contains the incremental React sidebar shell.
- ChatGPT-specific behavior lives under `src/platforms/chatgpt`; a Copilot placeholder lives under `src/platforms/copilot`. Both implement the `Platform` interface in `src/platforms/platformInterface.ts`, and the active adapter is resolved once at startup via `getActivePlatform(host = window.location.host)`.
- Generic prompt navigation and fingerprint logic lives under `src/features/navigation`.
- ChatGPT navigation supports `legacy-native` and experimental `independent-virtual` strategies; the default remains `legacy-native`.
- React UI is being adopted incrementally while legacy imperative modules continue to use stable sidebar slots.

## Current Working Direction

- The 2026-09-12 Smart Label completion/compression plan is approved and implemented in the working tree. Developer diagnostics remain intentionally hidden: bounded tab-memory traces, an explicit local console switch, and an offline replay script; there is no user-facing diagnostic or feedback UI.
- The four audited short-prompt fixtures now all classify as context-dependent and produce accepted evidence-bound candidates. Ordinary task sentences and the preceding raw user Prompt fill the demonstrated candidate-recall gap without hard-coded case names.
- Completion and compression are independent. Long informative Prompts can be compressed in Smart mode, semantic and display labels remain separate, and actual browser geometry selects only among fidelity-checked candidates.
- The handoff baseline includes uncommitted and untracked Smart Label files; a new checkout of HEAD alone is insufficient. Verify the file hashes in the handoff before implementation. The audited conversation is now development/regression material, not an unseen holdout.
- The 2026-09-11 Smart Label evidence-binding refinement is implemented from the user-approved local design handoff while preserving all earlier working-tree changes.
- One resolver owns Raw/Smart selection, reply-type classification, source completion, revision-aware cache precedence, and bounded evidence quality. Rule scores remain inspectable test signals, not probabilities.
- Concrete topics, questions, actions, attachments, code, and URLs protect raw prompts. Smart mode can use current answer headings/explicit topics and one preceding explicit question/option group. Weak, incomplete, ambiguous, or conflicting evidence retains raw text.
- Verbatim regressions cover decorative emoji, colloquial repetition, explicit bold topics, topics before a late heading, math cleanup, uncertainty, unique and ambiguous option groups, numeric non-choice answers, incomplete sources, and regenerated responses.
- The revised Smart Label UX promotes accepted Assistant Markdown headings to a two-line parent label, suppresses the duplicated outline row, and shows the complete label plus raw Prompt on hover.
- A discoverable sidebar gear now opens inline palette, Custom color, and cache-clearing controls; popup controls remain available.
- Smart Label cache schema is version 4. Missing signatures are unverifiable rather than implicit hits; consumed preceding Prompt and Assistant context participates in the signature. Capacity remains unchanged.
- Persist only derived labels, compact revision signatures, decision types, identifiers, and cache metadata in `chrome.storage.local`; do not persist source prompts or answer text. Start with provisional limits of 50 conversations, 500 labels per conversation, and 180 days.
- Platform abstraction for Copilot / Gemini / Claude is now in place (see [ADR 11](DECISIONS.md#adr-11-platform-abstraction-interface)). ChatGPT adapter wraps the existing modules unchanged; Copilot is a placeholder that throws on every method.
- Implement actual Copilot support: replace each `throw` in `src/platforms/copilot/*.ts` with concrete fetch-bumping, route detection, navigation, theme detection, etc. Subsequent Gemini and Claude adapters follow the same shape.
- Prefer completing small, reviewable React migrations instead of rewriting the entire sidebar at once.
- Treat the independent virtual navigation algorithm as experimental; avoid further isolated patches without reviewing the complete search flow.
- Keep z-index ownership centralized and allow host-page fullscreen media overlays to temporarily hide LunaTOC surfaces.

## Collaboration Rules

- Read `AGENTS.md`, `docs/ARCHITECTURE.md`, and `docs/DECISIONS.md` before code changes.
- Propose the affected files and approach, then wait for explicit user approval.
- Write code comments, documentation, and persistent context in English.
- The primary coordinating agent owns updates to this file unless write ownership is explicitly delegated.
- Sub-agents may read this file and should return findings to the primary agent rather than editing it concurrently.
- Keep this file current by replacing stale state; do not append chat transcripts or implementation diaries.
- Never record secrets, credentials, access tokens, or private user data here.

## Validation and Handoff

- The focused Smart Label implementation run passes 44 tests across 9 files. The four-case developer replay reports 4/4 accepted labels with no forbidden terms. Final typecheck and production build pass. The full suite passes 232 of 234 tests; only the two previously recorded timer-sensitive `renderedFingerprintCollector` tests fail. Chrome UI validation remains for the user.
- Logic tests belong in `test/` and use Vitest.
- After relevant source changes, run `npm test`, `npm run typecheck`, and `npm run build`.
- Report executed automated tests separately from manual tests that remain for the user.
- Organize implementation summaries by linked file, with one-line file and changed-function descriptions.
- End implementation handoffs with a Conventional Commits message.
- Smart Label focused validation passes 26 tests across three files; `npm run typecheck` passes, and `npm run build` produces a loadable `dist/` directory.
- The latest full-suite run passes 218 of 220 tests. Both failures are the pre-existing timer-sensitive settle and route-switch cases in `test/platforms/chatgpt/renderedFingerprintCollector.test.ts`; the same file passed all 5 tests when rerun alone earlier in this implementation. This Smart Label change does not touch that collector.
- A local 100-run measurement averaged 1.447 ms to classify and resolve 500 synthetic prompts per run, with no single-run long-task instrumentation claim. Static inspection found no Smart Label network API entry point.

## Next Step

- Run the full suite, typecheck, and build; then reload `dist/` in Chrome and verify audited short prompts, long-prompt compression, Raw/Smart switching, search, hover provenance, regenerated responses, width changes, and heading-only outline suppression. Cache version 4 invalidates older Smart Label records automatically.
- Reassess the provisional Smart Label cache limits after real usage evidence; do not change them speculatively.
- My Prompts uses a shared React context menu: empty panel space offers clear-all after confirmation, while saved prompt rows offer Copy Prompt. The right-click target has a temporary selected state while its menu is open. An open menu counts as a sidebar hover surface so auto-hide matches preview-tooltip behavior.
- Prompt autocomplete keeps its suggestion menu open while programmatically inserting a selected prompt, then closes it once after insertion completes to avoid an extra synchronous React update.
- Sidebar view changes are centralized in the application shell. A newly sent ChatGPT prompt explicitly switches My Prompts back to TOC so the panel, title, and toggle button stay synchronized.
- Navigation-anchor persistence safely degrades to memory-only behavior when an extension reload leaves `chrome.storage.local` unavailable, so independent navigation can continue.
- `npm run typecheck`, `npm run build`, and the focused context-menu test passed. The full test suite currently has two unrelated failures in `test/platforms/chatgpt/renderedFingerprintCollector.test.ts`.
- Resume from the user's next confirmed task.
