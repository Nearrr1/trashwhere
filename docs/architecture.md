# TrashWhere — Architecture

> Version 0.1 · MVP scope · Next.js 16 App Router

---

## 1. System Overview

```
Browser (mobile-first)
       │
       │  HTTPS
       ▼
┌─────────────────────────────────┐
│  Next.js 16 (App Router)        │
│                                 │
│  Server Components  (default)   │
│  Client Components  (opt-in)    │
│                                 │
│  app/api/classify/route.ts  ◄───┼── AI provider (server-side only)
└─────────────────────────────────┘
```

Single Next.js process handles both the UI and the API. No separate backend service in MVP. The AI provider is called exclusively from the Route Handler — never from the browser.

---

## 2. Frontend Architecture

### Directory structure (MVP)

```
src/
  app/
    layout.tsx          # Root layout, fonts, global metadata
    page.tsx            # Home — photo capture/upload entry point
    api/
      classify/
        route.ts        # POST /api/classify — AI classification handler
  lib/
    waste-categories.ts # Single source of truth for WasteCategory enum
    schemas.ts          # Zod schemas for request/response validation
  components/
    ImageUploader.tsx   # File input + camera capture ("use client")
    ClassificationResult.tsx  # Displays category, confidence, explanation, disposal
    ConfidenceWarning.tsx     # Shown when confidence < 0.6
    ErrorState.tsx      # Reusable error UI
  types/
    classification.ts   # ClassificationResult, WasteCategory, ApiError types
```

### Component model

- **Server Components by default.** Pages and layout are RSC; they fetch nothing in MVP (no DB yet).
- **Client Components are opt-in.** `ImageUploader` requires browser APIs (`FileReader`, camera). `ClassificationResult` can remain a Server Component if passed data as props from a Server Action, or a Client Component if using `fetch`.
- **No global state library.** A single `useState` in the upload page is sufficient for MVP.

### Data flow (MVP, no DB)

```
User selects image
  → [Client] validate file (type, size)
  → [Client] POST /api/classify  (multipart/form-data)
  → [Server] validate again (MIME + magic bytes)
  → [Server] call AI provider
  → [Server] return ClassificationResult JSON
  → [Client] render result
```

---

## 3. Backend / API Boundary

One Route Handler for MVP:

| Route | Method | Purpose |
|---|---|---|
| `/api/classify` | POST | Receive image, call AI, return ClassificationResult |

**Request:** `multipart/form-data` with one field `image` (file).  
**Response:**
```ts
{
  category: WasteCategory;     // from central enum
  confidence: number;          // 0–1
  explanation: string;         // plain language, Vietnamese
  disposalAction: string;      // specific step
}
```

**Error response:**
```ts
{ error: string; code: 'VALIDATION_ERROR' | 'AI_ERROR' | 'UNKNOWN' }
```

The Route Handler is the only place that holds the AI provider API key. It is read from `process.env` at runtime — never bundled into client JS.

---

## 4. Image Upload Flow

```
[Client: ImageUploader]
  1. User picks file or captures from camera
  2. Client validates: accept="image/*", max size 10 MB
  3. Preview shown immediately (FileReader / URL.createObjectURL)
  4. User confirms → FormData sent to POST /api/classify

[Server: /api/classify]
  5. Read file from FormData
  6. Validate MIME type (allowlist: image/jpeg, image/png, image/webp)
  7. Validate magic bytes (first 4 bytes match known image signatures)
  8. Validate size (reject > 10 MB server-side regardless of client)
  9. Forward to AI provider
  10. Return ClassificationResult or error
```

Client-side validation is UX-only. Server-side validation is authoritative.

---

## 5. Future AI Classification Flow

> Not built in MVP. Documented to inform interface design now.

```
POST /api/classify
  │
  ├── [NOW]   Single AI provider (e.g., Gemini Vision / GPT-4o)
  │           called directly from route.ts
  │
  └── [LATER] Abstracted classifier interface:
              src/lib/classifier.ts
                classifyImage(imageBuffer: Buffer): Promise<ClassificationResult>
              Concrete implementations behind this interface:
                GeminiClassifier, OpenAIClassifier, MockClassifier (for tests)
```

The Route Handler calls `classifyImage()` — not the provider SDK directly. This makes the provider swappable without touching the API contract or the UI.

---

## 6. Future Database Boundary

> Not built in MVP. localStorage is used for classification history post-MVP.

When a database is introduced:

```
src/
  lib/
    db/
      client.ts        # DB client singleton
      history.ts       # insert / query classification history
  app/
    api/
      history/
        route.ts       # GET /api/history, DELETE /api/history/:id
```

The DB client is only ever imported in `app/api/` or `lib/db/`. It must never be imported in a Client Component or page that runs on the client.

---

## 7. Security Considerations

| Concern | Control |
|---|---|
| API key exposure | Read from `process.env` in Route Handler only; never passed to client |
| Malicious file upload | MIME + magic-byte check server-side before AI call |
| Oversized upload | Reject > 10 MB server-side (independent of client check) |
| Client-supplied classification | Never trust — all classification happens server-side |
| Environment secrets | Use `.env.local` locally; CI/hosting environment variables in production |

No authentication in MVP. If added later, protect `/api/classify` with a session check in the Route Handler middleware.

---

## 8. Error Handling

Three failure modes and their handling:

| Failure | Server response | Client display |
|---|---|---|
| Invalid file (type / size / magic) | 400 `VALIDATION_ERROR` | `ErrorState` with actionable message |
| AI provider failure / timeout | 502 `AI_ERROR` | `ErrorState` — do not show partial result |
| Unexpected server error | 500 `UNKNOWN` | `ErrorState` — generic message, no stack trace |

Low confidence (`confidence < 0.6`) is **not** an error — it is a valid result. Display `ConfidenceWarning` alongside the result. Never suppress or hide the result.

Loading state: show a spinner/skeleton immediately after form submission. Target: result visible within 5 s on 4G.

---

## 9. Performance Considerations

| Area | Decision |
|---|---|
| Images | Use `next/image` for all displayed images; original upload is handled as a raw File for the API call |
| JS bundle | Client Components are minimal; no heavy libraries imported client-side |
| Fonts | Geist (already configured via `next/font`); no additional font requests |
| API latency | Streaming response from AI provider is acceptable if latency exceeds 3 s |
| Mobile | Design target: mid-range Android on 4G; test at 375 px viewport width |

Do not optimise prematurely. Measure first with DevTools / Lighthouse before adding complexity.

---

## 10. What Should NOT Be Built Yet

The following are explicitly deferred. Do not implement, scaffold, or stub these in MVP:

| Deferred | Reason |
|---|---|
| Database / ORM | No persistence needed in MVP |
| Authentication / sessions | Out of MVP scope |
| Classification history | Post-MVP |
| Gamification / scoring | Future |
| Separate backend service | Unnecessary complexity; Next.js handles both |
| State management library (Zustand, Redux, etc.) | A single `useState` is sufficient |
| i18n library | Hard-code Vietnamese strings in MVP; extract later |
| Test infrastructure | Set up when first business rule is implemented |
| `src/lib/classifier.ts` abstraction | Build the abstraction when the second AI provider is needed, not before |
| CI/CD pipeline | Configure when ready to deploy for real |
