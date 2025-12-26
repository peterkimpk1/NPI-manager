# Sprint 2: Dashboard & Alerts

## Project Context

I'm continuing development of the NPI (Non-Product Inventory) Manager. Sprint 0 (Auth) and Sprint 1 (Inventory Core) are complete. Now I need to build the main dashboard with status cards, alerts, activity feed, and quick actions.

**Reference Mockup:** npi-dashboard.html

## Tech Stack (Already Configured)
- Next.js 16.1.1 with App Router
- TypeScript
- React 19
- Supabase (Auth, Database, Realtime)
- Tailwind CSS 4
- shadcn/ui components

## Your Task

Implement the dashboard home page with inventory status overview, action-required alerts, activity feed, and quick actions.

---

## Step 1: Database Schema Additions

Run this migration in Supabase SQL Editor:

```sql
-- Activity Log table
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

-- Sync Status table
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

-- Update restock_item function to log activity
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
  
  -- Log activity
  insert into public.activity_log (activity_type, title, description, metadata, created_by)
  values ('restock', 
    format('%s units added', p_quantity::text), 
    v_item.name,
    jsonb_build_object('item_id', p_item_id, 'quantity', p_quantity, 'new_count', v_item.count),
    auth.uid());
  
  return v_item;
end;
$$ language plpgsql security definer;
```

---

## Step 2: TypeScript Types

Add to `types/dashboard.ts`:

```typescript
export interface ActivityItem {
  id: string
  activity_type: 'production' | 'restock' | 'sync' | 'adjustment' | 'mapping'
  title: string
  description?: string
  metadata?: Record<string, any>
  created_at: string
  created_by?: string
}

export interface SyncStatus {
  id: string
  sync_type: 'cultivera' | 'npi_import'
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  records_processed: number
  records_total: number
  error_message?: string
  started_at: string
  completed_at?: string
}

export interface DashboardStats {
  critical: number
  warning: number
  healthy: number
  criticalItems: ActionItem[]
  warningItems: ActionItem[]
}

export interface ActionItem {
  id: string
  name: string
  count: number
  desired_count: number
  location: string
  status: 'critical' | 'warning'
}

export interface UnmappedProduct {
  id: string
  name: string
  sku: string
  product_line?: string
}
```

---

## Step 3: Server Actions

Create `lib/actions/dashboard.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import type { DashboardStats, ActivityItem, ActionItem, UnmappedProduct } from '@/types/dashboard'
import type { NpiItem } from '@/types/inventory'

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient()
  
  const { data: items } = await supabase
    .from('npi_items')
    .select('id, name, count, desired_count, location:locations(name)')
    .eq('is_active', true)
  
  let critical = 0, warning = 0, healthy = 0
  const criticalItems: ActionItem[] = []
  const warningItems: ActionItem[] = []

  (items || []).forEach((item: any) => {
    if (!item.desired_count) {
      healthy++
      return
    }

    const ratio = item.count / item.desired_count

    if (ratio <= 0.2) {
      critical++
      criticalItems.push({
        id: item.id,
        name: item.name,
        count: item.count,
        desired_count: item.desired_count,
        location: item.location?.name || 'Unknown',
        status: 'critical',
      })
    } else if (ratio <= 0.5) {
      warning++
      warningItems.push({
        id: item.id,
        name: item.name,
        count: item.count,
        desired_count: item.desired_count,
        location: item.location?.name || 'Unknown',
        status: 'warning',
      })
    } else {
      healthy++
    }
  })

  return {
    critical,
    warning,
    healthy,
    criticalItems: criticalItems.slice(0, 5),
    warningItems: warningItems.slice(0, 5),
  }
}

export async function getRecentActivity(limit: number = 5): Promise<ActivityItem[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data || []
}

export async function getLastSyncTime(): Promise<string | null> {
  const supabase = await createClient()
  
  const { data } = await supabase
    .from('sync_status')
    .select('completed_at')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .single()
  
  return data?.completed_at || null
}

export async function getUnmappedProducts(limit: number = 3): Promise<UnmappedProduct[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('cultivera_products')
    .select('id, name, sku, product_line')
    .eq('is_mapped', false)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) {
    // Table might not exist yet (Sprint 3)
    return []
  }
  
  return data || []
}

export async function getUnmappedCount(): Promise<number> {
  const supabase = await createClient()
  
  const { count, error } = await supabase
    .from('cultivera_products')
    .select('*', { count: 'exact', head: true })
    .eq('is_mapped', false)
  
  if (error) return 0
  return count || 0
}
```

