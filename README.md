# VIC Affiliate — Phòng điều khiển đa kênh

Hệ thống quản lý hệ sinh thái kinh doanh nội dung & bán hàng: nhiều kênh YouTube,
TikTok, Facebook, đầu sách, kênh truyền thông, Shopee, TikTok Shop và các sàn
quốc tế — có phân quyền user/admin, REST API và AI router đa provider.

- **Framework:** Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind CSS v4
- **Dữ liệu & xác thực:** Supabase (Postgres + Auth + Row Level Security)
- **AI:** router đa provider (OpenAI / Anthropic / Google / OpenRouter) với fallback tự động

## Tính năng Phase 1

- Đăng ký / đăng nhập (Supabase Auth), phân quyền `user` / `admin` bằng RLS.
- Quản lý kênh: tạo, sửa, xoá, lọc theo nền tảng / trạng thái / khu vực / từ khoá.
- Bảng điều khiển: tín hiệu theo nền tảng, dòng nội dung, kênh cập nhật gần đây.
- AI Studio: viết kịch bản, chương sách, caption, chiến lược kênh; lưu vào kho nội dung.
- Khu vực Admin: quản lý người dùng, đổi vai trò, xem toàn bộ kênh.
- REST API: `/api/channels`, `/api/channels/[id]`, `/api/ai/generate`, `/api/admin/users`.

## Cài đặt

### 1. Cài dependencies

```bash
npm install
```

### 2. Tạo project Supabase & nạp schema

1. Tạo project mới tại [supabase.com](https://supabase.com).
2. Mở **SQL Editor**, dán nội dung file `supabase/migrations/20261019000000_init.sql` và chạy.
   (Hoặc dùng Supabase CLI: `supabase db push`.)
3. Trong **Authentication > Sign In / Providers**, tắt *Confirm email* khi phát triển
   để đăng ký xong dùng được ngay (bật lại khi lên production).

### 3. Cấu hình biến môi trường

```bash
cp .env.example .env.local
```

Điền:

| Biến | Bắt buộc | Ghi chú |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase > Project Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase > Project Settings > API |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GOOGLE_API_KEY` / `OPENROUTER_API_KEY` | Ít nhất 1 | AI Studio dùng provider nào có key |
| `AI_PROVIDER_ORDER` | Không | Thứ tự fallback, mặc định `openai,anthropic,google,openrouter` |

### 4. Chạy

```bash
npm run dev
```

Mở http://localhost:3000 → đăng ký tài khoản đầu tiên.

### 5. Phong admin cho tài khoản đầu tiên

Trong Supabase SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'ban@example.com';
```

Đăng nhập lại để thấy mục **Admin** trong sidebar.

## Cấu trúc thư mục

```
app/
  (auth)/            Đăng nhập, đăng ký
  (app)/             Khu vực đã xác thực (sidebar + console)
    dashboard/       Bảng điều khiển
    channels/        Danh sách, tạo mới, chi tiết kênh
    ai/              AI Studio
    settings/        Hồ sơ, vai trò, đăng xuất
    admin/           Người dùng, toàn bộ kênh
  actions/           Server Actions (auth, channels, content, admin)
  api/               REST API
components/          UI kit + layout + channels + ai + admin
lib/
  ai/                Router đa provider + prompt templates
  supabase/          Client browser/server, refresh session cho proxy
  data.ts            Truy vấn dữ liệu
  validators.ts      Zod schemas dùng chung cho actions + API
supabase/migrations  Schema + RLS + triggers
proxy.ts             Refresh session + redirect (Next 16 thay thế middleware)
```

## Xưởng media (worker trên Windows)

Web tạo job (nhạc / giọng đọc) → lưu vào bảng `media_jobs` → worker trên máy
Windows nhận job, gọi engine local rồi đẩy file lên Supabase Storage (bucket
`media`). Cài đặt và vận hành: xem [services/windows/README.md](services/windows/README.md).

- Nhạc: ACE-Step 1.5 (GGUF, chạy CPU trên máy 8GB)
- Giọng đọc tiếng Việt: VieNeu-TTS (CPU, torch-free)
- Worker: `services/worker` (Node, service_role key nằm trên máy Windows)

## Tập đoàn AI (công ty → CEO → quản lý → nhân viên)

- Cấu trúc tổ chức nằm trong DB (`companies`, `ai_agents`) — restart vẫn còn nguyên.
- Giao việc cho từng AI (`agent_tasks`), mọi đầu ra mặc định **chờ duyệt** (cấp tự chủ 0–3).
- Mỗi task có **dự toán token/USD trước khi chạy** (heuristic từ độ dài yêu cầu + trần token agent).
- Ngân sách enforce bằng code qua `lib/ai/budget.ts`: trần tháng toàn hệ thống + trần từng công ty; `hard_stop` chặn gọi model khi chạm hạn mức. Mọi lần gọi ghi vào sổ `cost_ledger` (token thật từ nhà cung cấp, giá ở `lib/ai/pricing.ts`).
- Cài cơ cấu mẫu 1 nút cho 3 ngành: Affiliate, Xuất bản, Media (`lib/company-templates.ts`) — hoặc thêm AI thủ công với provider/model/prompt riêng.
- Trang `/company`: ngân sách tháng, chi tiêu theo công ty, agent tốn nhất, sổ giao dịch.

> Bảng giá model là ước tính để enforce ngân sách; chỉnh bằng `AI_PRICE_OVERRIDES` (JSON) khi nhà cung cấp đổi giá.

## Ghi chú kỹ thuật

- **Next 16:** middleware đổi tên thành `proxy.ts`; app bật Cache Components nên
  layout `(app)` đặt `export const instant = false` để các trang dashboard render
  động theo phiên đăng nhập. Có thể tối ưu từng route bằng `use cache` sau này.
- **Bảo mật:** mọi truy vấn đi qua RLS (user chỉ thấy dữ liệu của mình, admin thấy tất cả);
  trigger chặn user tự nâng quyền; API route tự xác thực phiên trong từng handler.
- **Đăng nhập qua API:** các route API dùng session cookie (cùng phiên với web).

## Roadmap gợi ý

- Phase 2: OAuth kết nối kênh (YouTube Data API, TikTok, Facebook Graph), đồng bộ số liệu tự động.
- Phase 3: lên lịch đăng bài, AI agent tự động đề xuất lịch nội dung, thống kê doanh thu sàn.
- Phase 4: đa ngôn ngữ cho thị trường quốc tế, phân tích hiệu suất theo vùng.
