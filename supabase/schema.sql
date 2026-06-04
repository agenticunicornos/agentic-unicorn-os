create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.operator_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  seed_key text,
  mission text not null check (mission in ('product', 'distribution', 'capital', 'ma', 'consulting')),
  title text not null check (char_length(title) <= 160),
  leverage text not null default '',
  due text not null default 'Today',
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.operator_actions enable row level security;

create index if not exists operator_actions_user_created_idx
on public.operator_actions (user_id, created_at);

drop policy if exists "operator_actions_select_own" on public.operator_actions;
create policy "operator_actions_select_own"
on public.operator_actions for select
using (auth.uid() = user_id);

drop policy if exists "operator_actions_insert_own" on public.operator_actions;
create policy "operator_actions_insert_own"
on public.operator_actions for insert
with check (auth.uid() = user_id);

drop policy if exists "operator_actions_update_own" on public.operator_actions;
create policy "operator_actions_update_own"
on public.operator_actions for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "operator_actions_delete_own" on public.operator_actions;
create policy "operator_actions_delete_own"
on public.operator_actions for delete
using (auth.uid() = user_id);

drop trigger if exists set_operator_actions_updated_at on public.operator_actions;
create trigger set_operator_actions_updated_at
before update on public.operator_actions
for each row execute function public.set_updated_at();

create table if not exists public.pipeline_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lane text not null,
  name text not null check (char_length(name) <= 120),
  counterparty text not null default '',
  next_step text not null default '',
  signal text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pipeline_items enable row level security;

create index if not exists pipeline_items_user_lane_idx
on public.pipeline_items (user_id, lane, created_at);

drop policy if exists "pipeline_items_select_own" on public.pipeline_items;
create policy "pipeline_items_select_own"
on public.pipeline_items for select
using (auth.uid() = user_id);

drop policy if exists "pipeline_items_insert_own" on public.pipeline_items;
create policy "pipeline_items_insert_own"
on public.pipeline_items for insert
with check (auth.uid() = user_id);

drop policy if exists "pipeline_items_update_own" on public.pipeline_items;
create policy "pipeline_items_update_own"
on public.pipeline_items for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "pipeline_items_delete_own" on public.pipeline_items;
create policy "pipeline_items_delete_own"
on public.pipeline_items for delete
using (auth.uid() = user_id);

drop trigger if exists set_pipeline_items_updated_at on public.pipeline_items;
create trigger set_pipeline_items_updated_at
before update on public.pipeline_items
for each row execute function public.set_updated_at();

create table if not exists public.dossier_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dossier_id text not null,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, dossier_id)
);

alter table public.dossier_notes enable row level security;

drop policy if exists "dossier_notes_select_own" on public.dossier_notes;
create policy "dossier_notes_select_own"
on public.dossier_notes for select
using (auth.uid() = user_id);

drop policy if exists "dossier_notes_insert_own" on public.dossier_notes;
create policy "dossier_notes_insert_own"
on public.dossier_notes for insert
with check (auth.uid() = user_id);

drop policy if exists "dossier_notes_update_own" on public.dossier_notes;
create policy "dossier_notes_update_own"
on public.dossier_notes for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "dossier_notes_delete_own" on public.dossier_notes;
create policy "dossier_notes_delete_own"
on public.dossier_notes for delete
using (auth.uid() = user_id);

drop trigger if exists set_dossier_notes_updated_at on public.dossier_notes;
create trigger set_dossier_notes_updated_at
before update on public.dossier_notes
for each row execute function public.set_updated_at();
