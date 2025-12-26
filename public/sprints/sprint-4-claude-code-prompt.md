# Sprint 4: Production Logging & Auto-Depletion

## Project Context

I'm continuing development of the NPI (Non-Product Inventory) Manager. Sprints 0-3 are complete (Auth, Inventory, Dashboard, Product Mapping). Now I need to build the production logging system that records production runs and automatically depletes NPI inventory based on BOMs.

## Tech Stack (Already Configured)
- Next.js 16.1.1 with App Router
- TypeScript
- React 19
- Supabase (Auth, Database, Realtime)
- Tailwind CSS 4
- shadcn/ui components

## Your Task

Implement production logging with automatic inventory depletion based on Bill of Materials configurations.

---

## Step 1: Install Additional Components

```bash
npx shadcn@latest add textarea
```

---

## Step 2: Database Schema

Run this migration in Supabase SQL Editor:

```sql
-- Production Logs table
create table public.production_logs (
  id uuid primary key default uuid_generate_v4(),
  cultivera_product_id uuid references public.cultivera_products not null,
  quantity_produced integer not null check (quantity_produced > 0),
  batch_number text,
  notes text,
  status text default 'completed' check (status in ('completed', 'partial', 'failed')),
  depletion_errors jsonb,
  produced_at timestamptz default now(),
  created_by uuid references auth.users
);

create index idx_production_logs_product on public.production_logs(cultivera_product_id);
create index idx_production_logs_date on public.production_logs(produced_at desc);

-- Production Depletion Details table
create table public.production_depletions (
  id uuid primary key default uuid_generate_v4(),
  production_log_id uuid references public.production_logs on delete cascade not null,
  npi_item_id uuid references public.npi_items not null,
  quantity_required numeric not null,
  quantity_depleted numeric not null,
  stock_movement_id uuid references public.stock_movements,
  created_at timestamptz default now()
);

create index idx_production_depletions_log on public.production_depletions(production_log_id);

-- RLS Policies
alter table public.production_logs enable row level security;
alter table public.production_depletions enable row level security;

create policy "Anyone can view production" on public.production_logs for select using (true);
create policy "Users can create production" on public.production_logs for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager', 'user')));

create policy "Anyone can view depletions" on public.production_depletions for select using (true);

-- Main production logging function with auto-depletion
create or replace function public.log_production(
  p_product_id uuid,
  p_quantity integer,
  p_batch_number text default null,
  p_notes text default null
)
returns public.production_logs as $$
declare
  v_log public.production_logs;
  v_bom record;
  v_item public.npi_items;
  v_required numeric;
  v_depleted numeric;
  v_movement public.stock_movements;
  v_errors jsonb := '[]'::jsonb;
  v_status text := 'completed';
begin
  -- Verify product is mapped
  if not exists (select 1 from public.cultivera_products where id = p_product_id and is_mapped = true) then
    raise exception 'Product must be mapped before logging production';
  end if;

  -- Create production log
  insert into public.production_logs (cultivera_product_id, quantity_produced, batch_number, notes, created_by)
  values (p_product_id, p_quantity, p_batch_number, p_notes, auth.uid())
  returning * into v_log;

  -- Process each BOM item
  for v_bom in 
    select bi.*, ni.count as current_count, ni.gram_conversion, ni.name as item_name
    from public.bom_items bi
    join public.npi_items ni on ni.id = bi.npi_item_id
    where bi.cultivera_product_id = p_product_id
  loop
    -- Calculate required quantity (BOM qty * units produced)
    v_required := v_bom.quantity * p_quantity;
    
    -- Apply gram conversion if applicable
    if v_bom.gram_conversion is not null then
      v_required := v_required * v_bom.gram_conversion;
    end if;

    -- Determine actual depletion (cap at available stock)
    v_depleted := least(v_required, v_bom.current_count);

    -- Track insufficient stock
    if v_depleted < v_required then
      v_status := 'partial';
      v_errors := v_errors || jsonb_build_object(
        'npi_item_id', v_bom.npi_item_id,
        'item_name', v_bom.item_name,
        'required', v_required,
        'available', v_bom.current_count,
        'shortage', v_required - v_bom.current_count
      );
    end if;

    -- Update inventory count
    update public.npi_items
    set count = count - v_depleted, updated_by = auth.uid()
    where id = v_bom.npi_item_id
    returning * into v_item;

    -- Create stock movement record
    insert into public.stock_movements 
      (npi_item_id, quantity, previous_count, new_count, movement_type, reference_id, created_by)
    values 
      (v_bom.npi_item_id, -v_depleted, v_bom.current_count, v_item.count, 'production', v_log.id, auth.uid())
    returning * into v_movement;

    -- Create depletion detail record
    insert into public.production_depletions 
      (production_log_id, npi_item_id, quantity_required, quantity_depleted, stock_movement_id)
    values 
      (v_log.id, v_bom.npi_item_id, v_required, v_depleted, v_movement.id);
  end loop;

  -- Update log status if there were errors
  update public.production_logs
  set status = v_status, depletion_errors = case when v_errors != '[]'::jsonb then v_errors else null end
  where id = v_log.id
  returning * into v_log;

  -- Create activity log entry
  insert into public.activity_log (activity_type, title, description, metadata, created_by)
  values ('production', 
    format('%s units produced', p_quantity),
    (select name from public.cultivera_products where id = p_product_id),
    jsonb_build_object('product_id', p_product_id, 'quantity', p_quantity, 'log_id', v_log.id, 'status', v_status),
    auth.uid());

  return v_log;
end;
$$ language plpgsql security definer;

-- Function to get depletion preview
create or replace function public.preview_depletion(
  p_product_id uuid,
  p_quantity integer
)
returns table (
  npi_item_id uuid,
  item_name text,
  category_name text,
  current_count numeric,
  required_amount numeric,
  resulting_count numeric,
  has_shortage boolean
) as $$
begin
  return query
  select 
    ni.id,
    ni.name,
    c.name as category_name,
    ni.count as current_count,
    (bi.quantity * p_quantity * coalesce(ni.gram_conversion, 1)) as required_amount,
    greatest(ni.count - (bi.quantity * p_quantity * coalesce(ni.gram_conversion, 1)), 0) as resulting_count,
    ni.count < (bi.quantity * p_quantity * coalesce(ni.gram_conversion, 1)) as has_shortage
  from public.bom_items bi
  join public.npi_items ni on ni.id = bi.npi_item_id
  join public.categories c on c.id = ni.category_id
  where bi.cultivera_product_id = p_product_id
  order by c.name, ni.name;
end;
$$ language plpgsql security definer;
```

