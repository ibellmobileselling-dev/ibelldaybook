# IBELL MOBILE Daybook — Design System (Liquid Glass)

Adapted from the Liquid Glass template. Value tags: **(Apple)** = rule from Apple's guidance, keep it; **(default)** = starting value, tunable; **(project)** = decided for this app.

## A. Project facts

| Item | Value |
|---|---|
| Product | IBELL MOBILE Daybook: party ledger, cash book and bank accounts for a mobile-phone shop (PWA) |
| Profile (§1) | Mobile app (consumer, touch) |
| Platform and toolkit | Web: React 19 + Vite 8, plain CSS (no CSS framework), installed as a PWA on phones |
| Browser targets | Evergreen mobile browsers (Android Chrome, iOS Safari 16+); no browserslist set |
| Theme source of truth | `src/styles/tokens.css` (CSS custom properties) |
| Input | Touch first; pointer and keyboard on desktop |
| Hardware floor and blur tier | Mixed shop phones → Tier A (`backdrop-filter`) where supported, Tier B fallback via `@supports` (project, answered 2026-10-02) |
| Data liveness | Live: Firestore `onSnapshot` listeners push updates |
| Accessibility target | WCAG 2.2 AA: 4.5:1 text, 3:1 large text and UI graphics; 7:1 under Increase Contrast (project) |
| Progress file | `DESIGN_PROGRESS.md` |

## 1. Profile values in use (Mobile app)

| Setting | Value |
|---|---|
| Glass budget on screen | 3–5 |
| Motion intensity | Full |
| Release bounce damping | 0.55 |
| Body text | 16 px (min 11 px); no light weights |
| Contrast target | 4.5:1 |
| Touch target | 44 px minimum |
| Live-data motion | Cross-fade + gentle insert |
| Blur tier | A where supported |
| First load | Skeletons |

## 2. Core rules

1. **Two layers.** Content (cards, rows, lists, tables, the cash-book sheet) uses solid tonal surfaces. Glass (top-bar capsules, bottom nav, primary action, sheets, popovers) floats above. No glass in the content layer (Apple).
2. **Glass sparingly**: only the most important functional elements, within the 3–5 budget (Apple).
3. **No glass on glass.** Controls on glass use fills or text, never a second glass layer. When a sheet opens over floating buttons, the buttons are hidden (Apple).
4. **Regular glass only.** No Clear glass: the app shows no full-bleed photos or video under chrome (Apple).
5. **Glass is monochrome.** Labels and icons on glass use `on-surface` / `on-surface-variant`. Tint only the one primary action per surface or a real status, and tint its background (Apple).
6. **Non-interactive items stay off glass.** Screen titles are plain text beside the capsule groups, never inside a glass shape (Apple).
7. **Concentric corners**: inner = outer − padding, min 8 px. Capsules for single actions, rounded rectangles for dense controls (Apple).
8. **No solid bar backgrounds, no dividers under floating chrome**; one soft scroll edge per pane (Apple).
9. **One selection language**: the sliding selection pill for bottom nav, segmented controls and period filters (Apple).
10. **Motion is feedback.** Firestore pushes never bounce or slide; glass controls are springy, content is calm.
11. **Morph, don't pop**: sheets and popovers grow from their source (Apple).
12. **Accessible by construction**: every glass surface has a Reduce Transparency, Increase Contrast and Reduce Motion path.
13. **Never colour alone**: In/Out always carry an arrow icon and a word ("You got", "In", "Out"); balances carry "You'll get / You'll give / Settled".

## 3. Layer map

| Surface | File / component | Layer | Treatment |
|---|---|---|---|
| Top bar (back, actions) | `src/components/TopBar.jsx` | Glass (small) | Capsule groups; title is plain text, not on glass |
| Bottom navigation | `src/components/BottomNav.jsx` | Glass (small) | Glass capsule + sliding selection pill |
| Primary action ("Add party", "New entry", "Add bank") | `Dashboard.jsx`, `CashBook.jsx`, `Accounts.jsx` | Glass, tinted | The one tinted control on screen besides the nav pill |
| Ledger actions ("You gave" / "You got") | `src/pages/PartyLedger.jsx` | Glass, tinted (status) | Two separate capsules; tint = direction (red / green) + arrow icon + word |
| Day Entry footer (totals + Save) | `src/pages/DayEntry.jsx` | Glass (small) | Totals as plain text; Save is the tinted action |
| Balance card, account tiles, party list, entry rows, cash-book sheet, ledger tables, report/settings cards | pages + `App.css` | Content | Tonal surface, 1 px outline-variant, no elevation |
| Count pills, "New party" / "Settled" labels | pages | Content | Tonal wash + text, not pressable |
| Bottom sheets (new party, new entry, transfer, add bank) | `src/components/Sheet.jsx` | Glass (large) | Over 45 % scrim; inner sections tonal |
| Party type-ahead list | `src/components/PartyPicker.jsx` | Glass (large) | Popover that grows from the input |

## 4. Material tokens

### 4.1 Glass recipe

