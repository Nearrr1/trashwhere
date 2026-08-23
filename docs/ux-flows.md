# TrashWhere — UX Flows
### Direction B: *Bản Đồ* (Field Guide / Naturalist)

> Version 0.1 · Phase 2 Design Engineering
> Reference: product-brief.md § User Scenario, architecture.md § Data Flow

---

## Flow Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          TRASHWHERE UX FLOWS                            │
│                                                                         │
│  ENTRY               CAPTURE              ANALYSIS          RESULT      │
│                                                                         │
│  [Home/Scan] ──────► [Viewfinder]  ──────► [Analyzing]  ──► [Result]   │
│       │                   │                                    │        │
│       │              [Upload alt]                          [Try again]  │
│       │                   │                                    │        │
│       └───────────────────┘                            [Edu Drawer ↓]  │
│                                                                         │
│  ERROR PATH                                                             │
│  [Any step] ──────► [Error State] ──────► [Home/Scan]                  │
│                                                                         │
│  LOW CONFIDENCE PATH                                                    │
│  [Analyzing] ──────► [Result] + [Warning Banner] ──► [Try again]       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Flow 1: Core Scan → Result (Happy Path)

This is the primary loop. Every design decision should make this faster.

```
Step 1 ─ ENTRY
  User arrives at the home screen.
  Screen shows: wordmark, tagline, viewfinder zone, capture button.
  Call to action: "Chụp ảnh" (camera) or "Tải lên" (upload link below).

Step 2 ─ CAPTURE (camera)
  User taps "Chụp ảnh".
  → On mobile: triggers <input type="file" accept="image/*" capture="environment">
  → Native camera opens.
  User captures a photo.
  → Returns to app with the selected file.

Step 2b ─ CAPTURE (upload)
  User taps "Tải lên" link.
  → Triggers <input type="file" accept="image/*"> (no capture attribute).
  → File picker opens.
  User selects a file.

Step 3 ─ PREVIEW
  Selected image is shown in the viewfinder area.
    - Rendered via URL.createObjectURL (no upload yet).
    - Image fills viewfinder with object-fit: cover.
    - A "Phân tích" button appears below the preview.
    - A "Chọn lại" ghost link appears below the button.
  User taps "Phân tích".

Step 4 ─ ANALYZING
  FormData is sent to POST /api/classify.
  UI transitions to Analyzing state immediately (no delay):
    - Preview image remains visible.
    - Viewfinder corner marks animate (loading pulse, 1.5s infinite).
    - Text below viewfinder: "Đang phân tích..." in italic Source Serif 4.
    - "Phân tích" button becomes disabled.
  Target: result within 5 s on 4G.

Step 5 ─ RESULT
  API returns ClassificationResult.
  UI transitions to Result screen:
    - Result card fades in + slides up (400ms ease-out-expo).
    - Confidence stamp animates in (300ms ease-spring).
    - All four fields visible: category, confidence, explanation, disposal.
  User reads result.

Step 6 ─ NEXT ACTION
  User can:
  a) Tap "Quét lại" → returns to Step 1, viewfinder cleared.
  b) Tap "Đọc thêm ↓" → opens Educational Drawer (Flow 3).
  c) Use back gesture → same as (a).
```

**Total time target:** Photo → Result in ≤ 5 seconds on 4G mid-range Android.

---

## Flow 2: Error Paths

### 2a — Client validation error (wrong file type or size > 10 MB)

```
User selects file
→ Client checks: MIME type + file size
→ Fails validation
→ Error state appears inline below the file input:
   Icon: AlertTriangle (20px, terra colour)
   Text: "Tệp này không được hỗ trợ. Vui lòng chọn ảnh JPG, PNG hoặc WebP dưới 10 MB."
→ Viewfinder remains empty.
→ No API call is made.
→ User taps "Thử lại" → file input re-triggered.
```

### 2b — API / AI error (500, 502)

```
User submits image
→ POST /api/classify fails
→ Analyzing state is shown for up to 5 s
→ API returns error response ({ error, code })
→ UI transitions to Error State screen:
   Icon: AlertTriangle (48px, terra colour, empty-state size)
   Heading: "Không thể phân tích ảnh"
   Body (by error code):
     AI_ERROR:         "Hệ thống AI đang gặp sự cố. Vui lòng thử lại sau."
     VALIDATION_ERROR: "Ảnh không hợp lệ. Thử chụp lại với ánh sáng tốt hơn."
     UNKNOWN:          "Đã xảy ra lỗi không mong đợi. Vui lòng thử lại."
   CTA button: "Thử lại" → returns to Step 1.
→ Error message is rendered with role="alert".
```

