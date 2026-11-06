# DESIGN_SYSTEM.md — AI Video Upscaler & Restorer

> Aesthetic Paradigm: High-Craft Bento Minimalism (Inspired by Zeno, Hiver, Nixtio, Raycast, Arc Browser)
> Tech Stack Target: Tauri v2 + React + Tailwind CSS + Lucide Icons + Framer Motion

---

## 1. Core Design Philosophy (Rules for AI Code Generation)

1. **Frame-within-a-Frame (Nested Canvas):** The app does NOT use classic divider lines running the full height of the screen. The outer window shell (App Shell) has the base background and contains the navigation, while the main work area (Video Workspace) is a raised island inset `8px–12px` from the window edges, with a `20px` radius and a `1px` border.
2. **Monochrome First, Single Accent:** 95% of the interface is built from shades of black, white, and neutral gray (Zinc/Neutral). The color accent (Cyan-to-Blue Gradient) is allowed **EXCLUSIVELY** for the primary action button (`Export Video`) and the active render indicator.
3. **Zero Nested Scrollbars:** The app behaves as a fixed native viewport (`h-screen w-screen overflow-hidden select-none`).
4. **Surface Elevation over Shadows:** In the dark theme, depth is conveyed not by shadows but by lightening the background by 3–5% and by an inner top highlight on the border (`border-white/[0.07]`).
5. **Squircle Geometry (Concentric Radius Rule):** If the outer container has radius `R` and the inner padding is `P`, the inner card always has radius `R - P` (for example: outer block `24px` − padding `8px` = inner card `16px`).

---

## 2. Color Tokens (Dual Theme: Obsidian Dark & Studio Light)

**Obsidian Dark** is used by default (best for perceiving video contrast). **Studio Light** is an alternative daytime theme in the Hiver/Nixtio style.

### A. Obsidian Dark Theme (Default — Zeno Style)

| Token Role               | CSS Variable       | HEX / Value              | Tailwind Equivalent                | Where Used                                                  |
| :----------------------- | :----------------- | :----------------------- | :--------------------------------- | :---------------------------------------------------------- |
| **App Shell Bg**         | `--bg-shell`       | `#09090B`                | `bg-zinc-950`                      | Outer window background, left Icon Rail, and preset sidebar |
| **Workspace Island**     | `--bg-canvas`      | `#111115`                | `bg-[#111115]`                     | Main inner canvas with the video player                     |
| **Card / Bento Surface** | `--bg-card`        | `#18181D`                | `bg-[#18181D]`                     | Preset cards, metric blocks, GPU widget in the sidebar      |
| **Card Hover / Active**  | `--bg-card-hover`  | `#22222A`                | `bg-[#22222A]`                     | Hover state on a preset or list item                        |
| **Glass Surface**        | `--bg-glass`       | `rgba(255,255,255,0.06)` | `bg-white/[0.06] backdrop-blur-md` | Floating controls over the video (Play, 3s Preview, Zoom)   |
| **High-Contrast Block**  | `--bg-contrast`    | `#FFFFFF`                | `bg-white text-zinc-950`           | Active chips, secondary high-contrast button (as in Zeno)   |
| **Primary Text**         | `--text-primary`   | `#F4F4F6`                | `text-zinc-100`                    | Headings, preset names, active parameters                   |
| **Secondary Text**       | `--text-secondary` | `#8E8E93`                | `text-zinc-400`                    | Preset descriptions, captions under icons                   |
| **Muted Text**           | `--text-muted`     | `#52525B`                | `text-zinc-600`                    | Inactive elements, technical hints                          |
| **Subtle Border**        | `--border-subtle`  | `rgba(255,255,255,0.07)` | `border-white/[0.07]`              | All borders of cards, the island, and Bento blocks          |
| **Active Border**        | `--border-active`  | `rgba(255,255,255,0.22)` | `border-white/20`                  | Border of the selected preset                               |

### B. Studio Light Theme (Optional — Nixtio / Hiver Style)

