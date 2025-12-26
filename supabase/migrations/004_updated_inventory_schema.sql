-- =============================================
-- Sprint 2: Updated Inventory Schema
-- Matches NPI_v3_Updated.xlsx column structure
-- Adds review/onboarding workflow support
-- =============================================

-- ============================================
-- STEP 1: Add sub_categories table
-- ============================================
ALTER TABLE public.npi_items ALTER COLUMN unit_cost SET DEFAULT 0;

ALTER TABLE public.npi_items DROP CONSTRAINT IF EXISTS npi_items_category_check;

create table if not exists public.sub_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references public.categories on delete cascade not null,
  created_at timestamptz default now(),
  unique(name, category_id)
);

-- Insert sub-categories for Ingredients
insert into public.sub_categories (name, category_id)
select sc.name, c.id
from (values
  ('Cannabinoids & Terpenes'),
  ('Essential Oils'),
  ('Flavoring'),
  ('Formulation Oils & Butters'),
  ('Gummy Ingredients'),
  ('Supplements')
) as sc(name)
cross join public.categories c
where c.name = 'Ingredients'
on conflict (name, category_id) do nothing;

-- Insert sub-categories for Packaging
insert into public.sub_categories (name, category_id)
select sc.name, c.id
from (values
  ('Beverage Packaging'),
  ('Cartridge & Concentrates Packaging'),
  ('Edible Packaging'),
  ('Flower Packaging'),
  ('Gummy Packaging'),
  ('Tincture Packaging'),
  ('Topical Packaging'),
  ('Other Packaging')
) as sc(name)
cross join public.categories c
where c.name = 'Packaging'
on conflict (name, category_id) do nothing;

-- Insert sub-categories for Labels
insert into public.sub_categories (name, category_id)
select sc.name, c.id
from (values
  ('Gummy/Edible Labels'),
  ('Tincture Labels'),
  ('Topical Labels'),
  ('Dymo Labels'),
  ('Primera Printer Supplies'),
  ('Other Labels')
) as sc(name)
cross join public.categories c
where c.name = 'Labels'
on conflict (name, category_id) do nothing;

-- Insert sub-categories for Supplies
insert into public.sub_categories (name, category_id)
select sc.name, c.id
from (values
  ('Extraction Supplies'),
  ('Sanitation'),
  ('Packing Supplies'),
  ('Other')
) as sc(name)
cross join public.categories c
where c.name = 'Supplies'
on conflict (name, category_id) do nothing;

-- Enable RLS on sub_categories
alter table public.sub_categories enable row level security;

create policy "Anyone can view sub_categories" on public.sub_categories for select using (true);

-- Fixed: Added WITH CHECK clause for INSERT/UPDATE operations
create policy "Admins can manage sub_categories" on public.sub_categories for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ============================================
-- STEP 2: Update npi_items table structure
-- ============================================

-- Add new columns to match NPI_v3_Updated.xlsx
-- Note: gram_conversion already exists from migration 002
alter table public.npi_items
  add column if not exists sub_category_id uuid references public.sub_categories,
  add column if not exists pkg_size numeric,
  add column if not exists price numeric,
  add column if not exists lead_time text,
  add column if not exists source text,
  add column if not exists staff text,
  add column if not exists notes text,
  add column if not exists needs_review boolean default false,
  add column if not exists review_source text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users;

-- Create index for review queue
create index if not exists idx_npi_items_needs_review on public.npi_items(needs_review) where needs_review = true;
create index if not exists idx_npi_items_sub_category on public.npi_items(sub_category_id);

-- ============================================
-- STEP 3: Create view for inventory with calculated fields
-- ============================================

create or replace view public.npi_items_view as
select
  i.*,
  c.name as category_name,
  c.color as category_color,
  sc.name as sub_category_name,
  l.name as location_name,
  -- Calculated stock value
  coalesce(i.count, 0) * coalesce(i.unit_cost, 0) as stock_value,
  -- Stock status based on desired_count
  case
    when i.desired_count is null or i.desired_count = 0 then 'unknown'
    when i.count <= i.desired_count * 0.2 then 'critical'
    when i.count <= i.desired_count * 0.5 then 'warning'
    else 'healthy'
  end as stock_status
from public.npi_items i
left join public.categories c on i.category_id = c.id
left join public.sub_categories sc on i.sub_category_id = sc.id
left join public.locations l on i.location_id = l.id;

-- ============================================
-- STEP 4: Function to mark item as reviewed
-- ============================================

create or replace function public.complete_item_review(
  p_item_id uuid,
  p_updates jsonb default '{}'::jsonb
)
returns public.npi_items as $$
declare
  v_item public.npi_items;
begin
  update public.npi_items
  set
    needs_review = false,
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    updated_at = now(),
    updated_by = auth.uid(),
    -- Apply optional updates from jsonb
    count = coalesce((p_updates->>'count')::numeric, count),
    unit_cost = coalesce((p_updates->>'unit_cost')::numeric, unit_cost),
    uom = coalesce(p_updates->>'uom', uom),
    desired_count = coalesce((p_updates->>'desired_count')::numeric, desired_count),
    location_id = coalesce((p_updates->>'location_id')::uuid, location_id),
    source = coalesce(p_updates->>'source', source),
    notes = coalesce(p_updates->>'notes', notes),
    is_active = coalesce((p_updates->>'is_active')::boolean, is_active)
  where id = p_item_id
  returning * into v_item;

  -- Log the review action
  perform public.log_audit_entry(
    auth.uid(),
    'item_reviewed',
    'npi_item',
    p_item_id,
    jsonb_build_object('updates', p_updates)
  );

  return v_item;
end;
$$ language plpgsql security definer;

-- ============================================
-- STEP 5: Function to skip/archive review item
-- ============================================

create or replace function public.skip_item_review(
  p_item_id uuid,
  p_deactivate boolean default false
)
returns public.npi_items as $$
declare
  v_item public.npi_items;
begin
  update public.npi_items
  set
    needs_review = false,
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    updated_at = now(),
    is_active = case when p_deactivate then false else is_active end
  where id = p_item_id
  returning * into v_item;

  perform public.log_audit_entry(
    auth.uid(),
    case when p_deactivate then 'item_archived' else 'item_review_skipped' end,
    'npi_item',
    p_item_id,
    jsonb_build_object('deactivated', p_deactivate)
  );

  return v_item;
end;
$$ language plpgsql security definer;

-- ============================================
-- STEP 6: Add White Label category
-- ============================================

insert into public.categories (name, color) values
  ('White Label', '#ec4899')
on conflict (name) do nothing;

-- Insert White Label sub-categories
insert into public.sub_categories (name, category_id)
select sc.name, c.id
from (values
  ('Crunchy Labels'),
  ('RVAC Labels'),
  ('LYT Labels'),
  ('Root Source Labels'),
  ('Skooma Labels'),
  ('CBD Shoppe Labels'),
  ('Blue Ridge Distro Labels'),
  ('Other White Label')
) as sc(name)
cross join public.categories c
where c.name = 'White Label'
on conflict (name, category_id) do nothing;
