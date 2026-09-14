# LunaTOC Remix — Next Work Prompt

Copy the prompt below into the next Codex Work task. Communicate progress and the final handoff in Chinese. Keep code, comments, and durable project documentation in English.

---

You are continuing development of **LunaTOC Remix** on 2026-09-13.

## Repository and workspace

- GitHub repository: https://github.com/zhaozixuan03/luna-toc-remix
- Local working directory: `/Users/zhaozixuan/Documents/Codex/2026-09-10/referenced-chatgpt-conversation-this-is-an/work/luna-toc`
- `origin`: `https://github.com/zhaozixuan03/luna-toc-remix.git`
- `upstream`: `https://github.com/Leo7805/luna-toc.git`
- Default branch: `main`
- Baseline before this handoff document: `3c6cf11`
- The repository is an independent derivative with the complete upstream history and MIT lineage preserved.

Before changing anything, read `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/context.md`, and this file completely. Inspect `git status`, remotes, the current branch, and the latest remote `main`. Do not assume the baseline SHA is still current.

## Mandatory GitHub workflow

All project changes must be preserved on GitHub promptly.

1. Start from the latest `origin/main` with a clean working tree.
2. Create a focused branch whose name starts with `codex/`.
3. Make small, reviewable commits using Conventional Commits.
4. Push the branch after each coherent, validated increment. Do not leave the only copy of meaningful work uncommitted locally.
5. Open a pull request describing behavior, affected files, validation, known failures, privacy impact, and manual checks.
6. Merge through the pull request after validation; do not bypass protected `main`.
7. Sync local `main` after merging and confirm that `origin` still points to the Remix repository and `upstream` still points to the original repository.
8. Never rewrite inherited author history, force-push `main`, or manufacture commits to influence GitHub's contributor card.

Use the user's local SOCKS5 proxy for GitHub network operations when direct access fails:

```text
127.0.0.1:1086
```

Do not store credentials, tokens, or proxy secrets in the repository.

## Product decisions already made

- Semantic compression eligibility depends on the original Prompt content and a stable text-length policy. It must **not** be triggered by sidebar width or browser layout.
- Layout is a separate presentation concern. It may wrap or clamp text, but it must not silently change the meaning of a label or decide whether a Prompt deserves compression.
- At practical sidebar widths, each TOC row should show up to three lines rather than collapsing most rows to a single-line ellipsis. Raw and Smart modes both need adequate information density.
- Developer diagnostics and evaluation are internal tools only. Keep them hidden or disabled for ordinary users. They may be removed from production packaging later.
- Conversation text must remain local. Do not add a remote model, telemetry, automatic upload, or external evaluation service without new explicit approval.
- Private conversation excerpts must not be committed verbatim. Store only minimized, reviewed, and anonymized fixtures in Git; keep raw evaluation material in an ignored local directory.
- Preserve original message IDs, Raw mode, navigation targets, search over original text, hover provenance, saved Prompts, and cache invalidation behavior.

## Verified current implementation

Do not reimplement these blindly; audit them first.

- `src/navigation/promptLabelCompression.ts` already implements deterministic long-label compression.
- Current eligibility is more than 48 normalized Unicode characters; browser width no longer participates.
- `test/navigation/promptLabelCompression.test.ts` covers compression routing and preservation of negation, numbers, units, and output formats.
- `test/navigation/promptLabelLayout.test.ts` covers two-line fit reporting and verifies that width cannot change the selected semantic label.
- `src/styles/content.css` currently gives Smart Labels two lines, while ordinary Raw rows still use single-line `white-space: nowrap` and ellipsis.
- Sidebar width is currently configured as 300 px default, 240 px minimum, and 520 px maximum. The sidebar is fixed on the right and overlays the host page.
- `src/navigation/promptLabelDiagnostics.ts` keeps up to 1,000 text-free traces in tab memory. Console emission is enabled only when `localStorage['luna:debugSmartLabels'] === '1'`.
- `scripts/evaluateSmartLabels.ts` replays the four minimized audited short-prompt fixtures.
- The latest recorded full test run passed 232 of 234 tests. The two existing failures are timer-sensitive cases in `test/platforms/chatgpt/renderedFingerprintCollector.test.ts`; do not ignore or conceal them.

The user has not observed long-prompt compression in the actual extension. Treat this as an unresolved end-to-end product issue even though unit code exists.

## Objective

Deliver a small but complete productization cycle that makes long-prompt compression visibly verifiable, fixes sidebar information density and excessive overlay, makes internal diagnostics genuinely usable, and establishes a scalable evaluation corpus and baseline report.

Work in the following order.

## A. Reproduce and explain the missing compression effect

1. Build the current `main` and load the generated `dist/` in Chrome.
2. Confirm the installed extension version/build and that Chrome is not loading an older directory.
3. Test Raw and Smart mode with at least:
   - a long Chinese request;
   - a long English request;
   - mixed Chinese/English text;
   - a long request containing negation, numbers, units, versions, and multiple tasks;
   - quoted email/code/log content followed by a short actual request;
   - a long Prompt for which safe compression is impossible.
