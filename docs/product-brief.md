# TrashWhere — Product Brief

> Version 0.1 · Science competition project · Vietnamese high-school level

---

## Problem

Vietnamese students frequently discard waste incorrectly — mixing recyclables with organic waste, putting hazardous items into general bins, etc. The root cause is not indifference but a lack of accessible, real-time guidance at the point of disposal. Existing resources (posters, pamphlets) are static and ignored.

---

## Target Users

Primary: Vietnamese high-school students (ages 15–18).  
Secondary: Teachers and competition judges evaluating the demo.

They have smartphones, modest data connections (4G), and limited prior knowledge of formal waste taxonomy.

---

## User Scenario

> Lan finds a used battery on her desk. She opens TrashWhere on her phone, taps **Chụp ảnh**, photographs the battery, and within a few seconds sees:
> - Category: **Rác thải nguy hại**
> - Confidence: **92%**
> - Why: "Pin chứa chất độc hại như chì và axit."
> - What to do: "Mang đến điểm thu gom pin tại trường hoặc siêu thị."

---

## Core Value Proposition

One photo → instant, explainable waste classification → correct disposal action.  
Educational, not just functional: the user learns *why*, not just *what*.

---

## MVP

The smallest shippable version that demonstrates the core loop end-to-end.

| # | Feature | Notes |
|---|---|---|
| 1 | **Upload or capture a photo** | File input + camera capture via `<input type="file" accept="image/*" capture>` |
| 2 | **AI classification** | Calls a server-side Route Handler; returns category + confidence + explanation + disposal action |
| 3 | **Result display** | Shows all four fields clearly; flags low confidence (< 0.6) with a visual warning |
| 4 | **Basic error handling** | Graceful UI for API failures, unsupported file types, oversized files |

**Out of MVP scope:** history, gamification, multi-language toggle, offline mode, accounts.

---

## Post-MVP

Features to add after the MVP is stable and tested.

- **Classification history** — store results locally (localStorage) so a user can review past scans.
- **Educational information panel** — expandable detail on each waste category (environmental impact, statistics).
- **Share result** — native share sheet or copy link.
- **Vietnamese language polish** — full i18n pass; ensure all copy is natural for a high-school student.

---

## Future / Optional

Features that are valuable but not required for the competition.

- Gamification / points system for correct disposal behaviour.
- Teacher dashboard / classroom mode.
- Offline classification (on-device model).
- Multi-item detection (multiple waste items in one photo).
- Integration with local municipal waste calendar / collection points map.

---

## Non-Goals

- This is not a full recycling-management platform.
- No user accounts or cloud sync in MVP.
- No support for non-image inputs (text description, barcode) in MVP.
- No claims of 100% classification accuracy — confidence must always be shown.

---

## Initial Waste Taxonomy

Six canonical categories. All category values must be defined in one place (`src/lib/waste-categories.ts`) and never duplicated.

| ID | Vietnamese label | Examples |
|---|---|---|
| `recyclable` | Rác tái chế | Giấy, nhựa PET, lon nhôm, thuỷ tinh |
| `organic` | Rác hữu cơ | Thức ăn thừa, vỏ trái cây, lá cây |
| `hazardous` | Rác nguy hại | Pin, bóng đèn huỳnh quang, hoá chất |
| `electronic` | Rác điện tử | Điện thoại cũ, dây cáp, phụ kiện |
| `general` | Rác thải thông thường | Bao bì nhiều lớp, tã, cao su |
| `unknown` | Không xác định | Confidence < 0.6 hoặc hình ảnh không rõ |

> The taxonomy may be revised as development proceeds. All changes must be made in the central definition file.

---

## Success Criteria

### MVP done when:
- A user can photograph or upload an image and receive a classification result within 5 seconds on a typical 4G connection.
- All four required fields (category, confidence, explanation, disposal action) are present in every successful response.
- Low-confidence results (< 0.6) are visually distinct and do not present a guess as fact.
- `pnpm lint` and `pnpm build` pass with zero errors.
- The UI is usable on a 375 px wide screen without horizontal scrolling.

### Competition demo done when:
- The end-to-end flow (upload → result) works live without errors.
- A judge unfamiliar with the app can understand the result without explanation.
- Classification accuracy on a 10-item test set is >= 80% at full confidence.

---

## Competition & Demo Considerations

- The demo environment will likely be a phone or laptop with a projector — design for both.
- Judges will value: explainability, real-world usefulness, technical correctness, and polish.
- Prepare 5–10 representative waste photos as fallback if the camera fails.
- The confidence score and explanation are key differentiators — highlight them prominently.
- All on-screen text should be in Vietnamese for the demo audience.

---

## Major Risks & Unknowns

| Risk | Likelihood | Mitigation |
|---|---|---|
| AI model accuracy on Vietnamese household waste | Medium | Evaluate multiple providers; include confidence threshold UI from day one |
| API latency > 5 s on mobile | Medium | Show a loading state; consider result streaming |
| API cost at demo scale | Low | Set request limits; use a test key with a budget cap |
| Final AI model / provider not yet chosen | High (intentional) | Abstract behind a single Route Handler interface so the model can be swapped without changing the UI |
| Image validation bypass | Low | Enforce MIME type + magic-byte check server-side |
| Scope creep before competition | Medium | Strictly enforce MVP boundary; use this brief as the decision filter |