| Layer | Tier B (no blur) | Tier A (`backdrop-filter`) |
|---|---|---|
| Backdrop | none | blur 24 px (small) / 32 px (large) (default) |
| Fill | `surface-container-high` at 88 % (small) / 97 % (large) (default) | `surface` at 62 % (small) / 76 % (large) (default) |
| Ambient colour | Soft green wash on the app background shows through | same |
| Rim | 1 px gradient stroke, top-left white 35 % light / 14 % dark → 0 % (default) | same |
| Shadow | small: 0 6 px 18 px; large: 0 12 px 32 px; tint 18 % light / 40 % dark (default) | same |

- Tinted glass (primary action only): fill blended 35 % toward `primary`, content `on-primary-container` (default).
- Identity: under `prefers-reduced-transparency: reduce` glass becomes opaque `surface-container-high` + 1 px `outline-variant`, no blur, no rim.
- Tier A is applied only inside `@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))`.

### 4.2 Shape: concentric radii

| Container | Radius | Padding | Inner (derived) |
|---|---|---|---|
| Sheets, large panels | 28 | 20 | 8 |
| Content card | 24 | 16 | 8 |
| Section inside a panel | 20 | 12 | 8 |
| Glass capsule group | capsule | 4 | capsule |
| Chips, pills | capsule | — | — |

Inner radii come from `--r-inner: max(8px, calc(var(--r-outer) - var(--pad)))` or `inner()` in `src/design/concentric.js`; never hand-typed.

### 4.3 Colour roles (all text pairs measured ≥ 4.5:1)

