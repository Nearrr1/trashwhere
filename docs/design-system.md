# TrashWhere — Design System
### Direction B: *Bản Đồ* (Field Guide / Naturalist)

> Version 0.1 · Phase 2 Design Engineering
> Implementation target: Tailwind CSS v4 · Next.js 16 App Router

---

## 0. Philosophy Anchor

Every token and rule in this document derives from one sentence:

> **"This is a naturalist's field guide, carried in your pocket."**

Warm paper. Ink type. Careful observation. Trustworthy classification.
The interface is calm, literate, and precise — never clinical, never playful.

---

## 1. Tailwind v4 CSS Custom Properties

Tailwind v4 uses `@theme` blocks and CSS custom properties. All tokens below are defined in `src/app/globals.css` inside an `@theme inline { }` block, making them available as Tailwind utilities automatically (e.g., `bg-paper`, `text-ink`, `font-serif-display`).

```css
/* src/app/globals.css — full token set */
@import "tailwindcss";

@theme inline {

  /* ── Fonts ───────────────────────────────────────────── */
  --font-serif-display: var(--font-playfair);      /* headings */
  --font-serif-body:    var(--font-source-serif);  /* body / labels */
  --font-sans:          var(--font-geist-sans);    /* UI chrome only */
  --font-mono:          var(--font-geist-mono);    /* confidence number */

  /* ── Color — Neutrals ───────────────────────────────── */
  --color-paper:        #f5f0e8;   /* page background */
  --color-paper-card:   #ede8dc;   /* card / surface */
  --color-paper-rule:   #c8bfaa;   /* hairline borders, dividers */
  --color-paper-hover:  #e5dfd3;   /* hover state on cards */

  --color-ink:          #1c1c1c;   /* primary text */
  --color-ink-secondary:#5c5040;   /* secondary text, captions */
  --color-ink-muted:    #9a8f7c;   /* placeholders, disabled */

  /* ── Color — Brand ──────────────────────────────────── */
  --color-forest:       #1a3a2a;   /* primary action, CTA background */
  --color-forest-hover: #142e21;   /* CTA hover */
  --color-amber:        #c17f3e;   /* confidence stamp, secondary accent */
  --color-amber-light:  #f0e4d0;   /* low-confidence warning background */
  --color-terra:        #c25b3f;   /* hazardous category, destructive */

  /* ── Color — Waste Categories ───────────────────────── */
  /* Applied as: left-border accent on result cards        */
  /* and background tint of the category icon zone         */
  --color-cat-recyclable:      #2e7d52;
  --color-cat-recyclable-tint: #e4ede6;
  --color-cat-organic:         #7a5c2e;
  --color-cat-organic-tint:    #edeae0;
  --color-cat-hazardous:       #c25b3f;
  --color-cat-hazardous-tint:  #f0e4e0;
  --color-cat-electronic:      #3a6078;
  --color-cat-electronic-tint: #e0e8ed;
  --color-cat-general:         #5c5040;
  --color-cat-general-tint:    #eaeae8;
  --color-cat-unknown:         #9a8f7c;
  --color-cat-unknown-tint:    #f0ede4;

  /* ── Spacing ─────────────────────────────────────────── */
  /* Base unit: 4px */
  --spacing-1:  4px;
  --spacing-2:  8px;
  --spacing-3:  12px;
  --spacing-4:  16px;
  --spacing-5:  20px;
  --spacing-6:  24px;
  --spacing-8:  32px;
  --spacing-10: 40px;
  --spacing-12: 48px;
  --spacing-16: 64px;
  --spacing-24: 96px;

  /* ── Typography ─────────────────────────────────────── */
  --text-xs:   11px;
  --text-sm:   13px;
  --text-base: 15px;
  --text-md:   16px;
  --text-lg:   18px;
  --text-xl:   22px;
  --text-2xl:  28px;
  --text-3xl:  36px;

  --leading-tight:   1.2;
  --leading-snug:    1.35;
  --leading-normal:  1.5;
  --leading-relaxed: 1.75;

  --tracking-wide:   0.05em;
  --tracking-wider:  0.10em;
  --tracking-widest: 0.15em;

  /* ── Border Radius ──────────────────────────────────── */
  --radius-none: 0px;
  --radius-sm:   3px;
  --radius-md:   4px;
  --radius-lg:   8px;
  --radius-full: 9999px;

  /* ── Shadows ────────────────────────────────────────── */
  --shadow-card:    0 1px 3px rgba(28,20,12,0.06), 0 1px 2px rgba(28,20,12,0.08);
  --shadow-raised:  0 4px 12px rgba(28,20,12,0.10), 0 2px 4px rgba(28,20,12,0.06);
  --shadow-overlay: 0 8px 32px rgba(28,20,12,0.16), 0 2px 8px rgba(28,20,12,0.08);

  /* ── Motion ─────────────────────────────────────────── */
  --duration-instant: 80ms;
  --duration-fast:    150ms;
  --duration-normal:  250ms;
  --duration-slow:    400ms;
  --ease-out-expo:    cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out:      cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring:      cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

---

## 2. Font Loading (next/font/google)

**Replace** the Geist-only font setup in `layout.tsx` with four fonts. Playfair Display and Source Serif 4 **must** include the `vietnamese` subset.

```ts
// src/app/layout.tsx — font declarations (do not implement yet)
import { Playfair_Display, Source_Serif_4, Geist, Geist_Mono } from 'next/font/google'

