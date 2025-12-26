# Sprint 5: Reporting & Polish

## Project Context

I'm completing development of the NPI (Non-Product Inventory) Manager. Sprints 0-4 are complete (Auth, Inventory, Dashboard, Product Mapping, Production). Now I need to build reporting features and polish the application.

## Tech Stack (Already Configured)
- Next.js 16.1.1 with App Router
- TypeScript
- React 19
- Supabase (Auth, Database, Realtime)
- Tailwind CSS 4
- shadcn/ui components

## Your Task

Implement reports page, settings page, and polish the entire application.

---

## Step 1: Install Additional Components

```bash
npx shadcn@latest add tabs chart skeleton switch alert-dialog
npm install recharts
```

---

## Step 2: TypeScript Types

Create `types/reports.ts`:

```typescript
export interface StockValueByCategory {
  category: string
  value: number
  count: number
  color: string
}

export interface LowStockItem {
  id: string
  name: string
  category: string
  location: string
  count: number
  desired_count: number
  percentage: number
}

export interface ProductionSummary {
  date: string
  units_produced: number
  runs: number
}

export interface ReportFilters {
  dateRange: 'week' | 'month' | 'quarter' | 'year'
  category?: string
}
```

---

## Step 3: Server Actions for Reports

Create `lib/actions/reports.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import type { StockValueByCategory, LowStockItem, ProductionSummary } from '@/types/reports'

export async function getStockValueByCategory(): Promise<StockValueByCategory[]> {
  const supabase = await createClient()
  
  const { data } = await supabase
    .from('npi_items')
    .select(`
      count,
      unit_cost,
      category:categories(name, color)
    `)
    .eq('is_active', true)

  const categoryMap = new Map<string, { value: number; count: number; color: string }>()
  
  data?.forEach((item: any) => {
    const catName = item.category?.name || 'Uncategorized'
    const catColor = item.category?.color || '#606065'
    const current = categoryMap.get(catName) || { value: 0, count: 0, color: catColor }
    current.value += item.count * item.unit_cost
    current.count += 1
    categoryMap.set(catName, current)
  })

  return Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    ...data,
  }))
}

export async function getLowStockItems(limit: number = 20): Promise<LowStockItem[]> {
  const supabase = await createClient()
  
  const { data } = await supabase
    .from('npi_items')
    .select(`
      id,
      name,
      count,
      desired_count,
      category:categories(name),
      location:locations(name)
    `)
    .eq('is_active', true)
    .not('desired_count', 'is', null)
    .order('count', { ascending: true })

  return (data || [])
    .filter((item: any) => item.desired_count > 0 && item.count < item.desired_count)
    .slice(0, limit)
    .map((item: any) => ({
      id: item.id,
      name: item.name,
      category: item.category?.name || 'Unknown',
      location: item.location?.name || 'Unknown',
      count: item.count,
      desired_count: item.desired_count,
      percentage: Math.round((item.count / item.desired_count) * 100),
    }))
}

export async function getProductionSummary(days: number = 30): Promise<ProductionSummary[]> {
  const supabase = await createClient()
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data } = await supabase
    .from('production_logs')
    .select('quantity_produced, produced_at')
    .gte('produced_at', since.toISOString())
    .order('produced_at', { ascending: true })

  // Group by date
  const dateMap = new Map<string, { units: number; runs: number }>()
  
  data?.forEach((log: any) => {
    const date = new Date(log.produced_at).toISOString().split('T')[0]
    const current = dateMap.get(date) || { units: 0, runs: 0 }
    current.units += log.quantity_produced
    current.runs += 1
    dateMap.set(date, current)
  })

  return Array.from(dateMap.entries()).map(([date, stats]) => ({
    date,
    units_produced: stats.units,
    runs: stats.runs,
  }))
}

export async function exportInventoryCSV(): Promise<string> {
  const supabase = await createClient()
  
  const { data } = await supabase
    .from('npi_items')
    .select(`
      name,
      count,
      uom,
      desired_count,
      unit_cost,
      category:categories(name),
      location:locations(name)
    `)
    .eq('is_active', true)
    .order('name')

  const headers = ['Name', 'Count', 'UOM', 'Desired', 'Unit Cost', 'Category', 'Location', 'Stock Value']
  const rows = (data || []).map((item: any) => [
    item.name,
    item.count,
    item.uom,
    item.desired_count || '',
    item.unit_cost,
    item.category?.name || '',
    item.location?.name || '',
    (item.count * item.unit_cost).toFixed(2),
  ])

  const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
  return csv
}
```

