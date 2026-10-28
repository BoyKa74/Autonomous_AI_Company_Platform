# Kiến trúc — Runtime hiện tại

Tài liệu này mô tả hệ thống đang chạy hôm nay. Các mục dự kiến được ghi rõ. Tài liệu
chính là tiếng Anh; bản dịch tiếng Việt nằm ở đây.

## Sơ đồ tương tác

- [Kiến trúc công ty AI — English, dark](architecture/current-ai-company.en-dark.html)
- [Workflow task AI — English, dark](architecture/current-task-workflow.en-dark.html)
- [Kiến trúc công ty AI — Tiếng Việt](architecture/current-ai-company.vi.html)
- [Workflow task AI — Tiếng Việt](architecture/current-task-workflow.vi.html)

Bản Archify đã kiểm định là `current-ai-company.en.html` và
`current-task-workflow.en.html`. Các file `.en-dark.html` và `.vi.html` là bản
trình bày dark mặc định. Source JSON và receipt nằm trong `.archify/` và
`docs/architecture/`.

## Thành phần runtime

| Thành phần | Trách nhiệm | Nguồn |
| --- | --- | --- |
| Next.js console | Workspace 2D, văn phòng 3D, trang đã xác thực, REST handler | `app/`, `components/` |
| Server Actions | Tạo task, chạy workflow, review, cấu hình công ty/agent | `app/actions/` |
| AI router | Lọc free-only, fallback provider, model override | `lib/ai/router.ts`, `lib/ai/providers.ts` |
| Budget guard | Giới hạn token công ty, agent, task, mỗi lượt | `lib/ai/token-budget.ts` |
| Free AI providers | OpenCode Zen, Google Gemini, Groq, OpenRouter | `lib/ai/providers.ts` |
| Skills + SOP | Quality gate research, review, storyboard; SOP ghim | `.opencode/skills/`, `knowledge_docs` |
| Supabase Postgres | Công ty, agent, task, knowledge, cost ledger, media job | `supabase/migrations/` |
| Mac autopilot | Playwright worker điều khiển trang công ty | `services/autopilot/` |
| Agent Reach | Research web, GitHub, YouTube read-only | CLI đã cài |
| Browser MCP | Chrome session thật cho site cần login (tuỳ chọn) | extension + MCP server |
| Media worker (Windows) | Voice/music job và upload Supabase Storage | `services/worker/` |
| MoneyPrinterTurbo | Renderer video dự kiến; chưa nối | tương lai |

## Luồng chính

```text
Operator
  → Next.js console
  → AI company agents
  → AI router + budget guard
  → free AI provider
```

Luồng phụ:

```text
AI company agents ↔ Supabase Postgres     (agent, task, budget, ledger)
Skills + SOP      → AI company agents     (knowledge ghim và quality gate)
Mac Autopilot     → Next.js console       (Playwright điều khiển UI)
AI company agents → Agent Reach           (research read-only)
```

Hiện chưa có public affiliate site và chưa có publisher tự động. Public site,
click tracking, connector dữ liệu sản phẩm và video renderer là dự kiến.

## Vòng đời task

1. **Plan:** CEO đề xuất task và cấp token budget cho từng task.
2. **Guard:** router kiểm tra free-only + giới hạn công ty, agent, task.
3. **Execute:** specialist chạy một bước workflow mỗi lượt.
4. **Review:** khi workflow xong, manager duyệt hoặc yêu cầu sửa một lần.
5. **Human gate:** con người duyệt hoặc từ chối.
6. **Settle:** việc được duyệt cập nhật thưởng/điểm/tầng; bị từ chối bị trừ.

Lỗi 429, quota, call rỗng/hết budget hoặc provider lỗi sẽ chuyển task sang review
thay vì retry vô hạn. Autopilot và server đều có lock để tránh chạy trùng.

## Free-only và ngân sách token

Ngân sách mặc định:

| Phạm vi | Token/ngày |
| --- | ---: |
| Công ty | 100.000 |
| CEO | 100.000 |
| Manager | 20.000 |
| Specialist | 15.000 |
| Worker | 5.000 |
| Task | 15.000 |
| Mỗi lượt gọi | 3.000 |
| Vòng sửa của manager | 1 |

Budget của task đang mở được giữ chỗ để lập kế hoạch liên tiếp không cấp trùng.
Cost ledger ghi token thật và chi phí. Provider/model trả phí bị từ chối khi
`AI_FREE_ONLY=1`.

## Chế độ workspace

- **Multi-Agent 2D** (mặc định): cây tổ chức, status rail, inspector, dependencies,
  quick actions và agent tabs.
- **Văn phòng 3D:** scene văn phòng tương tác hiện có.
- **`?headless=1`:** chế độ chạy nền; không tự bật AI. Nút “Tự động” vẫn là công tắc
  autopilot.

Workspace 2D và các panel task/report bên dưới dùng dark island; view 3D giữ light
shell và văn phòng 3D như cũ.

## Ranh giới triển khai

- **Local Mac runtime:** Next.js dev server, autopilot, skills, Agent Reach,
  Browser MCP và (tương lai) video rendering.
- **Supabase cloud:** Postgres, Auth, RLS, Storage.
- **Free AI providers:** HTTP API bên ngoài.
- **Human approval:** cổng phát hành bắt buộc cho mọi nội dung.

Browser MCP và autopilot có thể truy cập browser đã đăng nhập. Dùng browser profile
riêng, giữ service-role key trên server/worker và dừng agent khi không cần.

## Chưa có trong runtime hiện tại

- Public affiliate site và tracking click `/go`.
- Connector dữ liệu sản phẩm Kalodata/TikTok Shop.
- Render video bằng MoneyPrinterTurbo.
- UI song ngữ (tài liệu English-first; UI hiện tại vẫn tiếng Việt).
- Test end-to-end tự động cho task lifecycle.
