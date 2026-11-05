# DeReel — Product & Engineering Spec

> Open-source, 100% private AI video restoration & upscaling in 2 clicks.
> Status: pre-MVP. This file is the source of truth for _what_ we are building and _how it should look_.
> Rules for contributors (human or AI) live in `AGENTS.md`.

---

## 1. Vision

DeReel is "Upscayl for video": a small, fast, local-first desktop app that makes old or low-resolution
video look better without a terminal, Python, cloud accounts, or subscriptions.

**Target user:** a person with family videos (VHS rips, old phone clips) who is not technical.

**Principles (in priority order):**

1. **Local-first & private.** Video never leaves the machine. No telemetry, no accounts, no network calls
   except optional model download (user-visible, hash-verified).
2. **Two clicks.** Drop file → choose preset → export. No expert settings on the main screen.
3. **Honest results.** Preview before committing hours of render. Never promise cloud-grade quality.
4. **Small & native-feeling.** No Python/PyTorch on the user's machine. Installer in the tens of MB
   (excluding optional model packs).
5. **Clean licensing.** Only commercially-usable components, so a future optional paid service is not blocked.

**Non-goals (v0.x):** cloud rendering, accounts, video editing/timeline, colorization, stabilization,
generative/diffusion "HQ" mode (post-MVP experiment), mobile.

---

## 2. Platforms

| Platform              | Support | Inference backend (priority)                                 |
| --------------------- | ------- | ------------------------------------------------------------ |
| macOS (Apple Silicon) | Tier 1  | ncnn-vulkan (MoltenVK) first → CoreML/ANE for compact models |
| Windows 10/11         | Tier 1  | ncnn-vulkan first → ONNX Runtime DirectML                    |
| Linux                 | Tier 2  | ncnn-vulkan                                                  |

Backends sit behind one Rust trait (see §6). Start with the one that works everywhere (ncnn-vulkan);
add faster platform backends only after benchmarks prove the gain.

---

## 3. User experience

### 3.1 Screens

1. **Home / Import** — large drag-and-drop zone (also "Browse"). Accepts mp4, mov, mkv, avi, m4v, webm.
2. **Preset & Preview** (main screen) — file info strip, four preset cards, timeline scrubber,
   `Preview 3s` button, before/after slider, `Export` button.
3. **Export / Progress** — progress, ETA, current fps, pause/resume/cancel, "Show in folder" on finish.
4. **Settings** (minimal) — output folder, model storage location, "Advanced" accordion
   (scale, codec, quality), language, about/licenses.

### 3.2 Visual direction

- Dark mode first, calm and minimal. Glass/blur surfaces used sparingly.
- One accent color. Large rounded cards. Generous spacing. System font stack (Inter optional).
- Motion: subtle (150–250 ms). Respect `prefers-reduced-motion`.
- Accessibility: keyboard navigable, visible focus rings, AA contrast, labels on every control.
- Copy: plain language. Say "Removes tape lines and noise", not "bwdif + hqdn3d".

### 3.3 Presets (user-facing)

| Preset                      | For                       | Pipeline (default)                                                                                                                          |
| --------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 📼 **VHS / Family Archive** | tape rips, interlaced SD  | deinterlace → light denoise → compact SR (2x) → encode. Face restoration is **off** until a license-clean, flicker-safe model is validated. |
| 📱 **Old Phone / Low-Res**  | 240p–480p phone/web clips | optional deblock → compact general SR (2x/4x) → encode                                                                                      |
| ⚡ **Smooth 60 FPS**        | choppy 24/30 fps          | RIFE interpolation only (scene-cut aware) → encode                                                                                          |
| 🎬 **Cartoon / Anime**      | animation                 | anime-video compact SR → encode                                                                                                             |

Presets are **data, not code**: each is a declarative definition (see §7). Adding a preset must not require
UI changes beyond a card entry.

### 3.4 Preview (killer feature)

- User scrubs to a moment and presses **Preview 3s**.
- Core decodes ~3 s from that timestamp, runs the _exact_ export pipeline, and produces a short lossless-ish
  clip (not a single frame — temporal flicker must be visible).
