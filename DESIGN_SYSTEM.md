# DESIGN_SYSTEM.md — AI Video Upscaler & Restorer
> Aesthetic Paradigm: High-Craft Bento Minimalism (Inspired by Zeno, Hiver, Nixtio, Raycast, Arc Browser)
> Tech Stack Target: Tauri v2 + React + Tailwind CSS + Lucide Icons + Framer Motion

---

## 1. Core Design Philosophy (Правила для AI-генерації коду)

1. **Frame-within-a-Frame (Вкладене полотно):** Додаток НЕ використовує класичні лінії-розділювачі на всю висоту екрана. Зовнішня оболонка вікна (App Shell) має базовий фон і містить навігацію, а головна робоча область (Video Workspace) — це піднятий острів із відступом `8px–12px` від країв вікна, радіусом `20px` та рамкою `1px`.
2. **Monochrome First, Single Accent:** 95% інтерфейсу будується на відтінках чорного, білого та нейтрального сірого (Zinc/Neutral). Кольоровий акцент (Cyan-to-Blue Gradient) дозволений **ВИКЛЮЧНО** для головної кнопки дії (`Export Video`) та індикатора активного рендеру.
3. **Zero Nested Scrollbars:** Додаток працює як фіксований нативний в'юпорт (`h-screen w-screen overflow-hidden select-none`).
4. **Surface Elevation over Shadows:** У темній темі глибина передається не тінями, а висвітленням фону на 3–5% та верхнім внутрішнім бліком рамки (`border-white/[0.07]`).
5. **Squircle Geometry (Правило концентричних радіусів):** Якщо зовнішній контейнер має радіус `R`, а внутрішній відступ (padding) дорівнює `P`, то внутрішня картка завжди має радіус `R - P` (наприклад: зовнішній блок `24px` - padding `8px` = внутрішня картка `16px`).

---

## 2. Color Tokens (Dual Theme: Obsidian Dark & Studio Light)

За замовчуванням використовується **Obsidian Dark** (оптимально для сприйняття контрасту відео). **Studio Light** — альтернативна денна тема у стилі Hiver/Nixtio.

### A. Obsidian Dark Theme (Default — Zeno Style)
| Роль токена | CSS Змінна | HEX / Значення | Tailwind Еквівалент | Де використовується |
| :--- | :--- | :--- | :--- | :--- |
| **App Shell Bg** | `--bg-shell` | `#09090B` | `bg-zinc-950` | Зовнішній фон вікна, лівий Icon Rail та сайдбар пресетів |
| **Workspace Island** | `--bg-canvas` | `#111115` | `bg-[#111115]` | Головне внутрішнє полотно з відеоплеєром |
| **Card / Bento Surface**| `--bg-card` | `#18181D` | `bg-[#18181D]` | Картки пресетів, блоки метрик, віджет GPU в сайдбарі |
| **Card Hover / Active** | `--bg-card-hover`| `#22222A` | `bg-[#22222A]` | Стан наведення на пресет або елемент списку |
| **Glass Surface** | `--bg-glass` | `rgba(255,255,255,0.06)`| `bg-white/[0.06] backdrop-blur-md` | Плаваючі контролери поверх відео (Play, 3s Preview, Zoom) |
| **High-Contrast Block**| `--bg-contrast` | `#FFFFFF` | `bg-white text-zinc-950` | Активні чіпси, другорядна контрастна кнопка (як у Zeno) |
| **Primary Text** | `--text-primary` | `#F4F4F6` | `text-zinc-100` | Заголовки, назви пресетів, активні параметри |
| **Secondary Text** | `--text-secondary`| `#8E8E93` | `text-zinc-400` | Описи пресетів, підписи під іконками |
| **Muted Text** | `--text-muted` | `#52525B` | `text-zinc-600` | Неактивні елементи, технічні підказки |
| **Subtle Border** | `--border-subtle`| `rgba(255,255,255,0.07)`| `border-white/[0.07]` | Усі рамки карток, острова та Bento-блоків |
| **Active Border** | `--border-active`| `rgba(255,255,255,0.22)`| `border-white/20` | Рамка вибраного пресету |

