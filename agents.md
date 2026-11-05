# AGENTS.md — Rules for AI agents and contributors working on DeReel

Read `SPEC.md` first for _what_ we build. This file defines _how_ you work in the repository.
If a rule here conflicts with a user's explicit instruction in the current session, follow the user and
mention the conflict.

---

## 0. Golden rules

1. **Small, reviewable changes.** One logical change per commit, one topic per pull request.
2. **Never push directly to `main`.** Work on a branch, open a PR, squash-merge.
3. **Keep the layering.** UI (`src/`) → Tauri commands (`src-tauri/`) → engine (`crates/dereel-core`).
   The core never imports Tauri. The UI never spawns processes or reads files directly.
4. **No frame files on disk.** Frames move through pipes/memory only (see SPEC §6.1).
5. **No telemetry, no network calls** except hash-verified model downloads and the opt-in updater.
6. **License hygiene.** Don't add a dependency or model without checking its license (see §9).
7. **Don't invent.** If a requirement, API, or license is unclear, say so and ask, or record an open question
   in the PR. Never fabricate benchmark numbers, versions, or links.
8. **Leave the repo green.** Lint, typecheck, and tests must pass before you finish (see §8).

---

## 1. Workflow

```
git switch main && git pull --ff-only
git switch -c feat/<short-topic>
# ... work in small commits ...
# run checks (§8)
git push -u origin feat/<short-topic>
# open PR → squash-merge → delete branch
```

- Rebase your branch on `main` before merging (`git pull --rebase origin main`); do not create merge commits.
- `main` history is **linear**: squash-merge only. The squashed commit message **is** the PR title
  (must follow §3) plus a short body.
- Never rewrite history on `main`. Force-push is allowed only on your own unmerged feature branch,
  using `--force-with-lease`.
- Never commit secrets, signing certificates, or large binaries/model weights.

---

## 2. Branch naming

`<type>/<kebab-case-topic>` — optionally with an issue number.

| Prefix      | Use                                        |
| ----------- | ------------------------------------------ |
| `feat/`     | new user-visible capability                |
| `fix/`      | bug fix                                    |
| `refactor/` | internal restructuring, no behavior change |
| `perf/`     | performance improvement                    |
| `docs/`     | documentation only                         |
| `test/`     | tests only                                 |
| `build/`    | build system, dependencies                 |
| `ci/`       | CI/CD workflows                            |
| `chore/`    | maintenance, tooling                       |
| `release/`  | release preparation (`release/v0.1.0`)     |

Examples: `feat/preview-slider`, `fix/bwdif-field-rate`, `refactor/backend-trait`, `feat/42-vhs-preset`.

---

## 3. Commit messages — Conventional Commits

Format:

```
<type>(<scope>): <subject>

<body — optional, explain WHY, wrap at 72 cols>

<footer — optional: BREAKING CHANGE:, Refs: #123>
```

**Types:** `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `build`, `ci`, `chore`, `style`, `revert`.

**Scopes (use the closest one):**
`ui`, `core`, `pipeline`, `ffmpeg`, `backend`, `presets`, `models`, `preview`, `export`, `tauri`,
`i18n`, `deps`, `release`.

**Subject rules:** imperative mood ("add", not "added"), lowercase start, no trailing period, ≤ 72 characters.

**Breaking changes:** add `!` after the scope (`feat(presets)!: …`) and a `BREAKING CHANGE:` footer.

Good:

```
feat(preview): add 3s side-by-side preview with before/after slider
fix(ffmpeg): use bwdif send_frame by default to avoid doubling fps
refactor(backend): extract Backend trait from ncnn runner
perf(pipeline): reuse frame buffers via ring buffer
docs(spec): clarify license status of RIFE weights
build(deps): bump tauri to 2.x
chore(release): v0.1.0
```

Bad (don't): `update stuff`, `fix`, `WIP`, `Feat: Added Preview.`, giant commits mixing UI + core + deps.

Rules:

- Each commit should build and pass tests on its own where practical.
- Don't mix formatting-only changes with logic changes (use a separate `style:` commit).
- Reference issues in the footer: `Refs: #12` or `Closes: #12`.
- Do not add marketing text, emojis, or tool-signature lines to commit messages.