---

## Step 4: Status Cards Component

Create `components/dashboard/status-cards.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react'
import type { DashboardStats } from '@/types/dashboard'

interface StatusCardsProps {
  stats: DashboardStats
}

export function StatusCards({ stats }: StatusCardsProps) {
  const cards = [
    {
      label: 'Critical Stock',
      sublabel: 'Below reorder point',
      count: stats.critical,
      icon: AlertTriangle,
      color: 'red',
      href: '/inventory?status=critical',
    },
    {
      label: 'Running Low',
      sublabel: 'Within 50% of threshold',
      count: stats.warning,
      icon: Clock,
      color: 'yellow',
      href: '/inventory?status=warning',
    },
    {
      label: 'Healthy Stock',
      sublabel: 'Above desired levels',
      count: stats.healthy,
      icon: CheckCircle,
      color: 'green',
      href: '/inventory?status=healthy',
    },
  ]

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {cards.map((card) => (
        <Link
          key={card.label}
          href={card.href}
          className={`
            bg-bg-card border border-border rounded-2xl p-6 relative overflow-hidden
            transition-all hover:border-border-hover hover:-translate-y-0.5
            before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px]
            before:bg-gradient-to-r before:from-accent-${card.color} before:to-transparent
          `}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-accent-${card.color}-dim text-accent-${card.color}`}>
            <card.icon className="w-6 h-6" />
          </div>
          <div className={`text-4xl font-bold font-mono tracking-tight mb-1 text-accent-${card.color}`}>
            {card.count}
          </div>
          <div className="text-sm font-medium text-text-secondary">{card.label}</div>
          <div className="text-xs text-text-muted">{card.sublabel}</div>
        </Link>
      ))}
    </section>
  )
}
```

---

## Step 5: Action Required Panel

Create `components/dashboard/action-required.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { MapPin, Package, Tag, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { ActionItem } from '@/types/dashboard'

interface ActionRequiredProps {
  criticalItems: ActionItem[]
  warningItems: ActionItem[]
}

export function ActionRequired({ criticalItems, warningItems }: ActionRequiredProps) {
  const allItems = [...criticalItems, ...warningItems].slice(0, 5)
  const totalCount = criticalItems.length + warningItems.length

  const getIcon = (name: string) => {
    if (name.toLowerCase().includes('label')) return Tag
    return Package
  }

  return (
    <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex justify-between items-center px-6 py-4 border-b border-border">
        <h2 className="font-semibold flex items-center gap-2">
          Action Required
          <Badge variant="secondary" className="bg-accent-red-dim text-accent-red font-mono">
            {totalCount}
          </Badge>
        </h2>
        <Link 
          href="/inventory?status=critical" 
          className="text-sm text-accent-cyan hover:underline flex items-center gap-1"
        >
          View All
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="divide-y divide-border">
        {allItems.map((item) => {
          const Icon = getIcon(item.name)
          return (
            <Link
              key={item.id}
              href={`/inventory?search=${encodeURIComponent(item.name)}`}
              className="flex items-center gap-4 px-6 py-4 hover:bg-bg-tertiary transition-colors"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-accent-${item.status === 'critical' ? 'red' : 'yellow'}-dim text-accent-${item.status === 'critical' ? 'red' : 'yellow'}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{item.name}</div>
                <div className="text-xs text-text-muted flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {item.location}
                </div>
              </div>
              <div className="text-right">
                <div className={`font-mono font-semibold text-accent-${item.status === 'critical' ? 'red' : 'yellow'}`}>
                  {item.count}
                </div>
                <div className="text-xs text-text-muted">of {item.desired_count} min</div>
              </div>
            </Link>
          )
        })}

        {allItems.length === 0 && (
          <div className="px-6 py-8 text-center text-text-muted">
            All items are well stocked!
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## Step 6: Unmapped Products Preview

Create `components/dashboard/unmapped-preview.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { Package, Link as LinkIcon, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { UnmappedProduct } from '@/types/dashboard'

interface UnmappedPreviewProps {
  products: UnmappedProduct[]
  totalCount: number
}

export function UnmappedPreview({ products, totalCount }: UnmappedPreviewProps) {
  if (products.length === 0) return null

  return (
    <div className="mt-6 border-t border-border">
      <div className="flex justify-between items-center px-6 py-4 border-b border-border">
        <h2 className="font-semibold flex items-center gap-2">
          Unmapped Products
          <Badge variant="secondary" className="bg-accent-cyan-dim text-accent-cyan font-mono">
            {totalCount}
          </Badge>
        </h2>
        <Link 
          href="/products" 
          className="text-sm text-accent-cyan hover:underline flex items-center gap-1"
        >
          View Queue
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="divide-y divide-border">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/products/${product.id}`}
            className="flex items-center gap-4 px-6 py-4 hover:bg-bg-tertiary transition-colors border border-dashed border-transparent hover:border-accent-cyan rounded-xl mx-2 my-1"
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-bg-tertiary text-text-muted">
              <Package className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{product.name}</div>
              <div className="text-xs text-text-muted font-mono">{product.sku}</div>
            </div>
            <div className="px-4 py-2 rounded-lg bg-accent-cyan-dim text-accent-cyan text-xs font-semibold flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5" />
              Link BOM
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

---

## Step 7: Quick Actions Component

Create `components/dashboard/quick-actions.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { Wrench, RefreshCw, ChevronRight } from 'lucide-react'

export function QuickActions() {
  const actions = [
    {
      title: 'Log Production',
      description: 'Record units & auto-deplete NPI',
      icon: Wrench,
      href: '/production',
      gradient: 'from-accent-green to-green-700',
    },
    {
      title: 'Sync Cultivera',
      description: 'Upload product list CSV',
      icon: RefreshCw,
      href: '/products?sync=true',
      gradient: 'from-accent-purple to-purple-700',
    },
  ]

  return (
    <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="font-semibold">Quick Actions</h2>
      </div>
      <div className="p-5 space-y-3">
        {actions.map((action) => (
          <Link
            key={action.title}
            href={action.href}
            className="flex items-center gap-4 p-5 bg-bg-tertiary border border-border rounded-xl hover:border-border-hover hover:translate-x-1 transition-all"
          >
            <div className={`w-13 h-13 rounded-xl flex items-center justify-center bg-gradient-to-br ${action.gradient}`}>
              <action.icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">{action.title}</div>
              <div className="text-sm text-text-muted">{action.description}</div>
            </div>
            <ChevronRight className="w-5 h-5 text-text-muted" />
          </Link>
        ))}
      </div>
    </div>
  )
}
```

---

## Step 8: Activity Feed Component

Create `components/dashboard/activity-feed.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import type { ActivityItem } from '@/types/dashboard'

interface ActivityFeedProps {
  activities: ActivityItem[]
}

const activityColors: Record<string, string> = {
  production: 'bg-accent-green',
  restock: 'bg-accent-cyan',
  sync: 'bg-accent-purple',
  adjustment: 'bg-accent-yellow',
  mapping: 'bg-accent-cyan',
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex justify-between items-center px-6 py-4 border-b border-border">
        <h2 className="font-semibold">Recent Activity</h2>
        <Link href="/reports" className="text-sm text-accent-cyan hover:underline">
          View All
        </Link>
      </div>
      <div className="divide-y divide-border">
        {activities.map((activity) => (
          <div 
            key={activity.id} 
            className="flex gap-3 px-6 py-3.5 hover:bg-bg-tertiary transition-colors"
          >
            <div 
              className={`w-2 h-2 rounded-full mt-2 ${activityColors[activity.activity_type] || 'bg-text-muted'}`} 
            />
            <div className="flex-1">
              <div className="text-sm">
                <strong>{activity.title}</strong>
                {activity.description && (
                  <span className="text-text-secondary"> {activity.description}</span>
                )}
              </div>
              <div className="text-xs text-text-muted font-mono mt-0.5">
                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
              </div>
            </div>
          </div>
        ))}

        {activities.length === 0 && (
          <div className="px-6 py-8 text-center text-text-muted">
            No recent activity
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## Step 9: Sync Status Pill

Create `components/dashboard/sync-status.tsx`:

```typescript
'use client'

import { formatDistanceToNow } from 'date-fns'

interface SyncStatusProps {
  lastSyncTime: string | null
}

export function SyncStatus({ lastSyncTime }: SyncStatusProps) {
  const displayText = lastSyncTime 
    ? `Last sync: ${formatDistanceToNow(new Date(lastSyncTime), { addSuffix: true })}`
    : 'Never synced'

  return (
    <div className="inline-flex items-center gap-2 bg-accent-green-dim text-accent-green px-3 py-1 rounded-full text-xs font-mono mt-2">
      <span className="w-1.5 h-1.5 bg-accent-green rounded-full animate-pulse" />
      {displayText}
    </div>
  )
}
```

---

## Step 10: Dashboard Page

Update `app/(dashboard)/page.tsx`:

```typescript
import { Upload, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusCards } from '@/components/dashboard/status-cards'
import { ActionRequired } from '@/components/dashboard/action-required'
import { UnmappedPreview } from '@/components/dashboard/unmapped-preview'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { SyncStatus } from '@/components/dashboard/sync-status'
import { 
  getDashboardStats, 
  getRecentActivity, 
  getLastSyncTime,
  getUnmappedProducts,
  getUnmappedCount,
} from '@/lib/actions/dashboard'
import Link from 'next/link'

export default async function DashboardPage() {
  const [stats, activities, lastSync, unmappedProducts, unmappedCount] = await Promise.all([
    getDashboardStats(),
    getRecentActivity(5),
    getLastSyncTime(),
    getUnmappedProducts(2),
    getUnmappedCount(),
  ])

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Command Center</h1>
          <p className="text-text-secondary">NPI Inventory Dashboard</p>
          <SyncStatus lastSyncTime={lastSync} />
        </div>
        <div className="flex gap-3">
          <Button 
            variant="secondary" 
            className="bg-bg-tertiary border-border text-text-primary hover:bg-bg-card"
            asChild
          >
            <Link href="/inventory?import=true">
              <Upload className="w-4 h-4 mr-2" />
              Upload CSV
            </Link>
          </Button>
          <Button 
            className="bg-gradient-to-r from-accent-cyan to-cyan-600 text-white shadow-lg shadow-accent-cyan/30"
            asChild
          >
            <Link href="/production">
              <Plus className="w-4 h-4 mr-2" />
              Log Production
            </Link>
          </Button>
        </div>
      </header>

      <StatusCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Left Column */}
        <div>
          <ActionRequired 
            criticalItems={stats.criticalItems} 
            warningItems={stats.warningItems} 
          />
          <UnmappedPreview 
            products={unmappedProducts} 
            totalCount={unmappedCount} 
          />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <QuickActions />
          <ActivityFeed activities={activities} />
        </div>
      </div>
    </div>
  )
}
```

---

## Step 11: Install date-fns

```bash
npm install date-fns
```

---

## Acceptance Criteria

Before marking Sprint 2 complete, verify:

- [ ] Database tables created (activity_log, sync_status)
- [ ] Status cards display correct counts (critical, warning, healthy)
- [ ] Status cards are clickable and link to filtered inventory
- [ ] Status card colors match design (red/yellow/green)
- [ ] Action Required panel shows low stock items
- [ ] Items sorted by severity (critical first)
- [ ] Each item shows name, location, count, and minimum
- [ ] View All link goes to inventory with filter
- [ ] Unmapped Products preview shows (if products exist)
- [ ] Quick Actions link to correct pages
- [ ] Activity feed displays recent activities
- [ ] Activity timestamps show relative time
- [ ] Activity types have correct colors
- [ ] Sync status pill shows last sync time
- [ ] Sync status has pulse animation
- [ ] Header buttons link correctly
- [ ] Layout is responsive (single column on mobile)
- [ ] Real-time: restocking updates dashboard stats

## Notes

- The UnmappedPreview component gracefully handles missing cultivera_products table (Sprint 3)
- Activity log is automatically populated by the updated restock_item function
- Production logging will add activity entries (Sprint 4)
- The sync functionality will be implemented in Sprint 3