| Token Role               | CSS Variable       | HEX / Value        | Tailwind Equivalent       | Where Used                                                               |
| :----------------------- | :----------------- | :----------------- | :------------------------ | :----------------------------------------------------------------------- |
| **App Shell Bg**         | `--bg-shell`       | `#F2F3F5`          | `bg-[#F2F3F5]`            | Matte light-gray background of the window shell and sidebar              |
| **Workspace Island**     | `--bg-canvas`      | `#FFFFFF`          | `bg-white`                | Pure white workspace island                                              |
| **Card / Bento Surface** | `--bg-card`        | `#F8F9FA`          | `bg-[#F8F9FA]`            | Inactive preset and parameter cards                                      |
| **High-Contrast Block**  | `--bg-contrast`    | `#0F0F12`          | `bg-[#0F0F12] text-white` | Active icon in the rail, selected preset, Bento container (Nixtio style) |
| **Primary Text**         | `--text-primary`   | `#111113`          | `text-zinc-900`           | Main text                                                                |
| **Secondary Text**       | `--text-secondary` | `#6E6E77`          | `text-zinc-500`           | Descriptions and metadata                                                |
| **Subtle Border**        | `--border-subtle`  | `rgba(0,0,0,0.06)` | `border-black/[0.06]`     | Thin, delicate divider lines                                             |

### C. Brand & Semantic Accents (Shared by Both Themes)

- **Primary CTA Gradient (Zeno Action Button):** `bg-gradient-to-r from-[#38BDF8] to-[#3B82F6]` (Hover: `brightness-110`, Shadow: `shadow-[0_0_24px_-4px_rgba(56,189,248,0.4)]`).
- **AI Processing / Active Pulse:** `#38BDF8` (Sky 400) — for the progress bar and the Before/After slider.
- **Status Online / Hardware Ready:** `#10B981` (Emerald 500) — a small `6px` dot next to the GPU status (`Apple Neural Engine Ready`).
- **Warning / Heavy Load:** `#F59E0B` (Amber 500).

---

## 3. Geometry, Spacing & Border Radius

- **Window Outer Padding:** `p-2.5` (`10px`) — the gap between the edges of the native OS window and the inner island.
- **Main Workspace Island Radius:** `rounded-[22px]` (`22px`).
- **Bento Container / Video Frame Radius:** `rounded-2xl` (`16px`).
- **Preset Card / Inner Metric Card Radius:** `rounded-xl` (`12px`).
- **Icon Rail Squircle / Buttons:** `rounded-[10px]` (`10px`) for medium buttons, or `rounded-full` (capsule) for chips and the floating preview controller.
- **Grid Gap:** `gap-3` (`12px`) between cards in the sidebar; `gap-2` (`8px`) inside Bento metrics.

---

## 4. Typography System

- **UI Sans Font:** `Inter` or `Geist Sans` (on macOS: `-apple-system, BlinkMacSystemFont`).
    - Heading weight: `font-semibold` (`600`), tracking `tracking-tight` (`-0.02em`).
    - Main UI text: `text-[13px] leading-[18px] font-medium` (the gold standard of native macOS apps — don't use a giant `16px` web font for controls!).
    - Card descriptions: `text-[11.5px] leading-[16px] text-[var(--text-secondary)]`.
- **Telemetry & Timecode Mono Font:** `JetBrains Mono` or `Geist Mono` with `tabular-nums` (`font-variant-numeric: tabular-nums`).
    - Used for: timecodes (`00:01:24:12`), FPS (`24 -> 60 FPS`), resolution (`3840 × 2160`), and the render timer, so the digits don't "jump" while updating.

---

## 5. Layout Architecture (3-Zone App Shell)

The screen is divided into 3 distinct functional zones (left to right):

```
+-----------------------------------------------------------------------------------+
| [● ● ●]                                                                           |
| +----+  +-----------------------+  +--------------------------------------------+ |
| |    |  | Presets (4 Cards)     |  | Header: filename.mp4     [1080p -> 4K] [x] | |
| | [■]|  | [1. VHS & Archive   ] |  |--------------------------------------------| |
| |    |  | [2. Old Phone / Low ] |  |                                            | |
| | [ ]|  | [3. Smooth 60 FPS   ] |  |        INTERACTIVE VIDEO CANVAS            | |
| |    |  | [4. Anime & Cartoons] |  |        (Before  <--|-->  After)            | |
| | [ ]|  |                       |  |                                            | |
| |    |  |                       |  |        [ ▶  |  ⚡ 3s Preview  | 200% ]     | |
| |    |  | +-------------------+ |  |--------------------------------------------| |
| |    |  | | Hardware Status   | |  | [Input: 480p] [AI: RIFE+SPAN] [Est: 01:15] | |
| | [⚙]|  | | M4 • 38 FPS       | |  | [========= Progress =========] [ Export ->]| |
| +----+  +-----------------------+  +--------------------------------------------+ |
+-----------------------------------------------------------------------------------+
Zone 1          Zone 2                                Zone 3
(56px)          (270px)                              (flex-1)
```

### Zone 1: Micro Icon Rail (`w-14` / `56px`)

- Reserves space for the macOS system buttons (the "traffic lights", `pt-8`) and 3 icons centered/at the top:
    1. **Enhance (Main workspace)** — the active icon sits inside a high-contrast squircle `w-9 h-9 rounded-[10px]` (`bg-white text-black` in the dark theme or `bg-[#0F0F12] text-white` in the light theme, as in Hiver/Nixtio).
    2. **Batch Queue (File queue)** — with a minimalist badge showing the number of videos.
    3. **Settings (bottom of the rail)** — choose the save folder and the GPU memory limit.

### Zone 2: Preset & Hardware Sidebar (`w-[270px] flex flex-col justify-between`)

- **Top block — 4 Presets ("in 2 clicks"):**
    - No complex accordions or 20 sliders. Four vertical cards (`p-3.5 rounded-xl border transition-all duration-150`).
    - Each card has: a concise icon on the left in a mini-container `w-8 h-8 rounded-lg`, a name (`13px font-semibold`), a one-line short description (`11px text-zinc-400`, e.g. _"Deinterlace + Face restore"_), and a small scale tag at the top right (`2x`, `4x`, `60fps`).
    - When a preset is selected: the card gets a high-contrast border `border-white/25 bg-[#202028]` (or turns fully black with white text in the light theme, as in Nixtio) and reveals a maximum of **1–2 contextual toggles** right inside the card (for example, a `Restore Faces` checkbox for VHS).
- **Bottom block — Hardware Card (like the "Get started" block in Zeno 3.5):**
    - A compact Bento block `p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]`.
    - Shows the user's chip name (`Apple M4 • CoreML FP16`), a green readiness indicator, and a mode switch: `⚡ Max Speed` vs `🔋 Quiet / Eco` (so the laptop doesn't overheat).

