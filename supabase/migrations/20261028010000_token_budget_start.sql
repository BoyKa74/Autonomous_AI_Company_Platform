-- Mốc bắt đầu chính sách budget: token tiêu trước mốc này không tính vào hạn mức mới.
alter table public.companies
  add column if not exists token_budget_started_at timestamptz not null default now();

comment on column public.companies.token_budget_started_at is
  'Chỉ tính token từ mốc này vào hạn mức ngày (tránh tính chi phí phát sinh trước khi bật budget).';