---

## Step 4: Stock Value Chart Component

Create `components/reports/stock-value-chart.tsx`:

```typescript
'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { StockValueByCategory } from '@/types/reports'

interface StockValueChartProps {
  data: StockValueByCategory[]
}

export function StockValueChart({ data }: StockValueChartProps) {
  const formatValue = (value: number) => {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
    return `$${value.toFixed(0)}`
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 80, right: 20 }}>
          <XAxis type="number" tickFormatter={formatValue} stroke="#606065" fontSize={12} />
          <YAxis type="category" dataKey="category" stroke="#606065" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#151517',
              border: '1px solid #2a2a2e',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#fafafa' }}
            formatter={(value: number) => [formatValue(value), 'Stock Value']}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

---

## Step 5: Production Trend Chart Component

Create `components/reports/production-trend-chart.tsx`:

```typescript
'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { ProductionSummary } from '@/types/reports'
import { format, parseISO } from 'date-fns'

interface ProductionTrendChartProps {
  data: ProductionSummary[]
}

export function ProductionTrendChart({ data }: ProductionTrendChartProps) {
  const formattedData = data.map(d => ({
    ...d,
    dateLabel: format(parseISO(d.date), 'MMM d'),
  }))

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData} margin={{ left: 20, right: 20 }}>
          <XAxis dataKey="dateLabel" stroke="#606065" fontSize={12} />
          <YAxis stroke="#606065" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#151517',
              border: '1px solid #2a2a2e',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#fafafa' }}
          />
          <Line 
            type="monotone" 
            dataKey="units_produced" 
            stroke="#22c55e" 
            strokeWidth={2}
            dot={{ fill: '#22c55e', strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

---

## Step 6: Low Stock Table Component

Create `components/reports/low-stock-table.tsx`:

```typescript
'use client'

import { MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { LowStockItem } from '@/types/reports'

interface LowStockTableProps {
  items: LowStockItem[]
}

export function LowStockTable({ items }: LowStockTableProps) {
  const getStatusColor = (percentage: number) => {
    if (percentage <= 20) return 'red'
    if (percentage <= 50) return 'yellow'
    return 'green'
  }

  return (
    <div className="divide-y divide-border">
      {items.map((item) => {
        const color = getStatusColor(item.percentage)
        return (
          <div key={item.id} className="flex items-center gap-4 py-3">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{item.name}</div>
              <div className="text-xs text-text-muted flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">{item.category}</Badge>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {item.location}
                </span>
              </div>
            </div>
            <div className="w-32">
              <Progress 
                value={item.percentage} 
                className="h-2"
              />
            </div>
            <div className="text-right min-w-[80px]">
              <span className={`font-mono font-semibold text-accent-${color}`}>
                {item.count}
              </span>
              <span className="text-text-muted text-sm"> / {item.desired_count}</span>
            </div>
          </div>
        )
      })}

      {items.length === 0 && (
        <div className="py-8 text-center text-text-muted">
          All items are well stocked!
        </div>
      )}
    </div>
  )
}
```

---

## Step 7: Reports Page

Create `app/(dashboard)/reports/page.tsx`:

```typescript
import { Download, BarChart3, TrendingUp, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StockValueChart } from '@/components/reports/stock-value-chart'
import { ProductionTrendChart } from '@/components/reports/production-trend-chart'
import { LowStockTable } from '@/components/reports/low-stock-table'
import { 
  getStockValueByCategory, 
  getLowStockItems, 
  getProductionSummary 
} from '@/lib/actions/reports'

export default async function ReportsPage() {
  const [stockByCategory, lowStockItems, productionSummary] = await Promise.all([
    getStockValueByCategory(),
    getLowStockItems(),
    getProductionSummary(30),
  ])

  const totalValue = stockByCategory.reduce((sum, cat) => sum + cat.value, 0)

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-text-secondary">Analytics and inventory insights</p>
        </div>
        <Button variant="secondary" className="bg-bg-tertiary border-border">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-accent-purple-dim text-accent-purple flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <span className="text-sm text-text-secondary">Total Stock Value</span>
          </div>
          <div className="text-3xl font-bold font-mono text-accent-purple">
            ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>

        <div className="bg-bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-accent-green-dim text-accent-green flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-sm text-text-secondary">30-Day Production</span>
          </div>
          <div className="text-3xl font-bold font-mono text-accent-green">
            {productionSummary.reduce((sum, d) => sum + d.units_produced, 0).toLocaleString()}
          </div>
        </div>

        <div className="bg-bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-accent-yellow-dim text-accent-yellow flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-sm text-text-secondary">Items Below Target</span>
          </div>
          <div className="text-3xl font-bold font-mono text-accent-yellow">
            {lowStockItems.length}
          </div>
        </div>
      </div>

      {/* Charts */}
      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList className="bg-bg-tertiary p-1">
          <TabsTrigger value="stock" className="data-[state=active]:bg-bg-card">
            Stock Value by Category
          </TabsTrigger>
          <TabsTrigger value="production" className="data-[state=active]:bg-bg-card">
            Production Trend
          </TabsTrigger>
          <TabsTrigger value="lowstock" className="data-[state=active]:bg-bg-card">
            Low Stock Items
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="bg-bg-card border border-border rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Stock Value by Category</h3>
          <StockValueChart data={stockByCategory} />
        </TabsContent>

        <TabsContent value="production" className="bg-bg-card border border-border rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Production Trend (30 Days)</h3>
          <ProductionTrendChart data={productionSummary} />
        </TabsContent>

        <TabsContent value="lowstock" className="bg-bg-card border border-border rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Items Below Desired Stock</h3>
          <LowStockTable items={lowStockItems} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

---

## Step 8: Settings Page

Create `app/(dashboard)/settings/page.tsx`:

```typescript
import { Settings, Tags, MapPin, Bell } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CategoriesSettings } from '@/components/settings/categories-settings'
import { LocationsSettings } from '@/components/settings/locations-settings'
import { getCategories, getLocations } from '@/lib/actions/inventory'

export default async function SettingsPage() {
  const [categories, locations] = await Promise.all([
    getCategories(),
    getLocations(),
  ])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Settings
        </h1>
        <p className="text-text-secondary">Manage categories, locations, and preferences</p>
      </header>

      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList className="bg-bg-tertiary p-1">
          <TabsTrigger value="categories" className="data-[state=active]:bg-bg-card">
            <Tags className="w-4 h-4 mr-2" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="locations" className="data-[state=active]:bg-bg-card">
            <MapPin className="w-4 h-4 mr-2" />
            Locations
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-bg-card">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <CategoriesSettings categories={categories} />
        </TabsContent>

        <TabsContent value="locations">
          <LocationsSettings locations={locations} />
        </TabsContent>

        <TabsContent value="notifications">
          <div className="bg-bg-card border border-border rounded-2xl p-6">
            <h3 className="font-semibold mb-4">Notification Preferences</h3>
            <p className="text-text-muted">Coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

---

## Step 9: Categories Settings Component

Create `components/settings/categories-settings.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Category } from '@/types/inventory'

interface CategoriesSettingsProps {
  categories: Category[]
}

export function CategoriesSettings({ categories }: CategoriesSettingsProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)

  return (
    <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex justify-between items-center px-6 py-4 border-b border-border">
        <h3 className="font-semibold">Categories</h3>
        <Button size="sm" className="bg-accent-cyan text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </div>

      <div className="divide-y divide-border">
        {categories.map((category) => (
          <div key={category.id} className="flex items-center gap-4 px-6 py-4">
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: category.color }}
            />
            <span className="flex-1 font-medium">{category.name}</span>
            <Button variant="ghost" size="icon" className="text-text-muted hover:text-accent-cyan">
              <Pencil className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-text-muted hover:text-accent-red"
              onClick={() => setDeleteId(category.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription className="text-text-secondary">
              This will remove the category. Items using this category will need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-bg-tertiary border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-accent-red text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

---

## Step 10: Locations Settings Component

Create `components/settings/locations-settings.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Location } from '@/types/inventory'

interface LocationsSettingsProps {
  locations: Location[]
}

export function LocationsSettings({ locations }: LocationsSettingsProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)

  return (
    <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex justify-between items-center px-6 py-4 border-b border-border">
        <h3 className="font-semibold">Locations</h3>
        <Button size="sm" className="bg-accent-cyan text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add Location
        </Button>
      </div>

      <div className="divide-y divide-border">
        {locations.map((location) => (
          <div key={location.id} className="flex items-center gap-4 px-6 py-4">
            <MapPin className="w-4 h-4 text-text-muted" />
            <span className="flex-1 font-medium">{location.name}</span>
            {location.description && (
              <span className="text-sm text-text-muted">{location.description}</span>
            )}
            <Button variant="ghost" size="icon" className="text-text-muted hover:text-accent-cyan">
              <Pencil className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-text-muted hover:text-accent-red"
              onClick={() => setDeleteId(location.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location?</AlertDialogTitle>
            <AlertDialogDescription className="text-text-secondary">
              This will remove the location. Items using this location will need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-bg-tertiary border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-accent-red text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

---

## Step 11: Loading Skeleton Component

Create `components/shared/loading-skeleton.tsx`:

```typescript
import { Skeleton } from '@/components/ui/skeleton'

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-5 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="bg-bg-card border border-border rounded-2xl p-6">
      <Skeleton className="h-4 w-40 mb-4" />
      <Skeleton className="h-[300px] w-full" />
    </div>
  )
}
```

---

## Step 12: Polish Tasks

### Add to all pages:
1. Loading states using Suspense and skeleton components
2. Error boundaries with friendly messages
3. Optimistic updates where appropriate

### Keyboard shortcuts (add to layout):
```typescript
// Example: Cmd+K for search
useEffect(() => {
  const down = (e: KeyboardEvent) => {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      // Open search dialog
    }
  }
  document.addEventListener('keydown', down)
  return () => document.removeEventListener('keydown', down)
}, [])
```

### Toast consistency:
- Success: Green toast for completed actions
- Error: Red toast for failed actions
- Warning: Yellow toast for partial success

---

## Acceptance Criteria

Before marking Sprint 5 complete, verify:

- [ ] Reports page displays stock value by category chart
- [ ] Reports page displays production trend chart
- [ ] Reports page displays low stock items table
- [ ] Summary cards show correct totals
- [ ] Date filtering works (if implemented)
- [ ] CSV export downloads correctly
- [ ] Settings page shows categories list
- [ ] Settings page shows locations list
- [ ] Can add/edit/delete categories (with confirmation)
- [ ] Can add/edit/delete locations (with confirmation)
- [ ] Loading skeletons show during data fetching
- [ ] Error states handled gracefully
- [ ] Toast notifications consistent across app
- [ ] Confirmation dialogs for destructive actions
- [ ] Mobile navigation works correctly
- [ ] All pages responsive
- [ ] Application feels polished and fast

## Notes

- Recharts is used for charting (already supports dark theme)
- Progress component from shadcn for stock level bars
- AlertDialog for delete confirmations
- Skeleton component for loading states
- Consider adding database indexes for report queries if slow