const playfair = Playfair_Display({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '700'],
  style: ['normal', 'italic'],
})

const sourceSerif = Source_Serif_4({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-source-serif',
  display: 'swap',
  weight: ['300', '400', '500', '600'],
})

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

// Apply all four variables to <html>:
// className={`${playfair.variable} ${sourceSerif.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
```

> **Why vietnamese subset is required:** Vietnamese diacriticals (ổ, ắ, ệ, ứ, ơ) must render in the design fonts. Without the subset, characters fall back mid-word — breaking typographic intent and undermining legibility.

---

## 3. Typography Scale

| Token | Size | Font | Weight | Leading | Tracking | Use |
|---|---|---|---|---|---|---|
| `display-xl` | 36px | Playfair Display | 700 | 1.2 | — | Category name on result screen |
| `display-lg` | 28px | Playfair Display | 700 | 1.2 | — | Category name, narrow fallback |
| `display-md` | 22px | Playfair Display | 700 | 1.35 | — | Section headers, modal titles |
| `display-sm` | 18px | Playfair Display | 400 italic | 1.35 | — | Taglines, card subtitles |
| `body-lg` | 16px | Source Serif 4 | 400 | 1.75 | — | Long-form explanation text |
| `body-base` | 15px | Source Serif 4 | 400 | 1.75 | — | Main body copy, disposal action |
| `body-sm` | 13px | Source Serif 4 | 400 | 1.5 | — | Captions, metadata |
| `label-lg` | 13px | Source Serif 4 | 500 | 1.5 | 0.10em upper | Section labels (TẠI SAO, CÁCH XỬ LÝ) |
| `label-sm` | 11px | Source Serif 4 | 500 | 1.5 | 0.15em upper | Tag labels, sub-labels |
| `stamp` | 22px | Playfair Display | 700 italic | 1.2 | — | Confidence % badge |
| `ui-label` | 13px | Geist Sans | 500 | 1.5 | 0.05em | Button text, nav labels |
| `mono-data` | 15px | Geist Mono | 400 | 1.5 | tabular-nums | Numeric data |

**Rules:**
1. Never mix Playfair Display and Source Serif 4 in one sentence.
2. Playfair Display italic is reserved for: wordmark, taglines, confidence stamp.
3. All section labels use `label-lg` in `color-ink-secondary`.
4. Minimum body copy size: 15px.
5. Apply `text-pretty` (CSS `text-wrap: pretty`) to explanation paragraphs.

---

## 4. Color System

### Semantic map

| Role | Token | Hex |
|---|---|---|
| Page background | `paper` | `#f5f0e8` |
| Card surface | `paper-card` | `#ede8dc` |
| Rule / border | `paper-rule` | `#c8bfaa` |
| Hover surface | `paper-hover` | `#e5dfd3` |
| Primary text | `ink` | `#1c1c1c` |
| Secondary text | `ink-secondary` | `#5c5040` |
| Muted text | `ink-muted` | `#9a8f7c` |
| Primary action | `forest` | `#1a3a2a` |
| Primary hover | `forest-hover` | `#142e21` |
| Confidence accent | `amber` | `#c17f3e` |
| Low-confidence bg | `amber-light` | `#f0e4d0` |
| Hazardous / danger | `terra` | `#c25b3f` |

