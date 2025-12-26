-- Sprint 2: Dashboard & Alerts
-- Creates activity_log and sync_status tables for dashboard functionality

-- Activity Log table for tracking all inventory actions
create table public.activity_log (
  id uuid primary key default uuid_generate_v4(),
  activity_type text not null check (activity_type in ('production', 'restock', 'sync', 'adjustment', 'mapping')),
  title text not null,
  description text,
  metadata jsonb,
  created_at timestamptz default now(),
  created_by uuid references auth.users
);

create index idx_activity_log_date on public.activity_log(created_at desc);
create index idx_activity_log_type on public.activity_log(activity_type);

-- Sync Status table for tracking Cultivera syncs
create table public.sync_status (
  id uuid primary key default uuid_generate_v4(),
  sync_type text not null check (sync_type in ('cultivera', 'npi_import')),
  status text not null check (status in ('pending', 'in_progress', 'completed', 'failed')),
  records_processed integer default 0,
  records_total integer default 0,
  error_message text,
  started_at timestamptz default now(),
  completed_at timestamptz,
  created_by uuid references auth.users
);

create index idx_sync_status_date on public.sync_status(started_at desc);

-- RLS Policies
alter table public.activity_log enable row level security;
alter table public.sync_status enable row level security;

create policy "Anyone can view activity" on public.activity_log for select using (true);
create policy "Users can create activity" on public.activity_log for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager', 'user')));

create policy "Anyone can view sync status" on public.sync_status for select using (true);
create policy "Managers can create sync" on public.sync_status for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager')));
create policy "Managers can update sync" on public.sync_status for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager')));

-- Update restock_item function to log activity automatically
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
  set count = count + p_quantity, updated_by = auth.uid()
  where id = p_item_id
  returning * into v_item;

  insert into public.stock_movements (npi_item_id, quantity, previous_count, new_count, movement_type, notes, created_by)
  values (p_item_id, p_quantity, v_prev_count, v_item.count, 'restock', p_notes, auth.uid());

  -- Log activity for dashboard feed
  insert into public.activity_log (activity_type, title, description, metadata, created_by)
  values ('restock',
    format('%s units added', p_quantity::text),
    v_item.name,
    jsonb_build_object('item_id', p_item_id, 'quantity', p_quantity, 'new_count', v_item.count),
    auth.uid());

  return v_item;
end;
$$ language plpgsql security definer;
