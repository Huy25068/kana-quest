-- Chạy file này 1 lần trong Supabase → SQL Editor.
-- Mỗi người dùng có tối đa 3 dòng: kq-progress, kq-scope, kq-notes.
create table if not exists public.user_data (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  key        text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- Row Level Security: mỗi người chỉ đọc/ghi được dữ liệu của chính mình.
alter table public.user_data enable row level security;

drop policy if exists "own rows" on public.user_data;
create policy "own rows" on public.user_data
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