### Waste category colour map

| Category | Vietnamese label | Accent | Tint |
|---|---|---|---|
| `recyclable` | Rác tái chế | `#2e7d52` | `#e4ede6` |
| `organic` | Rác hữu cơ | `#7a5c2e` | `#edeae0` |
| `hazardous` | Rác nguy hại | `#c25b3f` | `#f0e4e0` |
| `electronic` | Rác điện tử | `#3a6078` | `#e0e8ed` |
| `general` | Rác thải thông thường | `#5c5040` | `#eaeae8` |
| `unknown` | Không xác định | `#9a8f7c` | `#f0ede4` |

> Category colour is **never** the sole differentiator — label text and icon are always present.

### Contrast compliance

| Pair | Ratio | WCAG level |
|---|---|---|
| `ink` on `paper` | 11.8:1 | AAA |
| `ink-secondary` on `paper` | 5.4:1 | AA |
| `ink-muted` on `paper` | 3.1:1 | AA Large only (≥18px) |
| `paper` on `forest` | 9.6:1 | AAA |
| `amber` on `paper` | 3.2:1 | AA Large only (≥18px bold) |
| `terra` on `paper` | 4.6:1 | AA |

---

## 5. Spacing

Base unit: **4px**. All spacing is a multiple.

```
xs   =  4px  — icon-to-label gap, inline gaps
sm   =  8px  — within-component internal gaps
md   = 12px  — tight component padding
base = 16px  — standard internal padding
lg   = 20px  — page horizontal margin (mobile)
xl   = 24px  — card padding, section gap
2xl  = 32px  — between cards
3xl  = 48px  — section spacing
4xl  = 64px  — hero / top padding
```

**Fixed layout measures:**
- Page max-width: `480px`
- Page horizontal padding: `20px` mobile, `24px` sm+
- Bottom navigation bar height: `64px`
- Camera viewfinder: `100%` wide, `aspect-ratio: 16/10`
- Result card padding: `24px` horizontal, `20px` vertical

---

## 6. Border Radius

| Token | Value | Applied to |
|---|---|---|
| `radius-sm` | 3px | Inputs, inline tags |
| `radius-md` | 4px | **Default** — cards, buttons |
| `radius-lg` | 8px | Bottom sheet, modal |
| `radius-full` | 9999px | Confidence stamp, camera shutter button |

> Never use `rounded-xl` or larger. The field-guide aesthetic uses restrained curvature.

---

## 7. Shadows

| Level | CSS var | When |
|---|---|---|
| `shadow-card` | `--shadow-card` | Default cards, image thumbnails |
| `shadow-raised` | `--shadow-raised` | Focused/hover cards, bottom nav |
| `shadow-overlay` | `--shadow-overlay` | Bottom sheet, toast |

No inset shadows. No `shadow-lg` or Tailwind defaults.

---

## 8. Borders

| Context | Spec |
|---|---|
| Card default | `1px solid paper-rule` |
| Card focused | `1px solid forest` |
| Category left accent | `4px solid [category-accent]` (left side only) |
| Input default | `1px solid paper-rule`, `radius-sm` |
| Input focus | `2px outline forest` (outline, not border — no layout shift) |
| Divider | `1px solid paper-rule`, full width |
| Button primary | None (solid fill) |
| Button secondary | `1px solid forest` |

