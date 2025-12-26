-- Sprint 1: Inventory Core - Database Schema Update
-- Run this migration in Supabase SQL Editor
-- This updates the existing npi_items table and adds new tables

-- ============================================
-- STEP 1: Create categories and locations tables
-- ============================================

-- Categories table
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#06b6d4',
  icon text,
  created_at timestamptz default now()
);

insert into public.categories (name, color) values
  ('Ingredients', '#22c55e'),
  ('Packaging', '#06b6d4'),
  ('Labels', '#8b5cf6'),
  ('Supplies', '#f97316')
on conflict (name) do nothing;

-- Locations table
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz default now()
);

insert into public.locations (name) values
  ('Extraction Room'),
  ('Formulation Room'),
  ('Gummy Room'),
  ('Rear Storage'),
  ('Office'),
  ('Restroom Storage')
on conflict (name) do nothing;

-- ============================================
-- STEP 2: Alter existing npi_items table
-- ============================================

-- Add new columns to npi_items
alter table public.npi_items
  add column if not exists category_id uuid references public.categories,
  add column if not exists location_id uuid references public.locations,
  add column if not exists reorder_point numeric,
  add column if not exists is_active boolean default true,
  add column if not exists created_by uuid references auth.users,
  add column if not exists updated_by uuid references auth.users;

-- Rename 'desired' to 'desired_count' if it exists
do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'npi_items' and column_name = 'desired') then
    alter table public.npi_items rename column desired to desired_count;
  end if;
end $$;

-- Migrate existing category text to category_id
update public.npi_items
set category_id = c.id
from public.categories c
where public.npi_items.category = c.name
  and public.npi_items.category_id is null;

-- Migrate existing location text to location_id
update public.npi_items
set location_id = l.id
from public.locations l
where public.npi_items.location = l.name
  and public.npi_items.location_id is null;

-- Set default location for items without one
update public.npi_items
set location_id = (select id from public.locations where name = 'Rear Storage' limit 1)
where location_id is null;

-- Create indexes
create index if not exists idx_npi_items_category on public.npi_items(category_id);
create index if not exists idx_npi_items_location on public.npi_items(location_id);
create index if not exists idx_npi_items_active on public.npi_items(is_active) where is_active = true;

-- ============================================
-- STEP 3: Create stock_movements table
-- ============================================

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  npi_item_id uuid references public.npi_items on delete cascade not null,
  quantity numeric not null,
  previous_count numeric not null,
  new_count numeric not null,
  movement_type text not null check (movement_type in ('restock', 'adjustment', 'production', 'initial')),
  reference_id uuid,
  notes text,
  created_at timestamptz default now(),
  created_by uuid references auth.users
);

create index if not exists idx_stock_movements_item on public.stock_movements(npi_item_id);
create index if not exists idx_stock_movements_date on public.stock_movements(created_at desc);

-- ============================================
-- STEP 4: Enable RLS on new tables
-- ============================================

alter table public.categories enable row level security;
alter table public.locations enable row level security;
alter table public.stock_movements enable row level security;

-- RLS Policies for categories
drop policy if exists "Anyone can view categories" on public.categories;
create policy "Anyone can view categories" on public.categories for select using (true);

drop policy if exists "Admins can manage categories" on public.categories;
create policy "Admins can manage categories" on public.categories for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- RLS Policies for locations
drop policy if exists "Anyone can view locations" on public.locations;
create policy "Anyone can view locations" on public.locations for select using (true);

drop policy if exists "Admins can manage locations" on public.locations;
create policy "Admins can manage locations" on public.locations for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- RLS Policies for stock_movements
drop policy if exists "Anyone can view movements" on public.stock_movements;
create policy "Anyone can view movements" on public.stock_movements for select using (true);

drop policy if exists "Users can create movements" on public.stock_movements;
create policy "Users can create movements" on public.stock_movements for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager', 'user')));

-- ============================================
-- STEP 5: Create helper functions
-- ============================================

-- Function for restocking with movement tracking
create or replace function public.restock_item(
  p_item_id uuid,
  p_quantity numeric,
  p_notes text default null
)
returns public.npi_items as $$
declare
  v_item public.npi_items;
  v_prev_count numeric;
begin
  select count into v_prev_count from public.npi_items where id = p_item_id;

  update public.npi_items
  set count = count + p_quantity, updated_by = auth.uid(), updated_at = now()
  where id = p_item_id
  returning * into v_item;

  insert into public.stock_movements (npi_item_id, quantity, previous_count, new_count, movement_type, notes, created_by)
  values (p_item_id, p_quantity, v_prev_count, v_item.count, 'restock', p_notes, auth.uid());

  return v_item;
end;
$$ language plpgsql security definer;

-- Function for adjusting stock
create or replace function public.adjust_stock(
  p_item_id uuid,
  p_new_count numeric,
  p_notes text default null
)
returns public.npi_items as $$
declare
  v_item public.npi_items;
  v_prev_count numeric;
  v_diff numeric;
begin
  select count into v_prev_count from public.npi_items where id = p_item_id;
  v_diff := p_new_count - v_prev_count;

  update public.npi_items
  set count = p_new_count, updated_by = auth.uid(), updated_at = now()
  where id = p_item_id
  returning * into v_item;

  insert into public.stock_movements (npi_item_id, quantity, previous_count, new_count, movement_type, notes, created_by)
  values (p_item_id, v_diff, v_prev_count, v_item.count, 'adjustment', p_notes, auth.uid());

  return v_item;
end;
$$ language plpgsql security definer;

-- ============================================
-- STEP 6: Enable realtime
-- ============================================

-- Enable realtime for npi_items table (ignore error if already added)
do $$
begin
  alter publication supabase_realtime add table public.npi_items;
exception when others then
  null; -- Ignore if already added
end $$;