### B. Studio Light Theme (Optional — Nixtio / Hiver Style)
| Роль токена | CSS Змінна | HEX / Значення | Tailwind Еквівалент | Де використовується |
| :--- | :--- | :--- | :--- | :--- |
| **App Shell Bg** | `--bg-shell` | `#F2F3F5` | `bg-[#F2F3F5]` | Матовий світло-сірий фон оболонки вікна та сайдбару |
| **Workspace Island** | `--bg-canvas` | `#FFFFFF` | `bg-white` | Чисто білий острів робочої зони |
| **Card / Bento Surface**| `--bg-card` | `#F8F9FA` | `bg-[#F8F9FA]` | Неактивні картки пресетів та параметрів |
| **High-Contrast Block**| `--bg-contrast` | `#0F0F12` | `bg-[#0F0F12] text-white` | Активна іконка в рейлі, вибраний пресет, Bento-контейнер (Nixtio style) |
| **Primary Text** | `--text-primary` | `#111113` | `text-zinc-900` | Основний текст |
| **Secondary Text** | `--text-secondary`| `#6E6E77` | `text-zinc-500` | Описи та метадані |
| **Subtle Border** | `--border-subtle`| `rgba(0,0,0,0.06)` | `border-black/[0.06]` | Тонкі делікатні лінії розділення |

### C. Brand & Semantic Accents (Спільні для обох тем)
* **Primary CTA Gradient (Zeno Action Button):** `bg-gradient-to-r from-[#38BDF8] to-[#3B82F6]` (Hover: `brightness-110`, Shadow: `shadow-[0_0_24px_-4px_rgba(56,189,248,0.4)]`).
* **AI Processing / Active Pulse:** `#38BDF8` (Sky 400) — для прогрес-бару та повзунка Before/After.
* **Status Online / Hardware Ready:** `#10B981` (Emerald 500) — маленька точка `6px` біля статусу GPU (`Apple Neural Engine Ready`).
* **Warning / Heavy Load:** `#F59E0B` (Amber 500).

---

## 3. Geometry, Spacing & Border Radius

* **Window Outer Padding:** `p-2.5` (`10px`) — відступ від країв нативного вікна ОС до внутрішнього острова.
* **Main Workspace Island Radius:** `rounded-[22px]` (`22px`).
* **Bento Container / Video Frame Radius:** `rounded-2xl` (`16px`).
* **Preset Card / Inner Metric Card Radius:** `rounded-xl` (`12px`).
* **Icon Rail Squircle / Buttons:** `rounded-[10px]` (`10px`) для середніх кнопок або `rounded-full` (капсула) для чіпсів та плаваючого контролера прев'ю.
* **Grid Gap:** `gap-3` (`12px`) між картками в сайдбарі; `gap-2` (`8px`) всередині Bento-метрик.

---

## 4. Typography System

* **UI Sans Font:** `Inter` або `Geist Sans` (системи macOS: `-apple-system, BlinkMacSystemFont`).
  * Вага заголовків: `font-semibold` (`600`), трекінг `tracking-tight` (`-0.02em`).
  * Основний текст UI: `text-[13px] leading-[18px] font-medium` (золотий стандарт нативних macOS додатків — не використовуй гігантський `16px` веб-шрифт для контролів!).
  * Описи карток: `text-[11.5px] leading-[16px] text-[var(--text-secondary)]`.
* **Telemetry & Timecode Mono Font:** `JetBrains Mono` або `Geist Mono` з `tabular-nums` (`font-variant-numeric: tabular-nums`).
  * Використовується для: таймкодів (`00:01:24:12`), FPS (`24 -> 60 FPS`), роздільної здатності (`3840 × 2160`) та таймера рендеру, щоб цифри не «стрибали» під час оновлення.

---

## 5. Layout Architecture (3-Zone App Shell)

Екран поділений на 3 чіткі функціональні зони (зліва направо):

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
* Вміщує місце під системні кнопки macOS («світлофор» `pt-8`) та 3 іконки по центру/верху:
  1. **Enhance (Головна робоча зона)** — активна іконка знаходиться всередині контрастного сквіркла `w-9 h-9 rounded-[10px]` (`bg-white text-black` у темній темі або `bg-[#0F0F12] text-white` у світлій, як у Hiver/Nixtio).
  2. **Batch Queue (Черга файлів)** — з мінімалістичним бейджем кількості відео.
  3. **Settings (внизу рейлу)** — вибір папки збереження та ліміту пам'яті GPU.

