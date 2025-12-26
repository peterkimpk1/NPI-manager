# Sprint 3: Product Mapping & BOM Configuration

## Project Context

I'm continuing development of the NPI (Non-Product Inventory) Manager. Sprints 0-2 are complete (Auth, Inventory, Dashboard). Now I need to build the product mapping system that links Cultivera products to their Bill of Materials (NPI items).

**Reference Mockups:** unmapped-queue.html, product-linker.html

## Tech Stack (Already Configured)
- Next.js 16.1.1 with App Router
- TypeScript
- React 19
- Supabase (Auth, Database, Realtime)
- Tailwind CSS 4
- shadcn/ui components

## Your Task

Implement the product mapping flow: Cultivera CSV import, unmapped products queue, and the BOM linker interface.

---

## Step 1: Install Additional Components

```bash
npx shadcn@latest add command tabs progress
npm install papaparse @types/papaparse
```

---

## Step 2: Database Schema

Run this migration in Supabase SQL Editor:

```sql
-- Cultivera Products table
create table public.cultivera_products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  sku text not null unique,
  product_line text,
  category text,
  package_size text,
  unit_price numeric default 0,
  is_mapped boolean default false,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_cultivera_products_sku on public.cultivera_products(sku);
create index idx_cultivera_products_mapped on public.cultivera_products(is_mapped);
create index idx_cultivera_products_line on public.cultivera_products(product_line);

-- Bill of Materials table
create table public.bom_items (
  id uuid primary key default uuid_generate_v4(),
  cultivera_product_id uuid references public.cultivera_products on delete cascade not null,
  npi_item_id uuid references public.npi_items on delete cascade not null,
  quantity numeric not null default 1 check (quantity > 0),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(cultivera_product_id, npi_item_id)
);

create index idx_bom_items_product on public.bom_items(cultivera_product_id);
create index idx_bom_items_npi on public.bom_items(npi_item_id);

-- RLS Policies
alter table public.cultivera_products enable row level security;
alter table public.bom_items enable row level security;

create policy "Anyone can view products" on public.cultivera_products for select using (true);
create policy "Managers can insert products" on public.cultivera_products for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager')));
create policy "Managers can update products" on public.cultivera_products for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager')));

create policy "Anyone can view BOM" on public.bom_items for select using (true);
create policy "Users can manage BOM" on public.bom_items for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager', 'user')));

-- Triggers
create trigger cultivera_products_updated_at
  before update on public.cultivera_products
  for each row execute function public.update_updated_at();

create trigger bom_items_updated_at
  before update on public.bom_items
  for each row execute function public.update_updated_at();

-- Function to mark product as mapped
create or replace function public.mark_product_mapped(p_product_id uuid)
returns public.cultivera_products as $$
declare
  v_product public.cultivera_products;
  v_ingredient_count integer;
  v_packaging_count integer;
begin
  select count(*) into v_ingredient_count
  from public.bom_items bi
  join public.npi_items ni on ni.id = bi.npi_item_id
  join public.categories c on c.id = ni.category_id
  where bi.cultivera_product_id = p_product_id and c.name = 'Ingredients';

  select count(*) into v_packaging_count
  from public.bom_items bi
  join public.npi_items ni on ni.id = bi.npi_item_id
  join public.categories c on c.id = ni.category_id
  where bi.cultivera_product_id = p_product_id and c.name in ('Packaging', 'Labels');

  if v_ingredient_count = 0 then
    raise exception 'At least one ingredient is required';
  end if;

  if v_packaging_count = 0 then
    raise exception 'At least one packaging or label item is required';
  end if;

  update public.cultivera_products set is_mapped = true where id = p_product_id returning * into v_product;

  insert into public.activity_log (activity_type, title, description, metadata, created_by)
  values ('mapping', 'Product Mapped', v_product.name, 
    jsonb_build_object('product_id', p_product_id, 'sku', v_product.sku), auth.uid());

  return v_product;
end;
$$ language plpgsql security definer;

-- Function to get BOM cost summary
create or replace function public.get_bom_cost(p_product_id uuid)
returns table (ingredients_cost numeric, packaging_cost numeric, total_cost numeric) as $$
begin
  return query
  select 
    coalesce(sum(case when c.name = 'Ingredients' then bi.quantity * ni.unit_cost else 0 end), 0),
    coalesce(sum(case when c.name in ('Packaging', 'Labels') then bi.quantity * ni.unit_cost else 0 end), 0),
    coalesce(sum(bi.quantity * ni.unit_cost), 0)
  from public.bom_items bi
  join public.npi_items ni on ni.id = bi.npi_item_id
  join public.categories c on c.id = ni.category_id
  where bi.cultivera_product_id = p_product_id;
end;
$$ language plpgsql security definer;
```