4. Record for each case: original Prompt, character/width eligibility, route, candidates, selected semantic label, displayed label, cache status, and visible result.
5. Determine whether the missing effect is caused by an old build, Raw mode, threshold policy, conservative candidate generation, cache reuse, layout reselection, stale render state, or another concrete cause.
6. Add regression coverage for every confirmed cause. Do not lower safety guards merely to make a demo change visually.
7. Make the build/version visible in a developer-accessible location so future reports can identify the loaded code without guesswork.

Acceptance:

- At least five representative long Prompts visibly compress in Smart mode when compression is faithful.
- Raw mode remains unchanged.
- Prompts that cannot be compressed without losing required meaning remain Raw/semantic-full with an explicit diagnostic reason.
- The same input produces a before/after table that can be replayed locally.

## B. Separate semantic compression from UI layout

Refactor only as much as necessary to enforce this boundary:

```text
original Prompt length/content -> compressionNeed and semantic candidates
semantic validation -> semanticLabel
sidebar presentation -> wrapping/clamping only
```

Browser width must not initiate semantic compression. Reconsider the current `promptLabelLayout.ts` behavior if it changes which semantic candidate is presented solely because the sidebar width changed. If multiple compression levels are retained, their selection policy must be stable and content-based; layout may only report fit/unfit and present the chosen label safely.

Add tests showing that the same Prompt produces the same semantic label at narrow and wide widths.

## C. Fix sidebar width and information density

Keep the solution simple and testable.

1. Show TOC labels in up to **three lines** in both Raw and Smart modes.
2. Preserve hover preview of the full original Prompt and full semantic label.
3. Reduce the maximum practical sidebar width so dragging it cannot cover an unreasonable portion of the conversation. Use a viewport-aware cap or a conservative fixed cap, but do not add a complex layout engine.
4. Clamp restored/persisted widths when the viewport changes or when an old stored width exceeds the new limit.
5. Confirm numbering, outline indicators, active state, search, scrolling, and click targets remain aligned when rows have different heights.
6. Check whether default width, horizontal padding, numbering width, header controls, and search controls can be tightened without reducing accessibility.
7. Do not change ChatGPT's own layout or inject irreversible margins into the host page unless separately justified and approved.

Required manual matrix:

- narrow and wide browser windows;
- sidebar at minimum, default, and maximum widths;
- Raw and Smart modes;
- Chinese, English, mixed-language, long identifier, URL, and code-like labels;
- active row, starred row, expanded outline, search result, hover preview, pinned and auto-hide modes.

Acceptance:

- Normal rows expose up to three useful lines before ellipsis.
- The sidebar cannot be dragged to the previous excessive 520 px overlay on ordinary laptop viewports.
- No row loses navigation identity or becomes difficult to click.
- Width changes never alter semantic meaning.

## D. Turn internal diagnostics into a usable developer tool

Do not add a normal-user diagnostic UI.

1. Document and verify the exact enable/disable workflow, including refresh requirements:

   ```js
   localStorage.setItem('luna:debugSmartLabels', '1');
   location.reload();
   ```

   Disable with:

   ```js
   localStorage.removeItem('luna:debugSmartLabels');
   location.reload();
   ```

2. Confirm console records expose stage statuses and reason codes without Prompt or Assistant text.
3. Provide a developer-only way to inspect and copy the current bounded trace buffer. Prefer an explicitly gated debug API or DevTools helper; do not expose it in the ordinary sidebar.
4. Add an npm script for the offline Smart Label evaluator so it is discoverable.
5. Produce an aggregate report containing counts and rates for completion need, compression need, routes, rejection reasons, cache status, candidate counts, layout fit, and runtime.
6. Deduplicate rerenders of the same revision and keep memory bounded.
7. Never persist raw conversations or automatically upload traces.

Acceptance:

- A maintainer can enable logging, reproduce one turn, identify the exact stopping stage, copy a safe trace, disable logging, and run the offline evaluator from documented commands.
- Ordinary users see no diagnostic controls or technical tags.

## E. Build a scalable evaluation corpus

Use sub-agents in parallel for bounded tasks such as scenario taxonomy, synthetic generation, adversarial transformations, benchmark licensing review, and independent output review. The primary agent owns the schema, privacy decisions, deduplication, final integration, and `docs/context.md`.

Build three clearly separated layers:

### 1. Private local conversation corpus

- Use the user's accessible ChatGPT conversations as permitted development material.
- Keep raw captures under an ignored local path such as `.local/evaluation/`.
- Never commit complete private conversations.
- Convert only selected failures into minimized, anonymized regression fixtures after reviewing every retained detail.
- Split by whole conversation, never adjacent turns from one conversation across train/development/test partitions.

