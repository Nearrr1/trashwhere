# TrashWhere — Intelligent Waste Classification

**TrashWhere** is an educational waste-classification web application built for Vietnamese high-school students, designed for a national science & engineering competition.

Snap a photo or upload an image of an object → TrashWhere analyzes the item, classifies the waste category, explains the rationale, and provides actionable disposal guidance tailored to Vietnamese standards.

---

## Key Features

- **AI-Powered Classification (Gemini Vision)** — Accurately identifies 6 canonical waste categories: recyclable, organic, hazardous, electronic, general, and unknown.
- **Confidence Scoring** — Displays model certainty with a dedicated stamp; automatically warns users when confidence is low (< 0.6).
- **Educational Explanations** — Highlights material composition and classification reasons in plain Vietnamese suitable for high-school students.
- **Actionable Disposal Guidance** — Provides concrete, safe disposal instructions tailored to school and home environments in Vietnam.
- **Interactive Disposal Checklist** — Step-by-step interactive checklist to guide users through disposal actions.
- **Optional Google Authentication** — Seamless sign-in via NextAuth v5 to persist cloud scan history.
- **Cross-Device Cloud History (MongoDB Atlas)** — Access and manage scan history across desktop and mobile devices.
- **Classification Feedback** — Non-blocking user feedback loop allowing students to verify accuracy or suggest corrections.
- **Anonymous Scanning** — Full scanning and classification features work 100% without requiring an account.

---

## Tech Stack

| Technology | Version | Description |
|---|---|---|
| Next.js | 16.3.1 | App Router, Turbopack, Server Components |
| React | 19 | Frontend UI library |
| TypeScript | 5 (`strict: true`) | Static typing and domain modeling |
| Tailwind CSS | 4 | Design tokens and utility styling |
| NextAuth (Auth.js) | 5.0.0-beta.32 | JWT encrypted session cookies, Google OAuth |
| MongoDB | 7 | MongoDB Atlas cloud driver and query engine |
| Google Gemini | @google/genai ^2 | Gemini Vision structured multimodal classification |
| Vitest | 4 | Unit and integration test runner |

---

## Environment Setup

### 1. Clone & Copy Environment Variables

```bash
cp .env.example .env.local
```

### 2. Configure `.env.local`

| Variable | Description | Required |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API Key | ✅ Required |
| `GEMINI_MODEL` | Primary Gemini model identifier (default: `gemini-3.5-flash`) | Optional |
| `AUTH_SECRET` | Secret key for encrypting NextAuth session cookies (min 32 chars) | ✅ For Google Login |
| `GOOGLE_CLIENT_ID` | Google Cloud OAuth Client ID | ✅ For Google Login |
| `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth Client Secret | ✅ For Google Login |
| `MONGODB_URI` | MongoDB Atlas Connection URI | ✅ For Cloud Scan History |
| `MONGODB_DB` | Target database name (default: `trashwhere`) | Optional |

> **Security Note:** Never commit `.env.local` or any secrets to version control. The repository's `.gitignore` automatically excludes all `.env*` files except `.env.example`.

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Google OAuth Configuration

1. Visit the [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → Credentials**.
2. Create an **OAuth 2.0 Client ID** (Application type: Web application).
3. Under **Authorized redirect URIs**, add:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://<your-production-domain>/api/auth/callback/google`
4. Copy the **Client ID** and **Client Secret** into your `.env.local`.

---

## MongoDB Atlas Configuration

1. Create a cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a **Database User** with read/write privileges.
3. In **Network Access**, add your server's IP address (or `0.0.0.0/0` for Vercel deployment).
4. Copy the connection string to `MONGODB_URI` in `.env.local`.

TrashWhere will automatically maintain the `scans` collection and the compound index `{ userId: 1, createdAt: -1 }`.

---

## Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Starts development server with Turbopack |
| `pnpm build` | Compiles optimized production build |
| `pnpm start` | Starts production server |
| `pnpm lint` | Runs ESLint analysis |
| `pnpm test` | Executes unit and integration tests with Vitest |

---

## Architecture & Data Flow

```text
Camera / File Upload
        ↓
POST /api/classify             (Next.js Route Handler)
        ↓
Gemini Vision API              (Server-side execution only)
        ↓
Validated ClassificationResult
        ↓
Interactive UI: Category + Confidence + Explanation + Disposal Checklist
        ↓
POST /api/history              (Authenticated only — optional background sync)
        ↓
MongoDB Atlas                  (Strictly scoped to session userId)
```

All AI calls and database transactions are handled **exclusively on the server**. No API keys, database credentials, or third-party service secrets are ever exposed to the client bundle.

---

## Security & Privacy Safeguards

- **Zero Image Persistence** — Uploaded images and camera frames exist only temporarily in server memory during classification. They are never written to disk or stored in MongoDB.
- **Strict User Isolation** — Every history operation (`find`, `deleteOne`, `deleteMany`, `updateOne`) is strictly scoped to the server-verified `userId`. Users can never view or manipulate another user's records.
- **Server-Side Authorization** — Anonymous users cannot access the `/api/history` endpoints.
- **IP Rate Limiting** — In-memory sliding window rate limiter protects `/api/classify` (default: 15 requests per minute per IP).
- **File Validation & Magic Bytes** — Strict server-side verification of file size (≤ 10 MB), declared MIME type, and magic bytes for JPEG, PNG, and WebP images.
- **Bounded Cloud Storage** — Cloud scan history is automatically pruned to a maximum of 50 scans per user.
- **Privacy-First Data Model** — No GPS coordinates, device fingerprints, or EXIF metadata are collected or stored.

---

## Deployment

The application is optimized for deployment on **Vercel**:

1. Import the repository into Vercel.
2. Add environment variables in the Vercel Project Settings (reference `.env.example`).
3. Set the production domain in your Google OAuth Client Authorized Redirect URIs.
4. Ensure MongoDB Atlas Network Access permits Vercel IP connections.
5. Deploy — Next.js will automatically build and deploy the application.

---

## Project Structure

```text
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/  # NextAuth route handlers
│   │   ├── classify/            # POST /api/classify — AI classification pipeline
│   │   └── history/             # GET/POST/DELETE /api/history
│   │       └── [id]/            # DELETE/PATCH /api/history/[id]
│   ├── history/                 # /history page
│   ├── learn/                   # /learn educational page
│   ├── globals.css              # Design tokens and theme styling
│   ├── layout.tsx               # Root HTML layout and typography
│   └── page.tsx                 # Main scanner page
├── components/                  # Reusable UI components
├── lib/
│   ├── camera.ts                # WebRTC camera helpers and stream management
│   ├── classifier.ts            # Gemini Vision wrapper and schema validation
│   ├── confidence.ts            # Confidence calculation and thresholds
│   ├── history-service.ts       # MongoDB access layer with authorization enforcement
│   ├── mongodb.ts               # Atlas client connection pooling
│   ├── rate-limiter.ts          # IP-based rate limiting
│   └── waste-categories.ts      # Canonical category metadata and color definitions
└── types/                       # TypeScript domain types
```

---

## Release Version

**v2.4.0** — Final Product Polish & Competition Release Candidate (Phase 14)

See development history and phase reports in the `docs/` directory.