- UI shows a before/after slider, both sides synced and looping; original is scaled with the same
  resampler used for fair comparison.
- Target: preview ready in roughly 10–30 s on Apple M-series / mid-range GPU. This is a **target to benchmark**,
  not a promise; show a live ETA and allow cancel.
- Preview files live in the OS temp dir and are deleted on app close / next preview.

---

## 4. Tech stack

| Layer     | Choice                                                               | Notes                                                                                                         |
| --------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Shell     | **Tauri v2** (Rust)                                                  | small installer, capability-based permissions                                                                 |
| UI        | **React + TypeScript (strict) + Vite + Tailwind CSS** + Lucide icons | state: Zustand (or equivalent small store)                                                                    |
| Core      | Rust workspace crate `dereel-core`                                   | pipeline, backends, presets; testable without Tauri                                                           |
| Media     | **FFmpeg + ffprobe, bundled as sidecars**                            | do **not** rely on system ffmpeg; use an LGPL build (no GPL-only encoders) unless legal review says otherwise |
| Inference | ncnn-vulkan; later CoreML (Apple), ONNX Runtime DirectML (Windows)   | each in its own sidecar or crate behind the `Backend` trait                                                   |

Why sidecar/process isolation for inference: a GPU-driver crash must not kill the UI or lose the job.

---

## 5. Repository layout

```
dereel/
├─ AGENTS.md                 # rules for AI/human contributors
├─ SPEC.md                   # this file
├─ README.md                 # user-facing intro, install, screenshots
├─ CHANGELOG.md              # generated from Conventional Commits (git-cliff)
├─ LICENSE                   # project license (decide before first public release)
├─ THIRD_PARTY_LICENSES.md   # generated/maintained; every dependency & model
├─ Cargo.toml                # Rust workspace
├─ package.json  vite.config.ts  tsconfig.json  tailwind.config.ts
├─ cliff.toml                # changelog config
├─ .github/
│  ├─ workflows/             # ci.yml, release.yml
│  ├─ PULL_REQUEST_TEMPLATE.md
│  └─ ISSUE_TEMPLATE/
├─ crates/
│  └─ dereel-core/           # UI-independent engine
│     └─ src/
│        ├─ lib.rs
│        ├─ error.rs
│        ├─ pipeline/        # decode.rs  infer.rs  encode.rs  ring_buffer.rs  job.rs
│        ├─ ffmpeg/          # probe.rs  filters.rs (arg builders)  sidecar.rs
│        ├─ backends/        # mod.rs (trait)  ncnn_vulkan.rs  coreml.rs  directml.rs
│        ├─ presets/         # mod.rs  vhs.rs  low_res.rs  smooth_fps.rs  anime.rs
│        ├─ models/          # registry.rs  download.rs  verify.rs (sha256)
│        └─ preview.rs
├─ src-tauri/                # thin Tauri shell only
│  ├─ tauri.conf.json
│  ├─ capabilities/          # minimal permissions, per-window
│  ├─ binaries/              # sidecar binaries (ffmpeg, ncnn runners) — large files not committed
│  └─ src/
│     ├─ main.rs  lib.rs
│     └─ commands/           # one file per command group; no business logic
├─ src/                      # React UI
│  ├─ app/                   # App.tsx, providers, routing
│  ├─ features/
│  │  ├─ import/             # DropZone
│  │  ├─ presets/            # PresetCard, PresetGrid
│  │  ├─ preview/            # CompareSlider, Timeline, usePreview
│  │  ├─ export/             # ProgressView, useExport
│  │  └─ settings/
│  ├─ components/ui/         # shared presentational primitives (Button, Card, Slider…)
│  ├─ lib/                   # typed wrappers over Tauri invoke/events, formatters
│  ├─ stores/                # app state
│  ├─ i18n/                  # en.json, uk.json
│  └─ styles/                # globals.css, design tokens
├─ models/
│  └─ manifest.json          # model id, url, sha256, size, license, source (NO weights in git)
├─ docs/
│  ├─ architecture.md
│  ├─ adr/                   # Architecture Decision Records: 0001-….md
│  ├─ benchmarks/            # reproducible benchmark results
│  └─ licenses/              # model license audit
├─ scripts/                  # fetch-sidecars, verify-licenses, bench
└─ tests/                    # e2e + fixtures (tiny clips only)
```