| Role | Light | Dark |
|---|---|---|
| `--color-surface` (app bg) | `#f4f5f7` | `#0b0f14` |
| `--color-surface-container-low` | `#fafbfc` | `#10151b` |
| `--color-surface-container` | `#ffffff` | `#141a21` |
| `--color-surface-container-high` | `#f1f3f6` | `#1a2129` |
| `--color-surface-container-highest` | `#e7eaef` | `#222a33` |
| `--color-on-surface` | `#0f172a` | `#e8edf2` |
| `--color-on-surface-variant` | `#4f5b6d` | `#a3b0bf` |
| `--color-outline` | `#8592a3` | `#5d6a79` |
| `--color-outline-variant` | `rgba(15,23,42,.10)` | `rgba(255,255,255,.09)` |
| `--color-primary` | `#0a7d42` (white text 5.2:1) | `#34d08a` |
| `--color-on-primary` | `#ffffff` | `#04210f` |
| `--color-primary-container` | `#d9f2e4` | `#123a27` |
| `--color-on-primary-container` | `#063d20` | `#b9f2d3` |
| `--color-status-success` (money in / you'll get) | `#087a40` | `#3ddc93` |
| `--color-status-urgent` (money out / you'll give) | `#c4343a` | `#ff7d81` |
| `--color-status-urgent-container` | `#fde8e9` | `#3a1719` |
| `--color-status-caution` / container | `#8a4b00` / `#fdf0d5` | `#fbbf24` / `#3a2a0b` |
| `--color-error` | `#c4343a` | `#ff7d81` |

High contrast (`prefers-contrast: more`): `on-surface-variant` = `on-surface`, outline = `on-surface`, status colours darkened (light) / lightened (dark) to ≥ 7:1, glass opaque with a 1.5 px `on-surface` outline, no tinted glass.

### 4.4 Type and spacing

- Font: system UI stack plus Noto Sans Gujarati / Nirmala UI; body 16 px; min 11 px; weights ≥ 500 below 20 px.
- All money, counts and dates: `font-variant-numeric: tabular-nums`.
- Spacing scale (default): 4, 8, 12, 16, 20, 24, 32, 48: `--space-1` … `--space-8`.
- Touch targets ≥ 44 px.

## 5. Motion

| Token | Use | CSS |
|---|---|---|
| `--spring-press` | press-in to 0.96 | 160 ms, critically damped `linear()` curve |
| `--spring-release` | release with one soft bounce (0.55) | 450 ms `linear()` overshoot curve |
| `--spring-select` | selection pill slide | 380 ms `linear()` (damping 0.78) |
| `--spring-morph` | sheets / popovers growing | 420 ms `linear()` (damping 0.82) |
| `--dur-micro` / `--dur-short` / `--dur-medium` / `--dur-long` | tint / fade-through / screen switch / large transform | 120 / 200 / 300 / 380 ms |
| `--ease-emphasized` | — | `cubic-bezier(0.2, 0, 0, 1)` |

Springs are expressed as CSS `linear()` easing curves sampled from the spring equations (mass 1); browsers without `linear()` fall back to `--ease-emphasized`. Under `prefers-reduced-motion: reduce` every spring becomes `--spring-settle` (fade-only, no scale or slide).

Patterns used:
- **A. Press** (glass controls): scale 0.96 on `--spring-press`, release on `--spring-release`, radial glow at the touch point (18 %, ~220 ms). Content rows: 6 % overlay only.
- **B. Tab switch**: nav selection pill slides on `--spring-select`; the incoming screen enters with a shared-axis X shift of 30 px + fade (`--dur-medium`), direction by nav order.
- **C. Layout switch** (cash-book period / account filter): fade-through `--dur-short`.
- **D. First load**: skeleton rows (1.2 s shimmer) until the first snapshot arrives; live updates change in place.
- **F. Popover** (party type-ahead): scales from 0.6 at the input on `--spring-morph`, content fades in after 60 ms.
- **G. Sheets**: scrim fades to 45 %; sheet materializes from the bottom (translate + scale 0.92 → 1, rim and shadow ramp) on `--spring-morph`. Invalid Day Entry rows shake once (360 ms) with an error flash; text-only under Reduce Motion.
- **H. Scroll edge**: soft 24 px gradient under the floating top bar and above the bottom nav, shown only while content scrolls under them.

## 6. Components

- **Glass capsule group**: height 52, padding 4, children 44 (concentric).
- **Selection pill**: one element behind the segments, capsule, `primary` fill, selected label `on-primary`; exposes `aria-selected`/`aria-pressed`; arrow keys move selection.
- **Content card / row**: `surface-container`, 24 radius, 1 px `outline-variant`, no elevation; pressed = 6 % overlay.
- **Large glass panel (sheet)**: large recipe, 28 radius, scrim 45 %.
- **Status chip**: tonal wash + text, never glass, not pressable.

## 7. Layout

- Content scrolls under floating glass inset 12–16 px from the edges; pages pad top and bottom by the chrome height.
- Grouping by spacing; no separator lines between page sections.
- Single column, max width 480 px (phone layout everywhere); wide tables (cash book) scroll horizontally inside their card.

## 8. Accessibility modes (web)

| Mode | Query | Effect |
|---|---|---|
| Reduce transparency | `prefers-reduced-transparency: reduce`; no `backdrop-filter` support | Glass → identity (opaque + outline) |
| Increase contrast | `prefers-contrast: more` | High-contrast roles, opaque glass, 1.5 px outlines, no tinted glass |
| Reduce motion | `prefers-reduced-motion: reduce` | Springs → settle, press scale and glow off, sheets fade only, no shake |
| Large text | browser zoom / font size | Layouts reflow; nothing clipped |

Icon-only buttons carry `aria-label`; focus rings are visible (2 px primary, offset 2).

## 9. Platform notes (Web)

Tokens are CSS custom properties on `:root`, redefined for dark, high contrast and reduced transparency. Glass is one set of classes (`.glass`, `.glass--large`, `.glass--tinted`). Motion values live only in `tokens.css`; `src/design/motion.js` adds the press-glow pointer tracking and reads `prefers-reduced-motion` once. `backdrop-filter` areas are kept small (bars, capsules, sheets) for mobile Safari GPU cost.

## 10. Building blocks

| # | Block | Location |
|---|---|---|
| 1 | Tokens | `src/styles/tokens.css` |
| 2 | Motion | `src/styles/tokens.css` (values) + `src/design/motion.js` |
| 3 | Glass surface | `src/styles/glass.css` |
| 4 | Concentric | `src/design/concentric.js` + `--r-inner` in `tokens.css` |
| 5 | Segmented control | `src/components/SegmentedControl.jsx` |
| 6 | Scroll edge | `src/components/ScrollEdge.jsx` |
| 7 | Skeleton | `src/components/Skeleton.jsx` |
| 8 | Readable | `src/design/contrast.js` |

## 11. Don'ts (check every UI diff)

- [ ] No glass on content: cards, rows, tables, balance card, status chips.
- [ ] No glass on glass.
- [ ] No more than one tinted control per glass surface; no tint for decoration.
- [ ] No status colours on chrome; no colour as the only signal.
- [ ] No motion on Firestore pushes beyond a cross-fade.
- [ ] No bounce on content; no pure alpha fade for glass appearing.
- [ ] No scroll edge where nothing floats.
- [ ] No hard-coded inner radii, colours, durations or springs in screens.
- [ ] No glass surface without its Reduce Transparency, Increase Contrast and Reduce Motion paths.
- [ ] No refraction shaders or lensing.

## 12. Decisions (answered 2026-10-02)

| # | Decision | Answer |
|---|---|---|
| 1 | Blur tier | Tier A where supported, Tier B fallback |
| 2 | New dependencies | None for the design system (CSS-only springs via `linear()`). ExcelJS (MIT) approved for .xlsx export only, loaded on demand |
| 3 | Titles off glass | Top-bar title becomes plain text beside the glass capsules |
| 4 | Party-less entries | Allowed: an entry has a party or a free-text particulars |
| 5 | Transfers | Separate entry type moving money between own accounts |

## 13. Sources

- Apple, Liquid Glass: https://developer.apple.com/documentation/technologyoverviews/liquid-glass, https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass
- Apple HIG (materials, colour, motion, layout, accessibility); WWDC25 219 / 356
- Material 3 colour roles and motion: https://m3.material.io
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