---

## 4. Pull requests

- **Title** = final squash commit message (Conventional Commits, §3).
- Use `.github/PULL_REQUEST_TEMPLATE.md`. Include: _What_, _Why_, _How tested_, _Screenshots_ (UI changes),
  _Licensing impact_ (new deps/models), _Breaking changes_.
- Keep PRs under ~400 changed lines when possible; split otherwise.
- Draft PRs for work in progress. All CI checks must be green before merge.
- Don't merge your own PR if a human reviewer is available, unless the repo owner says otherwise.

---

## 5. Versioning & changelog

- **SemVer** (`MAJOR.MINOR.PATCH`); while `0.x`, breaking changes may land in minor versions.
- `CHANGELOG.md` is **generated** from Conventional Commits with `git-cliff` (config: `cliff.toml`).
  Never edit generated sections by hand.
- Release flow: branch `release/vX.Y.Z` → bump versions (`package.json`, `Cargo.toml`, `tauri.conf.json`)
  → regenerate changelog → PR (`chore(release): vX.Y.Z`) → squash-merge → tag `vX.Y.Z` on `main`
  → CI builds artifacts.
- Tags are annotated: `git tag -a vX.Y.Z -m "vX.Y.Z"`.

---

## 6. Architecture rules

### 6.1 Layers and responsibilities

| Layer  | Path                      | Does                                              | Must not                                           |
| ------ | ------------------------- | ------------------------------------------------- | -------------------------------------------------- |
| UI     | `src/`                    | rendering, local UI state, calling typed wrappers | touch filesystem/processes; contain pipeline logic |
| IPC    | `src/lib/`                | typed wrappers around `invoke` and events         | contain business logic                             |
| Shell  | `src-tauri/src/commands/` | validate input, call core, map errors             | contain pipeline/ffmpeg logic                      |
| Engine | `crates/dereel-core/`     | probing, pipeline, backends, presets, models      | import `tauri`, depend on UI                       |

### 6.2 Where does new code go?

| I want to add…                 | Do this                                                                                                                                                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A UI feature**               | New folder `src/features/<feature>/` with `index.ts`, components, hooks, tests. Shared dumb components go to `src/components/ui/`. No cross-feature imports except via `index.ts`.                                    |
| **A Tauri command**            | New function in `src-tauri/src/commands/<group>.rs`, register in `lib.rs`, add minimal permission in `capabilities/`, add typed wrapper in `src/lib/`. Logic lives in core.                                           |
| **A preset**                   | New file `crates/dereel-core/src/presets/<name>.rs` (data only) + register in `presets/mod.rs` + i18n keys in `src/i18n/*.json` + test validating the definition. No UI logic changes beyond the card.                |
| **A filter (FFmpeg)**          | Pure arg-builder in `crates/dereel-core/src/ffmpeg/filters.rs` with unit tests on the produced args.                                                                                                                  |
| **An inference backend**       | Implement the `Backend` trait in `backends/<name>.rs`, register in `backends/mod.rs`, add `probe()` capability logic, fallback behavior, and a benchmark entry. Isolate crash-prone native code in a sidecar process. |
| **A model**                    | Add an entry to `models/manifest.json` (id, url, sha256, size, license, source_repo, commercial_ok) and an audit note in `docs/licenses/`. Never commit weights.                                                      |
| **A new crate**                | Only when justified by an ADR. Put it under `crates/`, add to the workspace.                                                                                                                                          |
| **A major technical decision** | Write `docs/adr/NNNN-short-title.md` (context, decision, alternatives, consequences).                                                                                                                                 |
| **A string shown to users**    | Add keys to **all** locale files in `src/i18n/`. No hard-coded user-facing text in components.                                                                                                                        |

### 6.3 Naming & structure conventions

- Rust: `snake_case` modules/functions, `CamelCase` types. Errors via `thiserror`; no `unwrap()`/`expect()`
  in non-test code (use `?` and typed errors). Public items are documented.