### 2. Large deterministic synthetic corpus

- Generate at least 5,000 reproducible cases with fixed seeds and explicit template-family IDs.
- Cover acknowledgements, continuation, authorization, pronouns, ellipsis, option selection, negative selection, uncertainty, correction, topic switches, consecutive acknowledgements, missing context, incomplete streaming, regeneration, quoted material, attachments, code, math, multilingual prompts, long multi-intent requests, numbers, units, versions, conditions, and negation.
- Create metamorphic pairs such as “do it”/“do not do it”, A/B order swaps, 8 kHz/16 kHz changes, heading/no-heading variants, CRLF variants, and irrelevant-highlight injection.
- Keep generated cases labeled as synthetic. Automated generation or model review does not turn them into human gold.
- Deduplicate by normalized content, template family, and semantic slots.

### 3. Public benchmark adapters

Research licensing and download requirements before importing data. Start with task-relevant portions rather than large retrieval corpora:

- CANARD: https://aclanthology.org/D19-1605/ and https://github.com/aagohary/canard
- QReCC: https://github.com/apple/ml-qrecc
- GECOR: https://aclanthology.org/D19-1462/
- TREC CAsT: https://pages.nist.gov/trec-browser/trec29/cast/data/

These benchmarks test contextual question rewriting, ellipsis, co-reference, and conversational retrieval. They do **not** directly validate acknowledgement/authorization intent, title usefulness, long-Prompt compression fidelity, or sidebar navigation. Report adapted slices separately and do not claim that benchmark accuracy equals LunaTOC product quality.

Do not commit third-party datasets unless their license clearly permits redistribution. Prefer download/adaptation scripts, checksums, and local ignored outputs.

## F. Evaluation contract and reporting

Define a versioned schema containing at least:

- case ID, source type, conversation/template family, language, and completeness;
- completion need, compression need, act, stance, task/object, required qualifiers, and evidence references;
- allowed labels, forbidden semantics, Raw-is-better, and correct-abstention fields;
- semantic label, displayed label, candidate counts, route, reason codes, cache status, and layout fit;
- algorithm/schema version and runtime.

Report these metrics with explicit denominators and slice breakdowns:

- completion-need recall;
- unnecessary rewrite rate;
- evidence recall;
- candidate oracle recall before and after guards;
- selection success;
- accepted precision;
- useful coverage;
- compression fidelity;
- critical semantic errors;
- stable semantic label across widths;
- three-line readability/fit;
- cold/warm runtime and cancellation behavior.

Keep development, calibration, and locked-test splits separate by conversation and template family. Report synthetic, private-local, and public-benchmark results separately. Include sample size and confidence intervals; do not present model-judge labels as objective ground truth.

## G. Fix the current test-suite instability and add CI

Investigate the two timer-sensitive `renderedFingerprintCollector` tests. Fix the root cause in test scheduling or production cancellation semantics without simply increasing arbitrary waits, skipping tests, or weakening assertions.

Once the full suite is stable, add a minimal GitHub Actions workflow that runs:

```sh
npm ci
npm test
npm run typecheck
npm run build
```

Do not claim CI is healthy until it has passed on GitHub.

## Likely affected files

Confirm the actual list after investigation. Expected areas include:

- `src/navigation/promptLabelCompression.ts`
- `src/navigation/promptLabelLayout.ts`
- `src/navigation/promptLabelDiagnostics.ts`
- `src/navigation/promptLabels.ts`
- `src/navigation/navigatorController.ts`
- `src/styles/content.css`
- `src/config/config.ts`
- `src/app/applicationShell.ts`
- `scripts/evaluateSmartLabels.ts`
- new evaluation generator/adapter scripts and minimized fixtures under `test/`
- `.gitignore`, `package.json`, relevant tests
- `.github/workflows/ci.yml`
- `README.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, and `docs/context.md` where behavior or workflow changes

Do not create a large new framework unless the evidence shows existing focused modules cannot support the work.

## Required validation

Run and report the exact results of:

```sh
npm test
npm run typecheck
npm run build
```

Also run the offline evaluator, the synthetic benchmark, and any public benchmark adapters actually implemented. Load `dist/` in Chrome and execute the manual UI matrix. Do not describe an unexecuted check as passed.

## Final handoff

Respond in Chinese and lead with outcomes. Include:

1. root cause of the previously invisible compression effect;
2. before/after examples using identical inputs;
3. final compression eligibility policy and proof that width does not affect semantics;
4. sidebar width and three-line behavior;
5. exact developer log/evaluator usage;
6. dataset sizes, provenance, privacy status, splits, metrics, and limitations;
7. every changed file and materially changed function;
8. automated and manual validation results;
9. PR and merged commit links;
10. remaining risks and the next recommended increment.

Do not stop after writing a plan. Continue through implementation, validation, GitHub PR, merge, and local `main` synchronization unless a new permission boundary or genuine blocker requires user input.

---
