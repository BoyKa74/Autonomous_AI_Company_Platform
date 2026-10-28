# Architecture — Current Runtime

This document describes the system as it exists today. Planned items are labeled
explicitly. English is the primary documentation language; the Vietnamese
translation is in [ARCHITECTURE.vi.md](ARCHITECTURE.vi.md).

## Interactive diagrams

- [AI company runtime — English, dark](architecture/current-ai-company.en-dark.html)
- [AI task workflow — English, dark](architecture/current-task-workflow.en-dark.html)
- [AI company runtime — Vietnamese](architecture/current-ai-company.vi.html)
- [AI task workflow — Vietnamese](architecture/current-task-workflow.vi.html)

The checked Archify outputs are `current-ai-company.en.html` and
`current-task-workflow.en.html`. The `.en-dark.html` and `.vi.html` files are
presentation copies with dark as the default theme. Source JSON and finalize
receipts live under `.archify/` and `docs/architecture/`.

## Runtime components

| Component | Responsibility | Source of truth |
| --- | --- | --- |
| Next.js console | 2D workspace, 3D office, authenticated pages, REST handlers | `app/`, `components/` |
| Server Actions | Task creation, workflow steps, reviews, company/agent config | `app/actions/` |
| AI router | Free-only filtering, provider fallback, model overrides | `lib/ai/router.ts`, `lib/ai/providers.ts` |
| Budget guard | Company, agent, task and per-call token limits | `lib/ai/token-budget.ts` |
| Free AI providers | OpenCode Zen, Google Gemini, Groq, OpenRouter | `lib/ai/providers.ts` |
| Skills + SOP | Research, review and storyboard quality gates; pinned SOP | `.opencode/skills/`, `knowledge_docs` |
| Supabase Postgres | Companies, agents, tasks, knowledge, cost ledger, media jobs | `supabase/migrations/` |
| Mac autopilot | Playwright worker that drives the company page | `services/autopilot/` |
| Agent Reach | Read-only web, GitHub and YouTube research | installed CLI |
| Browser MCP | Optional real Chrome session for signed-in sites | extension + MCP server |
| Media worker (Windows) | Voice/music jobs and Supabase Storage upload | `services/worker/` |
| MoneyPrinterTurbo | Planned video renderer; not wired yet | future |

## Primary path

```text
Operator
  → Next.js console
  → AI company agents
  → AI router + budget guard
  → free AI provider
```

Supporting paths:

```text
AI company agents ↔ Supabase Postgres     (agents, tasks, budgets, ledger)
Skills + SOP      → AI company agents     (pinned knowledge and quality gates)
Mac Autopilot     → Next.js console       (Playwright drives the UI)
AI company agents → Agent Reach           (read-only research)
```

The current system has no public affiliate site and no automatic publisher. A
public site, click tracking, a product-data connector and a video renderer are
planned.

## Task lifecycle

1. **Plan:** the CEO agent proposes tasks and allocates a token budget to each.
2. **Guard:** the router checks free-only mode plus company, agent and task limits.
3. **Execute:** a specialist runs one workflow step per call.
4. **Review:** when the workflow completes, the manager approves or requests one
   revision.
5. **Human gate:** a human approves or rejects the task.
6. **Settle:** approved work updates reward, score and tier; rejected work loses
   score/reward.

Failure behavior: a 429, quota error, empty/budget-exhausted call or provider
failure moves the task to review instead of retrying indefinitely. The autopilot
and the server both have locks to prevent duplicate runs.

## Free-only guard and token budgets

The default budgets are:

| Scope | Tokens/day |
| --- | ---: |
| Company | 100,000 |
| CEO | 100,000 |
| Manager | 20,000 |
| Specialist | 15,000 |
| Worker | 5,000 |
| Task | 15,000 |
| Per call | 3,000 |
| Manager revision rounds | 1 |

Open task budgets are reserved so repeated planning cannot over-allocate. The
ledger records actual provider input/output tokens and cost. Paid providers and
paid model overrides are rejected while `AI_FREE_ONLY=1`.

## Workspace modes

- **Multi-Agent 2D** (default): organization tree, status rail, inspector,
  dependencies, quick actions and agent tabs.
- **3D office:** the existing interactive office scene.
- **`?headless=1`:** background-friendly mode; it does not start AI. The
  “Tự động” toggle remains the autopilot switch.

The 2D workspace and its lower task/report panels use a dark island theme; the 3D
view keeps the original light shell and office scene.

## Deployment boundaries

- **Local Mac runtime:** Next.js dev server, autopilot, skills, Agent Reach,
  Browser MCP and (future) video rendering.
- **Supabase cloud:** Postgres, Auth, RLS, Storage.
- **Free AI providers:** external HTTP APIs.
- **Human approval:** required release gate for all content.

Browser MCP and the autopilot can access signed-in browser sessions. Use a
dedicated browser profile, keep the service-role key on server/worker machines,
and stop the agent when it is not needed.

## What is intentionally not here yet

- Public affiliate site and `/go` click tracking.
- Kalodata/TikTok Shop product-data connector.
- MoneyPrinterTurbo video rendering.
- Bilingual UI copy (documentation is English-first; UI copy is Vietnamese).
- Automated end-to-end tests for the task lifecycle.