### Zone 2: Preset & Hardware Sidebar (`w-[270px] flex flex-col justify-between`)
* **Верхній блок — 4 Пресети («В 2 кліки»):**
  * Жодних складних акордеонів чи 20 повзунків. Чотири вертикальні картки (`p-3.5 rounded-xl border transition-all duration-150`).
  * Кожна картка має: лаконічну іконку зліва у міні-контейнері `w-8 h-8 rounded-lg`, назву (`13px font-semibold`), короткий опис в 1 рядок (`11px text-zinc-400`, напр. *"Deinterlace + Face restore"*) та маленький тег масштабу справа зверху (`2x`, `4x`, `60fps`).
  * Якщо пресет вибрано: картка отримує контрастний бордер `border-white/25 bg-[#202028]` (або стає повністю чорною з білим текстом у світлій темі, як у Nixtio) і відкриває максимум **1–2 контекстні тумблери** прямо всередині картки (наприклад, чекбокс `Restore Faces` для VHS).
* **Нижній блок — Hardware Card (як блок "Get started" у Zeno 3.5):**
  * Компактний Bento-блок `p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]`.
  * Показує назву чіпа користувача (`Apple M4 • CoreML FP16`), зелений індикатор готовності та перемикач режиму: `⚡ Max Speed` vs `🔋 Quiet / Eco` (щоб ноутбук не грівся).

### Zone 3: Main Video Workspace Island (`flex-1 rounded-[22px] bg-[var(--bg-canvas)] border border-[var(--border-subtle)] p-4 flex flex-col justify-between`)
1. **Top Bar (`h-10`):**
   * Зліва: Назва файлу (`family_archive_1998.avi`) + бейдж тривалості (`04:12`).
   * Справа: Сегментований перемикач цільової якості (`1080p FHD` | `4K UHD`) та кнопка заміни відео.
2. **Central Interactive Stage (`flex-1 my-3 relative rounded-2xl overflow-hidden bg-black/60 border border-white/[0.05]`):**
   * **Стан 1 (Empty State):** Мінімалістична пунктирна зона по центру з м'яким радіальним світінням при перетягуванні файлу (`Drop video here — MP4, MOV, AVI, MKV`).
   * **Стан 2 (Split-Screen Preview):** Відео на весь контейнер зі збереженням пропорцій. Поверх нього — вертикальна тонка лінія `1px bg-white/80` з круглою ручкою по центру (`w-8 h-8 rounded-full bg-white text-black shadow-lg flex items-center justify-center` з іконкою `<->`). Зліва в кутку напівпрозорий бейдж `Original (480i)`, справа — `AI Restored (1080p)`.
   * **Floating Glass Pill (Поверх відео знизу по центру):** Напівпрозора капсула `rounded-full bg-black/65 backdrop-blur-xl border border-white/10 px-3 py-1.5 flex items-center gap-3`:
     * Кнопка `Play/Pause`.
     * Міні-таймлайн для вибору моменту.
     * **Кнопка-кілер-фіча `⚡Render 3s Preview`** (біла контрастна капсула всередині скляної панелі `bg-white text-black px-3 py-1 rounded-full text-xs font-semibold`).
3. **Bottom Telemetry & Export Bar (`h-16 flex items-center justify-between gap-4`):**
   * **Зліва — 3 Bento-картки телеметрії (стиль Nixtio):** Три маленькі плашки поруч (`px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]`):
     * Картка 1: `Output` -> **`1920 × 1080`**
     * Картка 2: `Frame Rate` -> **`25 → 50 FPS`**
     * Картка 3: `Est. Time` -> **`~01m 40s`**
   * **Справа — Головна кнопка дії (стиль Zeno `Install`):**
     * Велика кнопка `h-11 px-6 rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#3B82F6] text-white font-semibold text-[13px] shadow-lg` з текстом **`Export Video`**.
     * Під час експорту ця зона плавно трансформується у прогрес-бар із живим лічильником `42% • 34.2 FPS` та кнопкою `Pause / Cancel`.

---

## 6. Micro-Interactions & Polish

* **Preset Selection:** При кліку на пресет рамка та внутрішні бейджі плавно підсвічуються.
* **3s Preview Shimmer:** Поки генерується 3-секундне прев'ю (займає ~2–4 секунди), по правій половині спліт-скріна пробігає делікатний діагональний світловий блік (`backdrop-blur-sm` + shimmer gradient), який миттєво розчиняється, відкриваючи чітку картинку.
* **No Clutter Rule:** Жодних графіків завантаження ядер CPU, логів FFmpeg чи консольних вікон перед очима користувача. Технічний лог доступний лише за хоткеєм `Cmd + L` для розробників.