---

## Step 3: TypeScript Types

Create `types/production.ts`:

```typescript
export interface ProductionLog {
  id: string
  cultivera_product_id: string
  quantity_produced: number
  batch_number?: string
  notes?: string
  status: 'completed' | 'partial' | 'failed'
  depletion_errors?: DepletionError[]
  produced_at: string
  created_by?: string
  product?: {
    id: string
    name: string
    sku: string
    product_line?: string
  }
}

export interface DepletionError {
  npi_item_id: string
  item_name: string
  required: number
  available: number
  shortage: number
}

export interface DepletionPreview {
  npi_item_id: string
  item_name: string
  category_name: string
  current_count: number
  required_amount: number
  resulting_count: number
  has_shortage: boolean
}

export interface MappedProduct {
  id: string
  name: string
  sku: string
  product_line?: string
  unit_price: number
}
```

---

## Step 4: Server Actions

Create `lib/actions/production.ts` with:
- `getMappedProducts()` - Get products that have BOMs configured
- `getDepletionPreview(productId, quantity)` - Preview what will be depleted
- `logProduction(formData)` - Log production and deplete inventory
- `getProductionHistory(limit, productId?)` - Get production logs
- `getProductionStats(days)` - Get stats for dashboard

---

## Step 5: Key Components

### Product Search (`components/production/product-search.tsx`)
- Command/combobox for selecting mapped products only
- Shows product name, SKU, and product line

### Depletion Preview (`components/production/depletion-preview.tsx`)
- Lists all BOM items that will be depleted
- Shows current stock, required amount, resulting stock
- Warning indicators for insufficient stock

### Production History (`components/production/production-history.tsx`)
- List of recent production logs
- Shows product, quantity, status, timestamp
- Color-coded status badges

### Production Form (`components/production/production-form.tsx`)
- Product selector (mapped only)
- Quantity input with live depletion preview
- Batch number and notes fields
- Submit with loading state

---

## Step 6: Production Page

Create `app/(dashboard)/production/page.tsx`:
- Stats cards (7-day units, runs, partial depletions)
- Production form with depletion preview
- Production history table

---

## Acceptance Criteria

- [ ] Database tables created (production_logs, production_depletions)
- [ ] Can search and select only mapped products
- [ ] Quantity input updates depletion preview in real-time
- [ ] Preview shows current stock, required, and resulting amounts
- [ ] Insufficient stock items show warning icons
- [ ] Production log creates successfully
- [ ] Inventory counts deplete correctly per BOM
- [ ] gram_conversion applied for ingredient calculations
- [ ] Stock movements created with 'production' type
- [ ] Partial depletion handled gracefully
- [ ] Production status reflects 'completed' or 'partial'
- [ ] depletion_errors JSON populated for partial runs
- [ ] Production history displays with status badges
- [ ] Activity log entry created
- [ ] Stats show 7-day totals
- [ ] Inventory page reflects depleted counts

## Notes

- Only mapped products can be selected for production
- The log_production function handles all depletion atomically in SQL
- gram_conversion converts BOM units to storage units (e.g., grams to kg)
- Partial depletion still logs production but flags the shortage
- All inventory changes create stock_movement records for audit