### Zone 3: Main Video Workspace Island (`flex-1 rounded-[22px] bg-[var(--bg-canvas)] border border-[var(--border-subtle)] p-4 flex flex-col justify-between`)

1. **Top Bar (`h-10`):**
    - Left: File name (`family_archive_1998.avi`) + duration badge (`04:12`).
    - Right: Segmented switch for target quality (`1080p FHD` | `4K UHD`) and a button to replace the video.
2. **Central Interactive Stage (`flex-1 my-3 relative rounded-2xl overflow-hidden bg-black/60 border border-white/[0.05]`):**
    - **State 1 (Empty State):** A minimalist dashed zone in the center with a soft radial glow when a file is dragged over it (`Drop video here — MP4, MOV, AVI, MKV`).
    - **State 2 (Split-Screen Preview):** The video fills the whole container, preserving its aspect ratio. On top of it — a thin vertical `1px bg-white/80` line with a round handle in the center (`w-8 h-8 rounded-full bg-white text-black shadow-lg flex items-center justify-center` with a `<->` icon). In the left corner a semi-transparent badge `Original (480i)`, in the right — `AI Restored (1080p)`.
    - **Floating Glass Pill (Over the video, bottom center):** A semi-transparent capsule `rounded-full bg-black/65 backdrop-blur-xl border border-white/10 px-3 py-1.5 flex items-center gap-3`:
        - A `Play/Pause` button.
        - A mini-timeline for choosing the moment.
        - **The killer-feature button `⚡Render 3s Preview`** (a white high-contrast capsule inside the glass panel `bg-white text-black px-3 py-1 rounded-full text-xs font-semibold`).
3. **Bottom Telemetry & Export Bar (`h-16 flex items-center justify-between gap-4`):**
    - **Left — 3 telemetry Bento cards (Nixtio style):** Three small tiles side by side (`px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]`):
        - Card 1: `Output` -> **`1920 × 1080`**
        - Card 2: `Frame Rate` -> **`25 → 50 FPS`**
        - Card 3: `Est. Time` -> **`~01m 40s`**
    - **Right — The main action button (Zeno `Install` style):**
        - A large button `h-11 px-6 rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#3B82F6] text-white font-semibold text-[13px] shadow-lg` with the text **`Export Video`**.
        - During export, this zone smoothly transforms into a progress bar with a live counter `42% • 34.2 FPS` and a `Pause / Cancel` button.

---

## 6. Micro-Interactions & Polish

- **Preset Selection:** When a preset is clicked, its border and inner badges highlight smoothly.
- **3s Preview Shimmer:** While the 3-second preview is being generated (takes ~2–4 seconds), a delicate diagonal light sweep (`backdrop-blur-sm` + shimmer gradient) runs across the right half of the split-screen, then instantly dissolves, revealing the sharp image.
- **No Clutter Rule:** No CPU core load graphs, FFmpeg logs, or console windows in front of the user. The technical log is available only via the hotkey `Cmd + L` for developers.