- TypeScript: strict mode, no `any`, function components, one component per file, `PascalCase.tsx` for
  components, `camelCase.ts` for utilities and hooks (`useThing.ts`).
- Files: kebab-case folders; avoid deep nesting (> 4 levels).
- Prefer composition and small modules; split a file when it exceeds ~300 lines.
- Comments explain _why_, not _what_.

### 6.4 Pipeline invariants (do not violate)

1. No temporary frame images on disk.
2. Backpressure between decode → infer → encode (bounded buffers).
3. Outputs are written to `*.partial` and renamed on success.
4. Deinterlace (if needed) happens **before** super-resolution.
5. Video presets must not use photo models (`RealESRGAN_x4plus`).
6. Native crashes are contained in a sidecar; the UI survives and offers retry/fallback.

---

## 7. Security & privacy

- Tauri capabilities: grant the minimum per window; no wildcard filesystem or shell scope.
- Validate all paths coming from the UI in the shell layer (canonicalize, reject unexpected locations).
- Spawn sidecars only through the sanctioned wrapper; never build shell strings from user input.
- No analytics, no phone-home. Updater and model download must verify signatures/SHA-256.
- Log locally; strip file paths from anything a user might copy into a public bug report unless they confirm.

---

## 8. Quality gates (run before every push)

```
# Rust
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace

# Frontend
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

- Add or update tests with every behavior change. Bug fix = regression test first when feasible.
- UI changes: include a screenshot or short recording in the PR.
- Performance claims require a reproducible benchmark in `docs/benchmarks/` (`scripts/bench`).
- Do not skip hooks (`--no-verify`) or silence linters without a justified inline comment.

---

## 9. Dependencies & licenses

Before adding any crate, npm package, binary, or model:

1. Check its license. Allowed by default: MIT, Apache-2.0, BSD-2/3, ISC, MPL-2.0 (file-level), Unlicense.
2. **Forbidden by default:** anything non-commercial/research-only (e.g., CodeFormer's S-Lab license),
   GPL/AGPL code linked into our binaries, unknown/no license.
3. Weights can have different terms than code and can inherit dataset restrictions — verify separately.
4. Update `THIRD_PARTY_LICENSES.md` and `docs/licenses/` in the same PR.
5. Prefer fewer, well-maintained dependencies; justify heavy ones in the PR description.
6. FFmpeg: use the LGPL build; don't add GPL-only components without an ADR.

---

## 10. Working style for AI agents

1. **Plan briefly**, then implement. For non-trivial work, outline the approach in the PR/first message.
2. **Explore before editing:** read the relevant module, existing tests, and `SPEC.md`.
3. **Make the smallest change that solves the problem.** No drive-by refactors; propose them separately.
4. **Match existing style** and patterns. Don't introduce a new library for something we already have.
5. **Verify:** run the gates in §8, run the app if the change is user-visible, and report what you ran.
6. **Be honest in summaries:** state what changed, what was tested, what you could _not_ verify,
   and any follow-ups. Never claim tests passed if you didn't run them.
7. **Ask when blocked** on product, legal, or architecture decisions instead of guessing.
8. **Don't touch** unrelated files, generated files, lockfiles (unless dependencies changed), or CI config
   unless the task requires it.
9. Keep user-facing language simple and friendly; keep technical terms out of the main UI.

---

## 11. Definition of Done

- [ ] Behavior matches `SPEC.md` (or the spec was updated in the same PR)
- [ ] Layering and pipeline invariants respected
- [ ] Tests added/updated; all quality gates green
- [ ] i18n keys added for every locale
- [ ] Licenses checked and documented for any new dependency/model
- [ ] Docs updated (`README`, `SPEC`, ADR) where relevant
- [ ] Commit/PR title follows Conventional Commits; history is clean and linear
- [ ] No secrets, weights, or large binaries committed

---

## 12. Quick reference

```
Branch:   feat/preview-slider
Commit:   feat(preview): add 3s side-by-side preview with before/after slider
PR title: feat(preview): add 3s side-by-side preview with before/after slider
Merge:    squash into main, delete branch
Release:  release/v0.1.0 → chore(release): v0.1.0 → tag v0.1.0
```
