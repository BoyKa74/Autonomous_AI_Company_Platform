# Contributing to Autonomous AI Company Platform

Thanks for helping build the platform. This project is MIT licensed and welcomes
focused pull requests, bug reports, documentation fixes, and production-minded
feedback.

## Before you start

- Read [README.md](README.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), and
  [AGENTS.md](AGENTS.md).
- Open an issue before starting a large feature or refactor so we can agree on
  scope.
- Never commit `.env.local`, Supabase service keys, OAuth tokens, or customer data.

## Development setup

Requirements: Node.js 20+, npm, and a Supabase project.

```bash
npm install
cp .env.example .env.local
# fill in the Supabase URL, anon key, and the AI provider keys you want to use
npm run dev
```

Open `http://localhost:3000` and register the first account. See
[README.md](README.md#quick-start) for the database migrations and admin setup.

## Checks

Run these before opening a pull request:

```bash
npm run typecheck
npx eslint app components lib
```

`npm run lint` also checks the rest of the repository. The vendored agent skills
under `.agents/` and `.opencode/` are intentionally excluded from the app lint
config.

## Pull requests

- Keep one PR focused on one problem.
- Explain the user-visible change and list the routes or tables you touched.
- Include screenshots or a short recording for UI changes.
- Update README, architecture docs, or `.env.example` when behavior changes.
- Do not weaken workspace isolation (`owner_id` / `company_id`), Row Level
  Security, the free-only AI guard, or the token/budget guard.
- Do not add a paid AI provider path while `AI_FREE_ONLY=1`.

## Internationalization

English is the primary UI language; Vietnamese is supported through the
`vic_locale` cookie.

- Add shared copy to `lib/i18n/messages.ts` and use `t(locale, key)` or
  `tr(locale, text)`.
- Pass `locale` from server components into client components. Do not rely on a
  client-only context for text that is server-rendered, because it causes
  hydration mismatches.
- Keep user data, AI output, and database content separate from UI copy.

## Tests

There is not yet an automated test runner. Tests for the task lifecycle and
budget guard are a priority. If you add one, include the framework, the npm
script, and a stable fixture strategy in the same PR.

## Security

Please read [SECURITY.md](SECURITY.md). Report vulnerabilities privately through
GitHub Security Advisories; do not open a public issue.

## License

By contributing, you agree that your contribution is licensed under the
[MIT License](LICENSE).
