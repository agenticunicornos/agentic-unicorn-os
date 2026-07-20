-- Production security hardening: role boundaries and SECURITY DEFINER hygiene.

create or replace function public.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_organization_id is not null
    and exists (
      select 1
      from public.organization_members member
      join public.organizations organization on organization.id = member.organization_id
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
set search_path = ''
as $$
  select target_organization_id is not null
    and exists (
      select 1
      from public.organization_members member
      join public.organizations organization on organization.id = member.organization_id
      where member.organization_id = target_organization_id
        and member.user_id = auth.uid()
        and member.role in ('owner', 'admin')
        and organization.access_state = 'active'
    );
$$;

create or replace function public.is_org_owner(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_organization_id is not null
    and exists (
      select 1 from public.organizations organization
      where organization.id = target_organization_id
        and organization.owner_id = auth.uid()
        and organization.access_state = 'active'
    );
$$;

drop policy if exists "organizations_update_admin" on public.organizations;
create policy "organizations_update_admin" on public.organizations for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "organization_members_insert_admin" on public.organization_members;
create policy "organization_members_insert_admin" on public.organization_members for insert
with check (
  public.is_org_owner(organization_id)
  or (public.is_org_admin(organization_id) and role in ('member', 'viewer'))
);

drop policy if exists "organization_members_update_admin" on public.organization_members;
create policy "organization_members_update_admin" on public.organization_members for update
using (
  public.is_org_owner(organization_id)
  or (public.is_org_admin(organization_id) and role in ('member', 'viewer') and user_id <> auth.uid())
)
with check (
  public.is_org_owner(organization_id)
  or (public.is_org_admin(organization_id) and role in ('member', 'viewer') and user_id <> auth.uid())
);

drop policy if exists "organization_members_delete_admin" on public.organization_members;
create policy "organization_members_delete_admin" on public.organization_members for delete
using (
  public.is_org_owner(organization_id)
  or (public.is_org_admin(organization_id) and role in ('member', 'viewer') and user_id <> auth.uid())
);

drop policy if exists "operator_actions_update_own" on public.operator_actions;
create policy "operator_actions_update_own" on public.operator_actions for update
using (auth.uid() = user_id or public.is_org_admin(organization_id))
with check (
  (auth.uid() = user_id and (organization_id is null or public.is_org_member(organization_id)))
  or public.is_org_admin(organization_id)
);

drop policy if exists "operator_actions_delete_own" on public.operator_actions;
create policy "operator_actions_delete_own" on public.operator_actions for delete
using (auth.uid() = user_id or public.is_org_admin(organization_id));

drop policy if exists "pipeline_items_update_own" on public.pipeline_items;
create policy "pipeline_items_update_own" on public.pipeline_items for update
using (auth.uid() = user_id or public.is_org_admin(organization_id))
with check (
  (auth.uid() = user_id and (organization_id is null or public.is_org_member(organization_id)))
  or public.is_org_admin(organization_id)
);

drop policy if exists "pipeline_items_delete_own" on public.pipeline_items;
create policy "pipeline_items_delete_own" on public.pipeline_items for delete
using (auth.uid() = user_id or public.is_org_admin(organization_id));

drop policy if exists "dossier_notes_update_own" on public.dossier_notes;
create policy "dossier_notes_update_own" on public.dossier_notes for update
using (auth.uid() = user_id or public.is_org_admin(organization_id))
with check (
  (auth.uid() = user_id and (organization_id is null or public.is_org_member(organization_id)))
  or public.is_org_admin(organization_id)
);

drop policy if exists "dossier_notes_delete_own" on public.dossier_notes;
create policy "dossier_notes_delete_own" on public.dossier_notes for delete
using (auth.uid() = user_id or public.is_org_admin(organization_id));

revoke execute on function public.is_org_member(uuid) from public, anon;
revoke execute on function public.is_org_admin(uuid) from public, anon;
revoke execute on function public.is_org_owner(uuid) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_org_admin(uuid) to authenticated;
grant execute on function public.is_org_owner(uuid) to authenticated;
