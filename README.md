# 📼 DeReel

> **Open-source, 100% private AI video restoration & upscaling in 2 clicks.**

DeReel is a modern, privacy-focused desktop application built with **Tauri v2**, **React**, and **Tailwind CSS**. It restores, de-noises, de-interlaces, and upscales vintage and low-resolution video locally on your hardware without cloud reliance.

---

## ✨ Features

* **Side-by-Side 3s Interactive Preview:** Instant split-screen before/after comparison slider before committing to full render.
* **Zero-Disk-Write Pipeline:** Video frames stream entirely via in-memory pipes/buffers between FFmpeg and native GPU inference engines.
* **4 One-Click Presets:**
  * 📼 **VHS / Family Archive:** Hardware deinterlacing (`bwdif`) + artifact removal + face enhancement.
  * 📱 **Old Phone / Low-Res:** Fast 2x/4x artifact-free AI upscaling.
  * ⚡ **Smooth 60 FPS:** AI frame interpolation powered by RIFE.
  * 🎬 **Cartoons / Anime:** Ultra-sharp edge preservation and vector clarity.
* **100% Local & Private:** No subscriptions, no telemetry, no cloud uploads.

---

## 🛠 Tech Stack

- **Desktop Framework:** Tauri v2 (Rust)
- **Frontend:** React 18 / 19, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Video Engine:** Native FFmpeg streaming via pipes
- **Inference:** ncnn-vulkan / CoreML (Apple Silicon) / DirectML (Windows)

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+) or Bun
- Rust & Cargo (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- FFmpeg installed on system

### Development

```bash
# Install frontend dependencies
npm install # or bun install

# Run frontend in browser mode
npm run dev

# Run Tauri desktop app
npm run tauri dev
```

---

## 📄 License & Compliance

All embedded models and architectures adhere to commercially permissive licenses (MIT, Apache-2.0, BSD-3-Clause).