**Layering rule:** `src/` (UI) → Tauri commands → `dereel-core`. The core never imports Tauri.
The UI never spawns processes or touches the filesystem directly.

---

## 6. Core architecture

### 6.1 Pipeline (zero disk writes for frames)

```
 input.mp4
    │
 ffprobe ──► JobPlan (fps, size, interlace, color, audio)
    │
 [decoder ffmpeg] --rawvideo--> pipe ─► [ring buffer 3–8 frames] ─► [inference backend] ─► [ring buffer]
                                                                                          │
 [encoder ffmpeg] <--rawvideo-- pipe <────────────────────────────────────────────────────┘
    │
 output.mp4  (audio copied/remuxed from source, no re-encode)
```

- Decoder, inference and encoder run on separate threads/processes with **backpressure**.
- No temporary PNG/JPG frame files. Ever.
- Long jobs are processed in **segments (GOP-aligned)** with a small checkpoint file so Pause/Resume and
  crash recovery work.
- Use hardware encoders when available (VideoToolbox, NVENC, AMF, QSV); fall back to software.
- Keep source color metadata; convert pixel format explicitly and test it (color shifts are a known
  complaint with competing tools).

### 6.2 Backend trait (sketch)

```rust
pub trait Backend: Send {
    fn id(&self) -> &'static str;
    fn probe(&self) -> BackendCaps;                       // available? fp16? vram?
    fn load(&mut self, model: &ModelSpec) -> Result<()>;
    fn process(&mut self, input: &Frame, out: &mut Frame) -> Result<()>;   // tiled internally
    fn unload(&mut self);
}
```

Selection order is decided at runtime from `probe()` plus a first-run micro-benchmark, with automatic
fallback to the next backend on failure/OOM.

### 6.3 Job state machine

`Idle → Probing → Ready → Previewing → Ready → Running ⇄ Paused → Finishing → Done`
Any state → `Failed(err)` or `Cancelled`. State changes are emitted to the UI as typed events
(`job://progress`, `job://state`, `job://error`).

### 6.4 Quality guardrails (learned the hard way)

- **Never** use photo-oriented `RealESRGAN_x4plus` for video (texture "boiling"/flicker). Use compact video-safe
  models (`realesr-general-x4v3`, `realesr-animevideov3`, or validated SPAN-class models).
- **Deinterlace before SR.** Use FFmpeg `bwdif`. Note: `mode=send_field` doubles the frame rate (and the
  inference cost); `mode=send_frame` keeps the original rate. Default to `send_frame` unless the preset
  explicitly wants field-rate output. Detect interlacing (`idet`) before applying.
- Add light temporal stabilization where needed (e.g., blend with previous output frame at low weight,
  or post-deflicker) and **measure** it on fixtures.
- Per-frame face restoration (GFPGAN-style) flickers and can alter identity; if ever offered it must be
  opt-in with a strength slider and a clear warning.
- Tile large frames to bound VRAM; never let one job exhaust memory silently.

---

## 7. Presets as data

```jsonc
// conceptual shape — final schema lives in dereel-core/src/presets
{
    "id": "vhs",
    "name_key": "preset.vhs.name",
    "description_key": "preset.vhs.desc",
    "filters_pre": [
        { "id": "deinterlace", "args": { "mode": "send_frame" } },
        { "id": "denoise", "args": { "strength": "light" } },
    ],
    "model": { "id": "realesr-general-x4v3", "scale": 2 },
    "filters_post": [],
    "output": { "codec": "auto", "crf": 18, "audio": "copy" },
    "advanced_overrides": ["scale", "denoise_strength"],
}
```

Adding a preset = new definition + i18n strings + (optional) icon. No pipeline changes.

---

## 8. Models & licensing

Rules:

