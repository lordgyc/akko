-- Ayen inventory approval schema for Supabase.
-- Run this in the Supabase SQL Editor for your project.
--
-- After running it, promote your first admin from the SQL Editor:
-- update public.profiles set role = 'admin' where email = 'you@example.com';

create extension if not exists pgcrypto;
create schema if not exists private;

revoke all on schema private from public;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text not null default 'unit',
  quantity integer not null default 0 check (quantity >= 0),
  low_stock_threshold integer not null default 0 check (low_stock_threshold >= 0),
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists inventory_items_name_unit_idx
on public.inventory_items (lower(name), lower(unit));

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id) on delete restrict,
  movement_type text not null check (movement_type in ('import', 'deduction')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  quantity integer not null check (quantity > 0),
  unit_cost numeric(12, 2) check (unit_cost is null or unit_cost >= 0),
  note text,
  requested_by uuid not null references auth.users(id) default auth.uid(),
  requested_by_email text,
  approved_by uuid references auth.users(id),
  approved_by_email text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stock_movements_item_id_idx on public.stock_movements (item_id);
create index if not exists stock_movements_requested_by_idx on public.stock_movements (requested_by);
create index if not exists stock_movements_status_idx on public.stock_movements (status);
create index if not exists stock_movements_created_at_idx on public.stock_movements (created_at desc);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.is_admin(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = check_user_id
      and role = 'admin'
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.is_admin(auth.uid());
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user')
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();

  return new;
end;
$$;

create or replace function private.guard_inventory_quantity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT'
     and new.quantity <> 0
     and coalesce(current_setting('app.allow_inventory_quantity_change', true), '') <> 'true' then
    raise exception 'Initial quantity must be recorded through an import movement';
  end if;

  if tg_op = 'UPDATE'
     and new.quantity is distinct from old.quantity
     and coalesce(current_setting('app.allow_inventory_quantity_change', true), '') <> 'true' then
    raise exception 'Inventory quantity can only change through approved stock movements';
  end if;

  return new;
end;
$$;

create or replace function private.prepare_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor_id uuid := auth.uid();
  actor_email text;
begin
  if actor_id is null then
    raise exception 'You must be signed in';
  end if;

  select email into actor_email
  from public.profiles
  where id = actor_id;

  if tg_op = 'INSERT' then
    new.requested_by = coalesce(new.requested_by, actor_id);

    if new.requested_by <> actor_id and not private.is_admin(actor_id) then
      raise exception 'Users can only create their own stock movements';
    end if;

    new.requested_by_email = coalesce(actor_email, new.requested_by_email);

    if new.movement_type = 'import' then
      if not private.is_admin(actor_id) then
        raise exception 'Only admins can import stock';
      end if;

      new.status = 'approved';
      new.approved_by = actor_id;
      new.approved_by_email = actor_email;
      new.approved_at = coalesce(new.approved_at, now());
    elsif new.movement_type = 'deduction' then
      new.status = 'pending';
      new.approved_by = null;
      new.approved_by_email = null;
      new.approved_at = null;
    else
      raise exception 'Unknown movement type';
    end if;

    return new;
  end if;

  if old.status <> 'pending' then
    raise exception 'Only pending movement requests can be changed';
  end if;

  if not private.is_admin(actor_id) then
    raise exception 'Only admins can approve or reject stock movements';
  end if;

  if new.item_id is distinct from old.item_id
     or new.movement_type is distinct from old.movement_type
     or new.quantity is distinct from old.quantity
     or new.requested_by is distinct from old.requested_by then
    raise exception 'Pending movement details cannot be changed during approval';
  end if;

  if new.status not in ('approved', 'rejected') then
    raise exception 'Pending movements can only be approved or rejected';
  end if;

  new.approved_by = actor_id;
  new.approved_by_email = actor_email;
  new.approved_at = now();
  new.updated_at = now();

  return new;
end;
$$;

create or replace function private.apply_approved_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'approved' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status = 'approved' then
    return new;
  end if;

  perform set_config('app.allow_inventory_quantity_change', 'true', true);

  if new.movement_type = 'import' then
    update public.inventory_items
    set quantity = quantity + new.quantity
    where id = new.item_id;
  elsif new.movement_type = 'deduction' then
    update public.inventory_items
    set quantity = quantity - new.quantity
    where id = new.item_id
      and quantity >= new.quantity;

    if not found then
      raise exception 'Insufficient stock for this deduction';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

drop trigger if exists inventory_items_guard_quantity on public.inventory_items;
create trigger inventory_items_guard_quantity
before insert or update on public.inventory_items
for each row execute function private.guard_inventory_quantity();

drop trigger if exists inventory_items_set_updated_at on public.inventory_items;
create trigger inventory_items_set_updated_at
before update on public.inventory_items
for each row execute function private.set_updated_at();

drop trigger if exists stock_movements_prepare on public.stock_movements;
create trigger stock_movements_prepare
before insert or update on public.stock_movements
for each row execute function private.prepare_stock_movement();

drop trigger if exists stock_movements_apply on public.stock_movements;
create trigger stock_movements_apply
after insert or update on public.stock_movements
for each row execute function private.apply_approved_stock_movement();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

insert into public.profiles (id, email, role)
select id, email, 'user'
from auth.users
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.inventory_items enable row level security;
alter table public.stock_movements enable row level security;

grant usage on schema public to authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_admin(uuid) to authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.inventory_items to authenticated;
grant select, insert, update on public.stock_movements to authenticated;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id or (select private.is_admin()));

drop policy if exists "profiles_admin_update_roles" on public.profiles;
create policy "profiles_admin_update_roles"
on public.profiles
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

drop policy if exists "inventory_items_select_authenticated" on public.inventory_items;
create policy "inventory_items_select_authenticated"
on public.inventory_items
for select
to authenticated
using (true);

drop policy if exists "inventory_items_admin_insert" on public.inventory_items;
create policy "inventory_items_admin_insert"
on public.inventory_items
for insert
to authenticated
with check ((select private.is_admin()));

drop policy if exists "inventory_items_admin_update" on public.inventory_items;
create policy "inventory_items_admin_update"
on public.inventory_items
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

drop policy if exists "inventory_items_admin_delete" on public.inventory_items;
create policy "inventory_items_admin_delete"
on public.inventory_items
for delete
to authenticated
using ((select private.is_admin()));

drop policy if exists "stock_movements_select_own_or_admin" on public.stock_movements;
create policy "stock_movements_select_own_or_admin"
on public.stock_movements
for select
to authenticated
using (requested_by = (select auth.uid()) or (select private.is_admin()));

drop policy if exists "stock_movements_insert_requests" on public.stock_movements;
create policy "stock_movements_insert_requests"
on public.stock_movements
for insert
to authenticated
with check (
  requested_by = (select auth.uid())
  and (
    (movement_type = 'deduction' and status = 'pending')
    or
    (movement_type = 'import' and status = 'approved' and (select private.is_admin()))
  )
);

drop policy if exists "stock_movements_admin_approval_update" on public.stock_movements;
create policy "stock_movements_admin_approval_update"
on public.stock_movements
for update
to authenticated
using (
  (select private.is_admin())
  and status = 'pending'
  and movement_type = 'deduction'
)
with check (
  (select private.is_admin())
  and status in ('approved', 'rejected')
  and movement_type = 'deduction'
);
