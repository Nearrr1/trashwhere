# TrashWhere — Screen Specifications
### Direction B: *Bản Đồ* (Field Guide / Naturalist)

> Version 0.1 · Phase 2 Design Engineering
> Reference: design-system.md, ux-flows.md, architecture.md

---

## How to read this document

Each screen section defines:
- **Layout:** exact structure, element placement
- **Components:** which design system components are used
- **States:** all visual states this screen can be in
- **Measurements:** pixel-precise sizing and spacing
- **Tokens:** explicit design system token references (no raw hex)
- **Accessibility:** per-screen a11y requirements

All measurements are for the **375px mobile viewport** (base breakpoint). Scaling notes added where behaviour differs at sm/md/lg.

---

## Screen 0 — App Shell

This wraps every screen. Defined once.

```
┌─────────────────────────────── 375px ───────────────────────────────┐
│                                                                     │
│  ┌─ PageHeader ──────────────────────────────────────────────────┐  │
│  │  TrashWhere (italic)               [? icon, 22px]            │  │
│  │  20px left · 20px right · 52px height · forest bg            │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ Main content area ────────────────────────────────────────────┐  │
│  │  bg: paper (#f5f0e8)                                          │  │
│  │  padding-x: 20px                                              │  │
│  │  padding-bottom: 80px (room for bottom nav)                   │  │
│  │  flex-col, gap: 0                                             │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ BottomNav ─────────────────────────────────────────────────┐   │
│  │  bg: paper-card · shadow-raised · h: 64px                   │   │
│  │  [Quét]    [Lịch sử]    [Tìm hiểu]                          │   │
│  │  22px icons · ui-label text · forest active dot             │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### PageHeader

| Property | Value |
|---|---|
| Height | 52px |
| Background | `forest` (#1a3a2a) |
| Wordmark | "TrashWhere" · Playfair Display 400 italic · 18px · `paper` colour |
| Right action | `HelpCircle` icon · 22px · `paper` at 80% opacity · 44×44px touch target |
| Padding | 20px left, 16px right |
| Border-bottom | 1px solid `forest-hover` |

### BottomNav

| Property | Value |
|---|---|
| Height | 64px (fixed, `position: fixed; bottom: 0`) |
| Background | `paper-card` |
| Shadow | `shadow-raised` |
| Safe area | `padding-bottom: env(safe-area-inset-bottom)` |
| Active indicator | 2px dot below icon, `forest` colour, 6px diameter |
| Icon size | 22px · stroke 1.5px |
| Label | `ui-label` (Geist Sans 13px, 500) · `ink-secondary` inactive · `forest` active |
| Tab spacing | Three equal columns (flex: 1 each) |

---

## Screen 1 — Scan (SCAN state)

The home screen. Entry point. Camera or upload.

```
┌────────────────── 375px ──────────────────┐
│ [PageHeader]                              │
│                                           │
│  ┌─ ViewfinderFrame ──────────────────┐   │
│  │                                    │   │
│  │   [L-corner marks, forest, 20px]   │   │
│  │                                    │   │
│  │        [camera icon, 32px,         │   │
│  │         forest, opacity 40%]       │   │
│  │                                    │   │
│  │   [L-corner marks, forest, 20px]   │   │
│  │                                    │   │
│  └────────────────────────────────────┘   │
│  aspect: 16/10 · full width · bg: paper-card   │
│                                           │
│  [Tagline]                                │
│  "Mỗi vật đều có câu chuyện của nó."     │
│  Source Serif 4 · 14px · italic ·        │
│  ink-secondary · center · mt: 16px       │
│                                           │
│  ┌─────────────────────────────────────┐  │
│  │         Chụp ảnh                   │  │
│  │  [Camera 18px icon]                 │  │
│  │  forest bg · paper text · 56px h   │  │
│  │  radius-md · full width             │  │
│  └─────────────────────────────────────┘  │
│  mt: 20px                                 │
│                                           │
│  hoặc tải lên từ thư viện               │
│  Source Serif 4 · 13px · forest · center  │
│  underline · mt: 12px · 44px touch area  │
│                                           │
│ [BottomNav]                               │
└───────────────────────────────────────────┘
```

### ViewfinderFrame (SCAN state)

| Property | Value |
|---|---|
| Background | `paper-card` |
| Corner marks | L-shaped SVG, 20px each leg, 2px stroke, `forest` colour |
| Corner mark offset | 12px from edge |
| Center icon | `Camera` Lucide, 32px, `forest` at 40% opacity |
| Border | none (corner marks define the frame visually) |
| Radius | 0 (viewfinder is full-bleed, no rounding) |

### Capture Button

| Property | Value |
|---|---|
| Height | 56px |
| Background | `forest` |
| Hover | `forest-hover` |
| Text | "Chụp ảnh" · Geist Sans 500 · 15px · `paper` |
| Leading icon | `Camera` 18px, `paper`, 8px gap |
| Radius | `radius-md` (4px) |
| Focus | 2px `forest` outline, 2px offset (visible on paper bg as a darker green) |

---

## Screen 2 — Preview (PREVIEW state)

User has selected an image. Confirming before analysis.

```
┌────────────────── 375px ──────────────────┐
│ [PageHeader]                              │
│                                           │
│  ┌─ ViewfinderFrame (preview) ─────────┐  │
│  │  ┌──────────────────────────────┐   │  │
│  │  │   [selected image]           │   │  │
│  │  │   object-fit: cover          │   │  │
│  │  │   w: 100%, h: 100%           │   │  │
│  │  └──────────────────────────────┘   │  │
│  │  Corner marks animate              │  │  
│  └──────────────────────────────────────┘  │
│  aspect: 16/10                             │
│                                           │
│  Phân tích                                │
│  [primary button, full-width, mt: 20px]   │
│  [Analyze icon 18px OR Leaf 18px leading] │
│                                           │
│  Chọn lại                                 │
│  [ghost/text button, center, mt: 12px]    │
│  forest colour · no border · 44px touch   │
│                                           │
│ [BottomNav]                               │
└───────────────────────────────────────────┘
```

### Image Preview

| Property | Value |
|---|---|
| Source | `URL.createObjectURL(file)` |
| Fit | `object-fit: cover` |
| Alt | "Ảnh đã chọn để phân tích" |
| Revoke | On unmount or file reselect |

### "Chọn lại" button

| Property | Value |
|---|---|
| Style | Text-only (no border, no fill) |
| Text | "Chọn lại" · Source Serif 4 · 14px · `forest` |
| Touch target | 44×44px min via padding |

---

## Screen 3 — Analyzing (ANALYZING state)

In-flight API call. Optimistic — shown immediately on submit.

```
┌────────────────── 375px ──────────────────┐
│ [PageHeader]                              │
│                                           │
│  ┌─ ViewfinderFrame (loading) ─────────┐  │
│  │  ┌──────────────────────────────┐   │  │
│  │  │   [selected image]           │   │  │
│  │  │   opacity: 85%               │   │  │
│  │  └──────────────────────────────┘   │  │
│  │  Corner marks: pulse animation     │  │
│  └──────────────────────────────────────┘  │
│  aspect: 16/10                             │
│                                           │
│  Đang phân tích...                        │
│  Source Serif 4 · 15px · italic ·         │
│  ink-secondary · center · mt: 16px        │
│  Text cycles: "Đang phân tích" →          │
│  "Đang phân tích." → "Đang phân tích.."  │
│  → "Đang phân tích..." (1s interval)      │
│                                           │
│  [Primary button: disabled, 70% opacity]  │
│  "Phân tích" · cursor: not-allowed        │
│                                           │
│ [BottomNav]                               │
└───────────────────────────────────────────┘
```

### Loading animation spec

```css
/* Corner mark pulse — CSS only, no JS */
@keyframes viewfinder-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.viewfinder-corner-mark {
  animation: viewfinder-pulse 1.5s ease-in-out infinite;
}