- Every model has an entry in `models/manifest.json`: `id, url, sha256, size, license, source_repo, commercial_ok`.
- App downloads/uses a model **only** if `sha256` matches. No weights in git.
- CI fails if a manifest entry lacks `license` or has `commercial_ok: false` in a default preset.

| Component                           | License (verify before shipping)                                     | Status                                                |
| ----------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------- |
| Real-ESRGAN code + released weights | BSD-3-Clause                                                         | OK                                                    |
| RIFE / ncnn ports                   | MIT code; **check each weight release**                              | verify                                                |
| CodeFormer                          | S-Lab, **non-commercial**                                            | **forbidden**                                         |
| GFPGAN / RestoreFormer              | code permissive; **weights may inherit dataset limits (e.g., FFHQ)** | verify before use                                     |
| SeedVR2 (post-MVP HQ mode)          | Apache-2.0                                                           | OK; heavy (3B/7B)                                     |
| FFmpeg                              | LGPL/GPL depending on build                                          | use LGPL build, document it                           |
| Video2X / REAL Video Enhancer code  | AGPL-3.0                                                             | do **not** copy code without deciding project license |

Keep a human-readable audit in `docs/licenses/`. When in doubt: don't ship it.

---

## 9. Error handling & UX of failure

- Typed errors in core (`thiserror`), mapped to short user messages + "Copy details" for bug reports.
- Typical failures to design for: unsupported codec, no GPU/Vulkan, out-of-memory, disk full, cancelled by user,
  corrupted input, backend crash (auto-retry on next backend).
- A failed job must leave no half-written output (write to `*.partial`, rename on success).

---

## 10. Performance & testing

**Benchmarks** (kept in `docs/benchmarks/`, reproducible via `scripts/bench`): seconds of processing per
minute of video for each preset on M1/M2/M3, a mid-range NVIDIA, and an integrated GPU. Publish honestly.

**Tests**

- Rust unit tests for filter/arg builders, preset validation, state machine, manifest verification.
- Integration tests with tiny fixture clips (≤ 2 s, committed via Git LFS or generated).
- Golden-frame/PSNR-SSIM checks for the pipeline plumbing (not "beauty").
- Frontend: component tests (Vitest + Testing Library) for DropZone, PresetGrid, CompareSlider.
- E2E smoke (Tauri WebDriver or Playwright): import → preview → export on the tiny fixture.

---

## 11. Distribution

- macOS: signed + notarized `.dmg` (Apple Developer account required).
- Windows: signed installer if possible (unsigned triggers SmartScreen/AV warnings).
- Linux: AppImage.
- CI builds on tags `vX.Y.Z`; artifacts attached to GitHub Releases; checksums published.
- Auto-update via Tauri updater (opt-in, signed manifests).

---

## 12. Roadmap

**v0.1.0 — MVP (walking skeleton)**

- [ ] Tauri v2 + React + Tailwind scaffold; CI (lint, typecheck, test)
- [ ] `dereel-core` with ffprobe, decode→pipe→encode (no AI, passthrough) proving zero-disk-write
- [ ] ncnn-vulkan backend + `realesr-general-x4v3` on one platform
- [ ] Import screen + preset cards (2 working presets)
- [ ] 3 s preview with before/after slider
- [ ] Export with progress, cancel, audio passthrough

**v0.2** — all four presets, RIFE, pause/resume, segment checkpoints, Windows build, backend fallback.
**v0.3** — CoreML/ANE or DirectML backend (only if benchmarks justify), first-run benchmark, i18n (en/uk).
**v0.4** — signed installers, auto-update, public benchmarks, docs site.
**Later** — optional HQ mode (SeedVR2, MLX), batch queue, optional paid cloud (separate, clearly optional).

---

## 13. Open questions (decide via ADR, not ad hoc)

1. Project license (MIT/Apache-2.0 vs AGPL) — affects what code can be reused.
2. Bundle models in the installer vs download on first run (default plan: download, hash-verified).
3. CoreML vs MLX vs ncnn-vulkan on Apple Silicon — decide only after measured benchmarks.
4. Temporal-stabilization approach (post-deflicker vs model-based).
5. Telemetry: default answer is **none**; any crash reporting must be opt-in and local-first.
