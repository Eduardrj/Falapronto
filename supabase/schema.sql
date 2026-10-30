-- Fala Pronto: tabela de roteiros com segurança por usuário (RLS)
-- Cole no Supabase: SQL Editor > New query > Run

create table if not exists public.scripts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null default '',
  content text not null default '',
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists scripts_user_idx on public.scripts(user_id);

alter table public.scripts enable row level security;

drop policy if exists "dono le" on public.scripts;
drop policy if exists "dono cria" on public.scripts;
drop policy if exists "dono edita" on public.scripts;
drop policy if exists "dono apaga" on public.scripts;

create policy "dono le"    on public.scripts for select using (auth.uid() = user_id);
create policy "dono cria"  on public.scripts for insert with check (auth.uid() = user_id);
create policy "dono edita" on public.scripts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "dono apaga" on public.scripts for delete using (auth.uid() = user_id);