/* Stagger the 4 corners slightly for a more organic feel */
.viewfinder-corner-mark:nth-child(2) { animation-delay: 0.2s; }
.viewfinder-corner-mark:nth-child(3) { animation-delay: 0.1s; }
.viewfinder-corner-mark:nth-child(4) { animation-delay: 0.3s; }
```

### Accessibility (analyzing state)

```html
<div aria-live="polite" aria-label="Trạng thái phân tích">
  Đang phân tích...
</div>
```

---

## Screen 4 — Classification Result (RESULT state)

The core payoff screen. Must communicate all four required fields immediately.

```
┌────────────────── 375px ──────────────────┐
│ [PageHeader]                              │
│                                           │
│  ┌─ Specimen image ─────────────────────┐  │
│  │  [user photo, 80px height, card]     │  │
│  │  object-fit: cover · radius-sm       │  │
│  │  shadow-card · full width · mt: 16px │  │
│  └──────────────────────────────────────┘  │
│                                           │
│  ┌─ BotanicalCard ──────────────────────┐  │
│  │ [botanical-tl svg]  [botanical-tr]   │  │
│  │                                      │  │
│  │  ┌─ Category zone (tint bg) ───────┐  │  │
│  │  │ 4px left border: category accent │  │
│  │  │ bg: category-tint               │  │
│  │  │ padding: 16px 20px              │  │
│  │  │                                  │  │
│  │  │  [CategoryIcon 32px]   [Stamp]  │  │
│  │  │  icon in accent colour  ┌──────┐│  │
│  │  │                         │  92% ││  │
│  │  │  RÁC NGUY HẠI           │amber ││  │
│  │  │  Playfair 700 · 28px    └──────┘│  │
│  │  │  ink colour             stamp   │  │
│  │  └──────────────────────────────────┘  │
│  │                                      │  │
│  │  [Separator — paper-rule · my: 20px] │  │
│  │                                      │  │
│  │  TẠI SAO                             │  │
│  │  label-lg · ink-secondary · mb: 8px  │  │
│  │                                      │  │
│  │  Pin chứa các kim loại nặng như...   │  │
│  │  body-base · ink · text-pretty       │  │
│  │                                      │  │
│  │  [Separator · my: 20px]              │  │
│  │                                      │  │
│  │  CÁCH XỬ LÝ                          │  │
│  │  label-lg · ink-secondary · mb: 8px  │  │
│  │                                      │  │
│  │  Mang đến điểm thu gom pin...        │  │
│  │  body-base · ink · text-pretty       │  │
│  │                                      │  │
│  │ [botanical-bl svg]  [botanical-br]   │  │
│  └──────────────────────────────────────┘  │
│  mt: 16px · mb: 20px                       │
│                                           │
│  ┌─ Edu trigger ────────────────────────┐  │
│  │  Đọc thêm về loại rác này            │  │
│  │  Source Serif 4 · 14px · forest      │  │
│  │  ChevronDown icon right · 44px touch │  │
│  └──────────────────────────────────────┘  │
│                                           │
│  [Quét lại button — secondary, full-width] │
│  outline: 1px forest · forest text        │
│  mt: 12px · mb: 32px                      │
│                                           │
│ [BottomNav]                               │
└───────────────────────────────────────────┘
```

### BotanicalCard

A server component that wraps its `children` with:
- `border: 1px solid paper-rule`
- `border-radius: radius-md` (4px)
- `box-shadow: shadow-card`
- `background: paper-card`
- `position: relative` (for absolute-positioned corner SVGs)

Four botanical SVGs at absolute corners: `top: -1px; left: -1px` (TL), etc.

### Category Zone

| Property | Value |
|---|---|
| Background | `cat-[category]-tint` CSS var |
| Left border | `4px solid cat-[category]-accent` |
| Padding | 16px top/bottom, 20px left/right |
| Border radius | `radius-md` top corners only (if it's inside a card) |

### Confidence Stamp

```
┌─────────────┐
│    92%      │  ← Playfair Display 700 italic 22px, amber
│  Rất tự tin │  ← Source Serif 4 400 10px, amber, uppercase
└─────────────┘
```

| Property | Value |
|---|---|
| Shape | Circle (width: 72px, height: 72px, `radius-full`) |
| Border | 2px solid `amber` |
| Background | transparent |
| Text — percentage | Playfair Display 700 italic 22px, `amber` |
| Text — verbal label | Source Serif 4 400 10px, `amber`, uppercase, letter-spacing |
| Alignment | Flex column, centered |
| Entrance animation | `scale(0.7) opacity(0) → scale(1) opacity(1)` at 300ms `ease-spring` |
| Position | Right side of category zone, vertically centred |

### Verbal confidence labels

| Confidence | Label |
|---|---|
| ≥ 0.85 | Rất tự tin |
| ≥ 0.60 | Khá tự tin |
| < 0.60 | Chưa chắc chắn |

### Specimen image strip

| Property | Value |
|---|---|
| Height | 80px |
| Width | 100% (full bleed within content padding) |
| Fit | `object-fit: cover` |
| Radius | `radius-sm` (3px) |
| Shadow | `shadow-card` |
| Alt | "Ảnh đã tải lên để phân loại" |
| Margin | 16px top |

### Result card entrance animation

```css
@keyframes result-enter {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.result-card {
  animation: result-enter 400ms var(--ease-out-expo) forwards;
}
```

### Accessibility

```html
<!-- aria-live region updated when result arrives -->
<div aria-live="polite" aria-atomic="true">
  <h1>Rác nguy hại</h1>
  <p>Độ tự tin: 92% — Rất tự tin</p>
</div>

<!-- Section labels use heading structure for screen readers -->
<section aria-labelledby="why-label">
  <h2 id="why-label" class="label-lg">Tại sao</h2>
  <p>Pin chứa...</p>
</section>
```

---

## Screen 5 — Low-Confidence Result

Extends Screen 4. All Screen 4 elements present, plus:

```
┌────────────────── 375px ──────────────────┐
│ [PageHeader]                              │
│                                           │
│  ┌─ Uncertainty Banner ─────────────────┐  │
│  │ bg: amber-light (#f0e4d0)            │  │
│  │ border-left: 4px solid amber         │  │
│  │ radius-md · padding: 12px 16px       │  │
│  │ mt: 16px                             │  │
│  │                                      │  │
│  │  [HelpCircle 20px, amber]            │  │
│  │  Kết quả chưa chắc chắn             │  │
│  │  Source Serif 4 · 14px · 500 · amber │  │
│  │                                      │  │
│  │  Độ chính xác thấp — thử chụp lại   │  │
│  │  với ánh sáng tốt hơn.              │  │
│  │  Source Serif 4 · 13px · ink-secondary│ │
│  └──────────────────────────────────────┘  │
│                                           │
│  ┌─ BotanicalCard (dimmed) ─────────────┐  │
│  │  Category zone:                      │  │
│  │    - Category name: opacity 70%      │  │
│  │    - Stamp border: dashed 2px amber  │  │
│  │    - Stamp label: "Chưa chắc chắn"  │  │
│  │                                      │  │
│  │  [Explanation and disposal — normal] │  │
│  └──────────────────────────────────────┘  │
│                                           │
│  ┌─ Two-button CTA row ─────────────────┐  │
│  │  [Chụp lại]  forest bg · 48%         │  │
│  │  [Xem kết quả này]  outline · 48%   │  │
│  │  gap: 8px · mt: 16px                │  │
│  └──────────────────────────────────────┘  │
│                                           │
│ [BottomNav]                               │
└───────────────────────────────────────────┘
```

### Uncertainty Banner

| Property | Value |
|---|---|
| Background | `amber-light` (#f0e4d0) |
| Left border | 4px solid `amber` |
| Radius | `radius-md` |
| Padding | 12px top/bottom, 16px left/right |
| Icon | `HelpCircle` 20px, `amber` colour |
| Heading | Source Serif 4 500, 14px, `amber` |
| Body | Source Serif 4 400, 13px, `ink-secondary` |
| ARIA | `role="status"` (informational, not critical) |

### Two-button CTA layout

- Container: `display: flex; gap: 8px;`
- "Chụp lại": `flex: 1`, primary style (`forest` bg)
- "Xem kết quả này": `flex: 1`, secondary style (outline `forest`)
- Both: 48px height, `radius-md`

---

## Screen 6 — Error State

Full-screen error. Replaces main content, not an overlay.

```
┌────────────────── 375px ──────────────────┐
│ [PageHeader]                              │
│                                           │
│                                           │
│  (centred column, padding: 48px 20px)     │
│                                           │
│  [AlertTriangle icon]                     │
│  48px · 1px stroke · terra (#c25b3f)      │
│  mb: 20px                                 │
│                                           │
│  Không thể phân tích ảnh                 │
│  Playfair Display 700 · 22px · ink        │
│  center · mb: 12px                        │
│                                           │
│  [Error body — dynamic by error code]     │
│  Source Serif 4 · 15px · ink-secondary    │
│  center · max-w: 280px · text-pretty      │
│  mb: 32px                                 │
│                                           │
│  ┌─────────────────────────────────────┐  │
│  │            Thử lại                 │  │
│  │  forest bg · full width · 56px     │  │
│  └─────────────────────────────────────┘  │
│                                           │
│                                           │
│ [BottomNav]                               │
└───────────────────────────────────────────┘
```

| Property | Value |
|---|---|
| Layout | Flex column, centred both axes, takes full available height |
| Icon | `AlertTriangle` 48px, 1px stroke, `terra` |
| Title | Playfair Display 700 22px `ink` |
| Body | Source Serif 4 400 15px `ink-secondary`, max 280px |
| CTA | Same as primary capture button |
| ARIA | `role="alert"` on the entire error section |

---

## Screen 7 — Educational Drawer

Slides up from bottom. Not a separate screen — a drawer over Screen 4.

```
┌────────────────── 375px ──────────────────┐
│ [Screen 4 — dimmed overlay 60% paper]     │
│                                           │
│  ┌─ Bottom Drawer ──────────────────────┐  │
│  │ bg: paper-card                       │  │
│  │ border-radius: radius-lg (top 2)     │  │
│  │ shadow-overlay                       │  │
│  │ max-height: 80vh · overflow-y: auto  │  │
│  │                                      │  │
│  │  ─ Drag handle ─                     │  │
│  │  32px × 4px · paper-rule · radius-full│  │
│  │  centered · mt: 12px · mb: 20px     │  │
│  │                                      │  │
│  │  [CategoryIcon 48px] RÁC NGUY HẠI   │  │
│  │  icon: accent colour                 │  │
│  │  name: Playfair 700 22px ink         │  │
│  │  display: flex, gap: 12px, align-center │
│  │  mb: 20px · px: 24px                │  │
│  │                                      │  │
│  │  [Separator]                         │  │
│  │                                      │  │
│  │  TÁC ĐỘNG MÔI TRƯỜNG                │  │
│  │  label-lg · ink-secondary            │  │
│  │  mt: 20px · mb: 8px · px: 24px      │  │
│  │                                      │  │
│  │  Pin chứa chì, cadmium, và thủy     │  │
│  │  ngân — những kim loại độc hại...   │  │
│  │  body-base · ink · px: 24px         │  │
│  │  text-pretty                         │  │
│  │                                      │  │
│  │  ┌─ Key Fact block ───────────────┐  │  │
│  │  │ bg: amber-light · radius-md    │  │  │
│  │  │ padding: 16px · mx: 24px       │  │  │
│  │  │ my: 16px                       │  │  │
│  │  │                                │  │  │
│  │  │ "1 viên pin AA có thể          │  │  │
│  │  │  ô nhiễm 500.000 lít           │  │  │
│  │  │  nước ngầm."                   │  │  │
│  │  │  body-base · ink               │  │  │
│  │  │  Bold: the number              │  │  │
│  │  └────────────────────────────────┘  │  │
│  │                                      │  │
│  │  XỬ LÝ ĐÚNG CÁCH                   │  │
│  │  label-lg · ink-secondary · mt: 20px│  │
│  │  px: 24px · mb: 8px                │  │
│  │                                      │  │
│  │  Mang pin đến các điểm thu gom...   │  │
│  │  body-base · ink · px: 24px         │  │
│  │  mb: 32px                            │  │
│  └──────────────────────────────────────┘  │
└───────────────────────────────────────────┘
```

### Drawer animation

```css
/* Open: translate from 100% to 0% */
@keyframes drawer-open {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}

.drawer {
  animation: drawer-open 320ms var(--ease-out-expo) forwards;
}

/* Close: reverse, handled via JS class toggle */
```

### Key Fact block

| Property | Value |
|---|---|
| Background | `amber-light` |
| Radius | `radius-md` |
| Padding | 16px |
| Text | Source Serif 4 400 15px `ink` |
| Bold text | Source Serif 4 600 — applied to the statistic number |
| Margin | 16px top/bottom, 24px horizontal |

### Accessibility

```html
<div role="dialog" aria-modal="true" aria-labelledby="drawer-title">
  <h2 id="drawer-title">Rác nguy hại</h2>
  ...
  <button aria-label="Đóng">×</button>
</div>
```

Focus trap inside drawer while open. On close, return focus to the "Đọc thêm" trigger.

---

## Screen 8 — "Tìm hiểu" Static Page (MVP scope)

Simple taxonomy reference. Not the educational drawer — a full page.

```
┌────────────────── 375px ──────────────────┐
│ [PageHeader — "Tìm hiểu"]                 │
│                                           │
│  Các loại rác thải                       │
│  Playfair Display 700 · 28px · mt: 24px  │
│  ink · px: 20px                          │
│                                           │
│  ┌─ Category List ────────────────────┐   │
│  │                                    │   │
│  │  ┌─ [CategoryIcon 32px]  ────────┐ │   │
│  │  │  bg: cat-tint · radius-md     │ │   │
│  │  │  border-left: 4px cat-accent  │ │   │
│  │  │  padding: 16px 20px           │ │   │
│  │  │  mb: 8px                      │ │   │
│  │  │                               │ │   │
│  │  │  [icon 32px]  Rác tái chế    │ │   │
│  │  │               Playfair 700 18px│ │   │
│  │  │               ink             │ │   │
│  │  │               mt: 4px         │ │   │
│  │  │  Giấy, nhựa PET, lon nhôm...  │ │   │
│  │  │  Source Serif 4 13px          │ │   │
│  │  │  ink-secondary                │ │   │
│  │  └───────────────────────────────┘ │   │
│  │                                    │   │
│  │  (repeated for all 6 categories)   │   │
│  └────────────────────────────────────┘   │
│  px: 20px · pb: 32px                      │
│                                           │
│ [BottomNav]                               │
└───────────────────────────────────────────┘
```

---

## Responsive Behaviour

### 640px (sm) and above

- Container centred with `max-w-[480px] mx-auto`
- Page horizontal padding increases to 24px
- No layout changes — the app is intentionally phone-proportioned

### 768px (md) — tablet

- Specimen image increases from 80px to 120px height
- Result card and specimen image may sit side-by-side if horizontal space allows (optional enhancement — not required for MVP)
- Bottom nav becomes a side nav if implementing tablet layout (post-MVP)

### 1024px (lg) — desktop

- Same as sm/md but the page floats centred in the browser, surrounded by `paper` background
- A subtle centred column shadow (`shadow-overlay`) distinguishes the app column from the surrounding page

---

## Interaction States Summary

| Component | Default | Hover | Focus | Active/Press | Disabled |
|---|---|---|---|---|---|
| Button primary | forest bg | forest-hover bg | forest outline 2px | darken 10% | opacity-60, cursor-not-allowed |
| Button secondary | transparent + forest border | paper-hover bg | forest outline 2px | forest bg + paper text | opacity-60, cursor-not-allowed |
| Text link | forest, underline | forest-hover | forest outline 2px | darken | ink-muted, no underline |
| Card | shadow-card | shadow-raised, paper-hover bg | forest border 1px | — | — |
| Nav item | ink-muted | ink-secondary | forest outline 2px | forest + active dot | — |
| Input | paper-rule border | paper-rule border | forest outline 2px | paper-rule border | paper-hover bg, ink-muted text |

---

## Z-Index Scale

| Layer | z-index | Used for |
|---|---|---|
| Base | 0 | Page content |
| Raised | 10 | Cards in hover state |
| Nav | 20 | Bottom navigation bar |
| Drawer overlay | 30 | Semi-transparent overlay behind drawer |
| Drawer | 40 | Educational drawer |
| Toast | 50 | Transient notifications (post-MVP) |

---

## Performance Targets per Screen

| Screen | FCP target | LCP target | JS weight |
|---|---|---|---|
| Scan | < 1.5s | < 2s | Minimal (only ImageUploader client component) |
| Analyzing | — | — | Same as Scan |
| Result | — | < 100ms from API response | ClassificationResult render |
| Error | — | — | Same as Scan |
| Tìm hiểu | < 1.5s | < 2s | Zero (fully Server Component) |

The "Tìm hiểu" page is a fully static Server Component with no client JS. The scan + result flow keeps client JS to a single component: `ImageUploader`.
