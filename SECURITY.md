# Security Policy

## Supported versions

Security fixes are applied to the latest commit on `main`. Older commits and
deployments are not supported.

## Reporting a vulnerability

Please use **GitHub private vulnerability reporting**:

1. Open the repository's **Security** tab.
2. Choose **Report a vulnerability**.
3. Include reproduction steps, affected routes or files, and the impact.

Do not open a public issue for a suspected vulnerability. If private reporting is
unavailable, contact the repository owner through their GitHub profile and ask for
a private channel.

## What to include

- A short description of the issue and the affected component.
- Steps to reproduce, including the relevant request, route, or database policy.
- Whether the issue exposes data across `owner_id` or `company_id` boundaries.
- Any logs or screenshots with secrets removed.
- A suggested fix, if you have one.

## Security-sensitive areas

- Supabase Auth and Row Level Security.
- Workspace isolation between `super_admin`, `admin`, and `user`.
- OAuth token storage and the AES-256-GCM encryption path.
- AI budget reservation, token accounting, and the free-only guard.
- Server Actions and API authorization checks.
- Secret handling in `.env.local`, CI, and logs.

## Secrets

Never commit credentials. If a key was exposed, revoke and rotate it immediately
and check the repository history for the leaked value.

## Disclosure

We aim to acknowledge reports as soon as possible and will coordinate a fix and
disclosure timeline with the reporter. This is a volunteer project, so no formal
SLA is implied.