### 2c — Network timeout / no response

```
API call exceeds 10 s (client-side timeout)
→ Abort the fetch
→ Same Error State as 2b, code: UNKNOWN
→ Body: "Kết nối quá chậm. Kiểm tra mạng và thử lại."
```

---

## Flow 3: Low-Confidence Path

Confidence < 0.6 is a **valid result, not an error**. The result is shown, but uncertainty is communicated clearly.

```
Step 5 ─ RESULT (confidence < 0.6)
  Result card appears as normal (400ms entrance).
  Additional elements appear:
  
  [UNCERTAINTY BANNER]
  Appears above the result card.
  Background: amber-light (#f0e4d0)
  Border-left: 4px solid amber (#c17f3e)
  Icon: HelpCircle (20px, amber)
  Text: "Kết quả chưa chắc chắn"
  Sub-text: "Độ chính xác thấp — thử chụp lại với ánh sáng tốt hơn hoặc góc nhìn khác."
  
  [RESULT CARD]
  Category name rendered at 70% opacity (visually dimmed — the only case where opacity is used semantically).
  Confidence stamp: border becomes dashed (--dash pattern: 4px 4px), text in amber.
  Label: "ĐỘ TỰ TIN: Chưa chắc" added below the percentage.
  
  [CTA]
  Below the result: two equal buttons:
  - Primary: "Chụp lại" (forest bg) → returns to Step 1
  - Secondary: "Xem kết quả này" (ghost/outline) → dismisses the banner, shows full result
```

---

## Flow 4: Educational Drawer

Available from any result screen (happy path or low-confidence).

```
Trigger: User taps "Đọc thêm về loại rác này ↓"
→ Bottom drawer slides up (320ms ease-out-expo).
→ Drawer height: auto (up to 80vh), scrollable.
→ Overlay: semi-transparent paper (#f5f0e8 at 60% opacity) behind drawer.

Drawer content:
  ─ [CATEGORY HEADER]
  Category icon (48px) + category name (display-md Playfair)
  
  ─ [ENVIRONMENTAL CONTEXT]
  2–3 sentences about the environmental impact of this waste type.
  Written for a Vietnamese high-school student.
  
  ─ [KEY FACT]
  One bold statistic, e.g.:
  "1 viên pin AA có thể ô nhiễm 500,000 lít nước ngầm."
  Rendered as: normal body text + bold highlighted number.
  
  ─ [DISPOSAL DETAIL]
  Expanded version of the disposal action: where exactly in Vietnam,
  what to look for, what happens after proper disposal.

Dismiss:
  - Tap overlay
  - Swipe down on drawer handle
  - Tap × button top-right of drawer
  → Drawer slides down (320ms ease-out-expo).
```

---

## Flow 5: Navigation Between States

The app is a single page. "Navigation" is state-driven.

```
States:
  SCAN     — viewfinder empty, capture button ready
  PREVIEW  — viewfinder shows selected image, "Phân tích" CTA active
  ANALYZING— viewfinder shows image with loading overlay, CTA disabled
  RESULT   — result card visible, "Quét lại" available
  ERROR    — error state card visible, "Thử lại" CTA

State transitions:
  SCAN     → PREVIEW     : user selects/captures a file
  PREVIEW  → SCAN        : user taps "Chọn lại"
  PREVIEW  → ANALYZING   : user taps "Phân tích"
  ANALYZING→ RESULT      : API returns success
  ANALYZING→ ERROR       : API returns error or timeout
  RESULT   → SCAN        : user taps "Quét lại" or back gesture
  ERROR    → SCAN        : user taps "Thử lại"
  RESULT   → RESULT+DRAWER: user taps "Đọc thêm"
  RESULT+DRAWER → RESULT : user dismisses drawer
```

---

## Flow 6: Navigation Bar Interaction

Bottom nav has three items:

| Tab | Icon | Label | Behaviour |
|---|---|---|---|
| **Quét** | Camera | Active during scan/preview/analyzing/result | Taps during RESULT return to SCAN |
| **Lịch sử** | Clock | Post-MVP | Shows "Sắp ra mắt" toast if tapped in MVP |
| **Tìm hiểu** | BookOpen | Shows category taxonomy | Static page listing all 6 categories |

