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

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = id);

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  owner_id uuid not null references auth.users(id) on delete cascade,
  access_state text not null default 'active' check (access_state in ('active', 'suspended', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organizations enable row level security;

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

alter table public.organization_members enable row level security;

create or replace function public.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_organization_id is not null
    and exists (
      select 1
      from public.organization_members member
      join public.organizations organization
        on organization.id = member.organization_id
      where member.organization_id = target_organization_id
        and member.user_id = auth.uid()
        and organization.access_state = 'active'
    );
$$;

create or replace function public.is_org_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_organization_id is not null
    and exists (
      select 1
      from public.organization_members member
      join public.organizations organization
        on organization.id = member.organization_id
      where member.organization_id = target_organization_id
        and member.user_id = auth.uid()
        and member.role in ('owner', 'admin')
        and organization.access_state = 'active'
    );
$$;

create or replace function public.handle_new_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organization_members (organization_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (organization_id, user_id) do update
    set role = 'owner';
  return new;
end;
$$;

drop trigger if exists on_organization_created on public.organizations;
create trigger on_organization_created
after insert on public.organizations
for each row execute function public.handle_new_organization();

drop policy if exists "organizations_select_member" on public.organizations;
create policy "organizations_select_member"
on public.organizations for select
using (owner_id = auth.uid() or public.is_org_member(id));

drop policy if exists "organizations_insert_owner" on public.organizations;
create policy "organizations_insert_owner"
on public.organizations for insert
with check (owner_id = auth.uid());

drop policy if exists "organizations_update_admin" on public.organizations;
create policy "organizations_update_admin"
on public.organizations for update
using (owner_id = auth.uid() or public.is_org_admin(id))
with check (owner_id = auth.uid() or public.is_org_admin(id));

drop policy if exists "organization_members_select_member" on public.organization_members;
create policy "organization_members_select_member"
on public.organization_members for select
using (public.is_org_member(organization_id));

drop policy if exists "organization_members_insert_admin" on public.organization_members;
create policy "organization_members_insert_admin"
on public.organization_members for insert
with check (public.is_org_admin(organization_id));

drop policy if exists "organization_members_update_admin" on public.organization_members;
create policy "organization_members_update_admin"
on public.organization_members for update
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

drop policy if exists "organization_members_delete_admin" on public.organization_members;
create policy "organization_members_delete_admin"
on public.organization_members for delete
using (public.is_org_admin(organization_id));

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member', 'viewer')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.organization_invitations enable row level security;

drop policy if exists "organization_invitations_select_admin" on public.organization_invitations;
create policy "organization_invitations_select_admin"
on public.organization_invitations for select
using (public.is_org_admin(organization_id));

drop policy if exists "organization_invitations_insert_admin" on public.organization_invitations;
create policy "organization_invitations_insert_admin"
on public.organization_invitations for insert
with check (public.is_org_admin(organization_id) and invited_by = auth.uid());

drop policy if exists "organization_invitations_update_admin" on public.organization_invitations;
create policy "organization_invitations_update_admin"
on public.organization_invitations for update
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_events enable row level security;

drop policy if exists "audit_events_select_member" on public.audit_events;
create policy "audit_events_select_member"
on public.audit_events for select
using ((organization_id is null and actor_id = auth.uid()) or public.is_org_member(organization_id));

drop policy if exists "audit_events_insert_member" on public.audit_events;
create policy "audit_events_insert_member"
on public.audit_events for insert
with check (actor_id = auth.uid() and (organization_id is null or public.is_org_member(organization_id)));

drop trigger if exists set_organizations_updated_at on public.organizations;
create trigger set_organizations_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create table if not exists public.operator_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
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

alter table public.operator_actions
add column if not exists organization_id uuid references public.organizations(id) on delete cascade,
add column if not exists user_id uuid references auth.users(id) on delete cascade,
add column if not exists seed_key text,
add column if not exists mission text not null default 'product',
add column if not exists title text not null default '',
add column if not exists leverage text not null default '',
add column if not exists due text not null default 'Today',
add column if not exists done boolean not null default false,
add column if not exists created_at timestamptz not null default now(),
add column if not exists updated_at timestamptz not null default now();

alter table public.operator_actions enable row level security;

create index if not exists operator_actions_user_created_idx
on public.operator_actions (user_id, created_at);

create index if not exists operator_actions_org_created_idx
on public.operator_actions (organization_id, created_at);

drop policy if exists "operator_actions_select_own" on public.operator_actions;
create policy "operator_actions_select_own"
on public.operator_actions for select
using (auth.uid() = user_id or public.is_org_member(organization_id));

drop policy if exists "operator_actions_insert_own" on public.operator_actions;
create policy "operator_actions_insert_own"
on public.operator_actions for insert
with check (auth.uid() = user_id and (organization_id is null or public.is_org_member(organization_id)));

drop policy if exists "operator_actions_update_own" on public.operator_actions;
create policy "operator_actions_update_own"
on public.operator_actions for update
using (auth.uid() = user_id or public.is_org_member(organization_id))
with check (auth.uid() = user_id and (organization_id is null or public.is_org_member(organization_id)));

drop policy if exists "operator_actions_delete_own" on public.operator_actions;
create policy "operator_actions_delete_own"
on public.operator_actions for delete
using (auth.uid() = user_id or public.is_org_member(organization_id));

drop trigger if exists set_operator_actions_updated_at on public.operator_actions;
create trigger set_operator_actions_updated_at
before update on public.operator_actions
for each row execute function public.set_updated_at();

create table if not exists public.pipeline_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  lane text not null,
  name text not null check (char_length(name) <= 120),
  counterparty text not null default '',
  next_step text not null default '',
  signal text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pipeline_items
add column if not exists organization_id uuid references public.organizations(id) on delete cascade,
add column if not exists user_id uuid references auth.users(id) on delete cascade,
add column if not exists lane text not null default 'podcasts',
add column if not exists name text not null default '',
add column if not exists counterparty text not null default '',
add column if not exists next_step text not null default '',
add column if not exists signal text not null default '',
add column if not exists created_at timestamptz not null default now(),
add column if not exists updated_at timestamptz not null default now();

alter table public.pipeline_items enable row level security;

create index if not exists pipeline_items_user_lane_idx
on public.pipeline_items (user_id, lane, created_at);

create index if not exists pipeline_items_org_lane_idx
on public.pipeline_items (organization_id, lane, created_at);

drop policy if exists "pipeline_items_select_own" on public.pipeline_items;
create policy "pipeline_items_select_own"
on public.pipeline_items for select
using (auth.uid() = user_id or public.is_org_member(organization_id));

drop policy if exists "pipeline_items_insert_own" on public.pipeline_items;
create policy "pipeline_items_insert_own"
on public.pipeline_items for insert
with check (auth.uid() = user_id and (organization_id is null or public.is_org_member(organization_id)));

drop policy if exists "pipeline_items_update_own" on public.pipeline_items;
create policy "pipeline_items_update_own"
on public.pipeline_items for update
using (auth.uid() = user_id or public.is_org_member(organization_id))
with check (auth.uid() = user_id and (organization_id is null or public.is_org_member(organization_id)));

drop policy if exists "pipeline_items_delete_own" on public.pipeline_items;
create policy "pipeline_items_delete_own"
on public.pipeline_items for delete
using (auth.uid() = user_id or public.is_org_member(organization_id));

drop trigger if exists set_pipeline_items_updated_at on public.pipeline_items;
create trigger set_pipeline_items_updated_at
before update on public.pipeline_items
for each row execute function public.set_updated_at();

create table if not exists public.dossier_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  dossier_id text not null,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dossier_notes
add column if not exists organization_id uuid references public.organizations(id) on delete cascade,
add column if not exists user_id uuid references auth.users(id) on delete cascade,
add column if not exists dossier_id text not null default '00-CEO-MASTERPLAN.md',
add column if not exists body text not null default '',
add column if not exists created_at timestamptz not null default now(),
add column if not exists updated_at timestamptz not null default now();

create unique index if not exists dossier_notes_user_dossier_idx
on public.dossier_notes (user_id, dossier_id);

create unique index if not exists dossier_notes_org_dossier_idx
on public.dossier_notes (organization_id, dossier_id)
where organization_id is not null;

alter table public.dossier_notes enable row level security;

drop policy if exists "dossier_notes_select_own" on public.dossier_notes;
create policy "dossier_notes_select_own"
on public.dossier_notes for select
using (auth.uid() = user_id or public.is_org_member(organization_id));

drop policy if exists "dossier_notes_insert_own" on public.dossier_notes;
create policy "dossier_notes_insert_own"
on public.dossier_notes for insert
with check (auth.uid() = user_id and (organization_id is null or public.is_org_member(organization_id)));

drop policy if exists "dossier_notes_update_own" on public.dossier_notes;
create policy "dossier_notes_update_own"
on public.dossier_notes for update
using (auth.uid() = user_id or public.is_org_member(organization_id))
with check (auth.uid() = user_id and (organization_id is null or public.is_org_member(organization_id)));

drop policy if exists "dossier_notes_delete_own" on public.dossier_notes;
create policy "dossier_notes_delete_own"
on public.dossier_notes for delete
using (auth.uid() = user_id or public.is_org_member(organization_id));

drop trigger if exists set_dossier_notes_updated_at on public.dossier_notes;
create trigger set_dossier_notes_updated_at
before update on public.dossier_notes
for each row execute function public.set_updated_at();

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
on public.operator_actions
to authenticated;

grant select, insert, update, delete
on public.pipeline_items
to authenticated;

grant select, insert, update, delete
on public.dossier_notes
to authenticated;

grant select, insert, update
on public.profiles
to authenticated;

grant select, insert, update
on public.organizations
to authenticated;

grant select, insert, update, delete
on public.organization_members
to authenticated;

grant select, insert, update
on public.organization_invitations
to authenticated;

grant select, insert
on public.audit_events
to authenticated;

grant execute on function public.set_updated_at()
to authenticated;

grant execute on function public.handle_new_user()
to authenticated;

grant execute on function public.handle_new_organization()
to authenticated;

grant execute on function public.is_org_member(uuid)
to authenticated;

grant execute on function public.is_org_admin(uuid)
to authenticated;