---

## Step 3: TypeScript Types

Create `types/products.ts`:

```typescript
export interface CultiverProduct {
  id: string
  name: string
  sku: string
  product_line?: string
  category?: string
  package_size?: string
  unit_price: number
  is_mapped: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BomItem {
  id: string
  cultivera_product_id: string
  npi_item_id: string
  quantity: number
  notes?: string
  created_at: string
  updated_at: string
  npi_item?: {
    id: string
    name: string
    category: { id: string; name: string }
    location: { name: string }
    count: number
    uom: string
    unit_cost: number
  }
}

export interface BomCostSummary {
  ingredients_cost: number
  packaging_cost: number
  total_cost: number
}

export interface ProductWithBom extends CultiverProduct {
  bom_items?: BomItem[]
  cost_summary?: BomCostSummary
}

export interface MappingProgress {
  total: number
  mapped: number
  percentage: number
  byProductLine: { name: string; total: number; mapped: number }[]
}
```

---

## Step 4: Server Actions

Create `lib/actions/products.ts` with functions for:
- `getMappingProgress()` - Get mapping statistics
- `getUnmappedProducts(search?, productLine?)` - Fetch unmapped products with filters
- `getProductWithBom(productId)` - Get product with its BOM items and costs
- `searchNpiItems(query)` - Search NPI items for BOM builder
- `addBomItem(productId, formData)` - Add item to BOM
- `updateBomItemQuantity(bomItemId, quantity)` - Update quantity
- `removeBomItem(bomItemId)` - Remove from BOM
- `markProductMapped(productId)` - Validate and mark as mapped
- `importCultiveraCSV(csvData)` - Import products from CSV
- `getProductLines()` - Get unique product lines for filtering

---

## Step 5: Key Components to Build

### Progress Ring (`components/products/progress-ring.tsx`)
SVG-based circular progress indicator showing mapping percentage.

### Unmapped Queue (`components/products/unmapped-queue.tsx`)
- Search input for name/SKU
- Product line dropdown filter
- List of unmapped products with:
  - Product name and SKU
  - "NEW" badge for recent additions (< 24h)
  - Product line badge with color coding
  - "Link BOM" button

### NPI Search (`components/products/npi-search.tsx`)
- Command/combobox for searching NPI items
- Shows item name, category, cost, and stock level
- Excludes items already in BOM

### BOM List (`components/products/bom-list.tsx`)
- List of added BOM items
- Editable quantity inputs
- Cost per item calculation
- Remove button

### Cost Summary (`components/products/cost-summary.tsx`)
- Total NPI cost per unit
- Ingredients cost breakdown
- Packaging cost breakdown
- Unit price and gross margin

### Validation Panel (`components/products/validation-panel.tsx`)
- Checklist: ingredient attached, packaging attached, quantities valid
- Low stock warnings
- Save Draft / Mark as Mapped buttons

---

## Step 6: Page Structure

### `/products` - Unmapped Queue Page
- Header with Sync Cultivera button
- Progress section with ring and product line cards
- Filterable unmapped products list

### `/products/[id]` - Product Linker Page
- Back link to queue
- Product header with metadata
- Two-column layout:
  - Left: BOM builder (search + list + tabs)
  - Right: Cost summary + validation panel

---

## Acceptance Criteria

- [ ] Progress ring displays correct mapping percentage
- [ ] Product line summary cards show unmapped counts
- [ ] Queue filterable by search and product line
- [ ] New products show "NEW" badge
- [ ] NPI search excludes already-added items
- [ ] Can add/update/remove BOM items
- [ ] Cost calculations update in real-time
- [ ] Validation prevents mapping without ingredients/packaging
- [ ] Low stock warnings display
- [ ] Mark as Mapped validates and redirects
- [ ] CSV import creates/updates products
- [ ] Activity log entry created on mapping

## Notes

- SKU is unique identifier for product upserts
- BOM validation requires 1+ ingredient AND 1+ packaging/label
- Cost uses unit_cost from npi_items multiplied by BOM quantity