The active tab indicator is a 2px underline dot below the icon in `forest` colour.

---

## Flow 7: Demo / Projector Flow

Optimised for a live science competition presentation.

```
Pre-demo:
  - Have 5–10 test photos ready in the device gallery.
  - The app should already be open and on the Scan screen.

Demo sequence (30 seconds):
  1. Show scan screen [5 s] — explain what the camera viewfinder does
  2. Upload a pre-prepared photo (battery, plastic bottle) [5 s]
  3. Tap "Phân tích" [1 s]
  4. Wait for result [3–5 s] — narrate what's happening
  5. Point to: category name, confidence %, explanation, disposal action [10 s]
  6. Open Educational Drawer → show environmental context [10 s]
  7. Tap "Quét lại" → ready for next demo item

Projector considerations:
  - paper (#f5f0e8) background reads well on projector (warm, not harsh white)
  - Category name (Playfair Display 36px) is legible from 3m
  - Confidence stamp is large enough to see from audience
  - No dark/night mode — the warm palette is intentionally projector-safe
```

---

## Interaction Details

### File input trigger

The camera/upload interaction uses a hidden `<input>` triggered by a visible `<button>`. This avoids all the styling headaches of native file inputs.

```
<button> (styled "Chụp ảnh") → programmatically calls hiddenInput.click()
<input type="file" accept="image/*" capture="environment" className="sr-only">
```

On desktop: `capture` attribute is ignored, OS file picker opens.
On mobile Chrome/Safari: native camera opens.

### Image preview

Use `URL.createObjectURL(file)` for the preview. Revoke the object URL in a cleanup effect when the component unmounts or a new file is selected.

### Abort controller

Every fetch to `/api/classify` uses an `AbortController`. If the user taps "Chọn lại" during analysis, the in-flight request is aborted.

```ts
const controller = new AbortController()
const response = await fetch('/api/classify', {
  method: 'POST',
  body: formData,
  signal: controller.signal,
})
// On cleanup: controller.abort()
```

### Optimistic loading

Do not wait for the API to show the analyzing state. Transition to ANALYZING immediately on form submission, before the fetch resolves.

---

## Copy Strings (Vietnamese — MVP)

All on-screen strings in Vietnamese. Reference for implementation:

| ID | String |
|---|---|
| `cta.capture` | Chụp ảnh |
| `cta.upload` | hoặc tải lên từ thư viện |
| `cta.analyze` | Phân tích |
| `cta.reselect` | Chọn lại |
| `cta.rescan` | Quét lại |
| `cta.retry` | Thử lại |
| `cta.edu-open` | Đọc thêm về loại rác này |
| `cta.edu-close` | Đóng |
| `cta.view-result` | Xem kết quả này |
| `status.analyzing` | Đang phân tích... |
| `status.low-confidence-title` | Kết quả chưa chắc chắn |
| `status.low-confidence-body` | Độ chính xác thấp — thử chụp lại với ánh sáng tốt hơn hoặc góc nhìn khác. |
| `section.why` | TẠI SAO |
| `section.disposal` | CÁCH XỬ LÝ |
| `section.confidence` | ĐỘ TỰ TIN |
| `confidence.high` | Rất tự tin |
| `confidence.medium` | Khá tự tin |
| `confidence.low` | Chưa chắc chắn |
| `error.ai` | Hệ thống AI đang gặp sự cố. Vui lòng thử lại sau. |
| `error.validation` | Ảnh không hợp lệ. Thử chụp lại với ánh sáng tốt hơn. |
| `error.unknown` | Đã xảy ra lỗi không mong đợi. Vui lòng thử lại. |
| `error.network` | Kết nối quá chậm. Kiểm tra mạng và thử lại. |
| `error.filesize` | Tệp quá lớn. Vui lòng chọn ảnh dưới 10 MB. |
| `error.filetype` | Định dạng không hỗ trợ. Vui lòng chọn ảnh JPG, PNG hoặc WebP. |
| `tagline` | Mỗi vật đều có câu chuyện của nó. |
| `nav.scan` | Quét |
| `nav.history` | Lịch sử |
| `nav.learn` | Tìm hiểu |