---

## 9. Iconography

**System:** Lucide Icons — only icon library.

```bash
pnpm add lucide-react
```

Import individually, never the barrel:
```ts
import { Camera, Upload, AlertTriangle, Leaf, Zap, Trash2, HelpCircle, Recycle } from 'lucide-react'
```

### Icon sizes

| Context | Size | Stroke |
|---|---|---|
| Navigation bar | 22px | 1.5px |
| Button leading icon | 18px | 1.5px |
| Inline in body text | 16px | 1.5px |
| Category icon in result | 32px | 1.5px |
| Status / alert | 20px | 2px |
| Empty state | 48px | 1px |

### Category icon map

| Category | Lucide icon |
|---|---|
| `recyclable` | `Recycle` |
| `organic` | `Leaf` |
| `hazardous` | `AlertTriangle` |
| `electronic` | `Zap` |
| `general` | `Trash2` |
| `unknown` | `HelpCircle` |

All category icons: `aria-hidden="true"`. Rendered in category accent colour inside category tint background, 32×32px.

**Botanical corner marks:** Inlined SVGs at 16×16px in `color-ink-muted` for the primary result card. `aria-hidden="true"`, `pointer-events: none`. Files: `/public/icons/botanical-{tl,tr,bl,br}.svg` — created during component implementation.

---

## 10. Motion Principles

