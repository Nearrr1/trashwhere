<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

You are building an educational waste-classification
application for Vietnamese high-school students.

Rules:

1. Never implement before planning.
2. Never modify unrelated files.
3. Prefer simple architecture.
4. Do not introduce dependencies without justification.
5. Every feature must have acceptance criteria.
6. Every bug fix must include a regression test.
7. Never expose API keys to client code.
8. Images must be validated before upload.
9. AI classification must expose confidence.
10. Before declaring a task complete:
    - run lint
    - run tests
    - run build
    - inspect git diff

<!-- END:nextjs-agent-rules -->
