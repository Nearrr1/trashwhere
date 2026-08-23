<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# TrashWhere — Engineering Constitution

**TrashWhere** is an educational waste-classification web app for Vietnamese high-school students, built for a science competition. Users photograph or upload an item; the app identifies it, categorises the waste type, and explains proper disposal.

---

## Stack

| Tool | Version |
|---|---|
| Next.js | 16.3.1 (App Router, Turbopack) |
| React | 19 |
| TypeScript | 5 (`strict: true`) |
| Tailwind CSS | 4 |
| ESLint | 9 (`eslint-config-next`) |
| Package manager | pnpm 10 |
| Node | 20 |

Path alias: `@/*` → `src/*`

---

## 1. Product

- **Users**: Vietnamese high-school students.
- **Core use case**: Classify waste from a photo; explain the category and correct disposal method.
- **Quality bar**: Educational, explainable, fast, mobile-first, suitable for a live science-competition demo.

---

## 2. Engineering

- Prefer simple, flat architecture over premature abstraction.
- Do not add a dependency unless the benefit clearly outweighs the maintenance cost. Justify every addition in the PR.
- Reuse existing utilities and components before creating duplicates.
- Keep components small and single-purpose.
- Separate business logic from presentation where practical; keep them in the same file only when trivially small.
- Never modify files unrelated to the current task.
- Never rewrite working code without a concrete, stated reason.

---

## 3. AI Coding Workflow

Every non-trivial change must follow **PLAN → IMPLEMENT → TEST → REVIEW**.

**Before writing code:**
1. Clarify the requirement and define acceptance criteria.
2. Identify all files that will be affected.
3. Identify risks and edge cases.

**After writing code — before declaring done:**
```
pnpm lint
pnpm test          # when tests exist
pnpm build         # when the change affects runtime behaviour
git diff           # review every changed line
```

Do not mark a task complete if any of the above steps fail.

---

## 4. Frontend

- **Mobile-first.** Design for small screens; scale up.
- All interactive elements must meet WCAG 2.1 AA accessibility requirements.
- Use semantic HTML (`<main>`, `<nav>`, `<section>`, `<article>`, `<button>`, etc.).
- **Default to Server Components.** Add `"use client"` only when browser APIs or interactivity genuinely require it.
- Do not produce generic, template-looking AI-generated UI. The design must feel purposeful and coherent.
- Maintain a consistent design system (colours, spacing, typography). Do not introduce one-off styles.

---

## 5. TypeScript

- `strict: true` is enforced — do not weaken it.
- Avoid `any`. Use `unknown` + narrowing when the type is genuinely uncertain.
- Do not suppress TypeScript errors (`// @ts-ignore`, `// @ts-expect-error`) without a written justification in the same comment.
- Define explicit domain types for waste-classification data (e.g., `WasteCategory`, `ClassificationResult`). Do not use raw strings or generic objects for domain concepts.

---

## 6. Performance

- Optimise for mid-range Android phones on a 4G connection.
- Use `next/image` for all user-visible images.
- Keep client-side JavaScript minimal. Avoid importing heavy libraries into the browser bundle.
- Do not perform premature micro-optimisations; fix measured problems, not imagined ones.

---

## 7. Security

- **Never expose API keys, secrets, or service credentials to the browser.** All AI calls must go through Next.js Route Handlers (`app/api/`).
- Validate uploaded files server-side: check MIME type, magic bytes, and file size before processing.
- Never trust classification data that arrives from the client. Re-validate on the server.
- Treat every uploaded image as untrusted input.

---

## 8. AI / Computer Vision

Every classification response **must** include:

| Field | Description |
|---|---|
| `category` | Canonical waste category (from the central definition) |
| `confidence` | Numeric score 0–1 |
| `explanation` | Plain-language reason, suitable for a high-school student |
| `disposalAction` | Specific recommended disposal step |

**Rules:**
- Define all valid `WasteCategory` values in a single central location (e.g., `src/lib/waste-categories.ts`). Never duplicate them.
- When `confidence < 0.6`, surface uncertainty to the user; do not present a low-confidence result as certain.
- Handle AI API failures and ambiguous images gracefully with clear user-facing error states.

---

## 9. Testing

- Every important business rule (category mapping, validation logic, confidence thresholds) must have a unit test.
- Bug fixes must include a regression test when practical.
- Do not delete or skip tests to make the build pass.

---

## 10. Git

- Make focused, single-purpose commits.
- Do not mix formatting changes with logic changes.
- Never `reset --hard`, force-push, or rewrite history that has already been shared without explicit user permission.
- Commit message format: `type(scope): description` (e.g., `feat(classify): add confidence threshold UI`).

---

## 11. Competition Quality Checklist

Before any demo or submission, verify:

- [ ] Classification result includes category, confidence, explanation, and disposal action.
- [ ] UI works correctly on a 375 px wide screen.
- [ ] No secrets are present in client bundles (check Network tab).
- [ ] `pnpm lint` passes with zero errors.
- [ ] `pnpm build` succeeds.
- [ ] All key business rules have tests.
- [ ] AI failures show a meaningful error state, not a blank screen.
- [ ] The app is understandable to a Vietnamese high-school student without prior context.