```css
/* Required in globals.css */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Motion vocabulary

| Name | Duration | Easing | Used for |
|---|---|---|---|
| Instant | 80ms | linear | Hover colour change, focus ring |
| Fast | 150ms | ease-out | Button press, icon swap |
| Normal | 250ms | `ease-out-expo` | Card entrance, page section |
| Slow | 400ms | `ease-out-expo` | Full result card reveal |
| Drawer | 320ms | `ease-out-expo` | Bottom sheet open/close |
| Stamp | 300ms | `ease-spring` | Confidence stamp landing |

### Motion rules

1. **Result card enters as a whole** — `opacity: 0, translateY: 12px → opacity: 1, translateY: 0` at 400ms. Feels like a page placed on a desk.
2. **Confidence stamp** — `scale(0.7) opacity(0) → scale(1) opacity(1)` at 300ms `ease-spring` — like a rubber stamp.
3. **Page transitions** — `opacity 0→1` at 250ms only. No slide, no scale.
4. **Loading state** — pulse animation (1.5s infinite, 0.5→1 opacity) on the viewfinder frame corners. No spinner.
5. **Educational drawer** — `grid-template-rows: 0fr → 1fr` for smooth auto-height at 320ms.
6. **No looping animations** except the loading pulse.

---

## 11. Responsive Breakpoints

Mobile-first. Designed at 375px. App enforces `max-width: 480px` centred at all viewports — it is a phone app in a browser.

| Name | Min-width | Change |
|---|---|---|
| base | 0px | Single column, 20px margins |
| sm | 640px | 24px margins, centred container |
| md | 768px | Optional: card + image side-by-side |
| lg | 1024px | 480px max-width enforced, centred |

---

## 12. Accessibility Rules

| Requirement | Implementation |
|---|---|
| Colour contrast | Body ≥ 4.5:1; large text ≥ 3:1. See Section 4. |
| Focus visible | `outline: 2px solid forest`, `outline-offset: 2px`. Never `outline: none`. |
| Touch targets | Minimum 44×44px via padding. |
| Category communication | Icon + label + colour. Never colour alone. |
| Confidence | Expressed as: number + verbal label ("Rất tự tin" / "Chưa chắc") + visual. |
| Loading | `aria-live="polite"` region updated at analysis start and completion. |
| Errors | `role="alert"`. Describes problem + actionable step. |
| Language | `<html lang="vi">`. |
| Reduced motion | Full compliance per Section 10. |
| Semantic HTML | `<main>`, `<section aria-labelledby>`, single `<h1>` per page, `<button>` for all actions. |

---

## 13. Component Hierarchy

### shadcn/ui primitives (headless base, fully re-skinned)

| Component | TrashWhere usage |
|---|---|
| `Button` | Primary CTA, secondary upload, retry |
| `Dialog` | Error modal, low-confidence explanation modal |
| `Drawer` | Educational info bottom sheet |
| `Badge` | Category tag |
| `Separator` | Section dividers |

### Domain components (custom)

| Component | File | Boundary |
|---|---|---|
| `ImageUploader` | `src/components/ImageUploader.tsx` | `'use client'` |
| `ClassificationResult` | `src/components/ClassificationResult.tsx` | `'use client'` |
| `ConfidenceStamp` | `src/components/ConfidenceStamp.tsx` | Server or Client |
| `ConfidenceWarning` | `src/components/ConfidenceWarning.tsx` | Server |
| `CategoryIcon` | `src/components/CategoryIcon.tsx` | Server |
| `DisposalCard` | `src/components/DisposalCard.tsx` | Server |
| `EducationalDrawer` | `src/components/EducationalDrawer.tsx` | `'use client'` |
| `ErrorState` | `src/components/ErrorState.tsx` | Server |
| `ViewfinderFrame` | `src/components/ViewfinderFrame.tsx` | `'use client'` |
| `BotanicalCard` | `src/components/BotanicalCard.tsx` | Server |
| `SectionLabel` | `src/components/SectionLabel.tsx` | Server |

### Layout components

| Component | File | Notes |
|---|---|---|
| `AppShell` | `src/components/AppShell.tsx` | `max-w-[480px]`, centred, `paper` bg |
| `PageHeader` | `src/components/PageHeader.tsx` | Wordmark left, action right |
| `BottomNav` | `src/components/BottomNav.tsx` | `'use client'`, active state |

---

## 14. No-Go List

**Prohibited** to preserve direction integrity:

- `rounded-xl`, `rounded-2xl`, `rounded-3xl` — too bubbly
- `bg-gradient-*` — no gradients anywhere
- `shadow-lg`, `shadow-xl`, `shadow-2xl` — use semantic shadow tokens only
- Tailwind default colour utilities (`text-green-500`, `bg-blue-100`) — use design tokens
- `font-mono` for body text — Geist Mono is data-only
- `animate-spin` as loading state
- `ring-*` for focus states — use `outline` for correct clipping
- `opacity-50` on disabled states — minimum `opacity-60` + `cursor-not-allowed`
- `dark:` variants — no dark mode in MVP
- Emoji as content
- Any purple, violet, or generic "AI" colour

---

## 15. Design Tokens as TypeScript

For JS contexts (animation libraries, canvas, dynamic styling):

```ts
// src/lib/design-tokens.ts
export const tokens = {
  color: {
    paper: '#f5f0e8',
    paperCard: '#ede8dc',
    paperRule: '#c8bfaa',
    ink: '#1c1c1c',
    inkSecondary: '#5c5040',
    inkMuted: '#9a8f7c',
    forest: '#1a3a2a',
    amber: '#c17f3e',
    amberLight: '#f0e4d0',
    terra: '#c25b3f',
  },
  category: {
    recyclable: { accent: '#2e7d52', tint: '#e4ede6' },
    organic:    { accent: '#7a5c2e', tint: '#edeae0' },
    hazardous:  { accent: '#c25b3f', tint: '#f0e4e0' },
    electronic: { accent: '#3a6078', tint: '#e0e8ed' },
    general:    { accent: '#5c5040', tint: '#eaeae8' },
    unknown:    { accent: '#9a8f7c', tint: '#f0ede4' },
  },
  duration: {
    instant: 80,
    fast: 150,
    normal: 250,
    slow: 400,
  },
} as const

export type TokenColor = keyof typeof tokens.color
export type TokenCategory = keyof typeof tokens.category
```

> Keep in sync with `globals.css`. A colour change requires updating **both** files.
