import { getProfile } from '@/lib/auth/queries'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Tags, Truck, AlertTriangle } from 'lucide-react'

export default async function DashboardPage() {
  const profile = await getProfile()

  const stats = [
    {
      title: 'Total Items',
      value: '0',
      description: 'Inventory items tracked',
      icon: Package,
      color: 'text-accent-cyan',
    },
    {
      title: 'Categories',
      value: '0',
      description: 'Active categories',
      icon: Tags,
      color: 'text-accent-purple',
    },
    {
      title: 'Suppliers',
      value: '0',
      description: 'Active suppliers',
      icon: Truck,
      color: 'text-accent-green',
    },
    {
      title: 'Low Stock',
      value: '0',
      description: 'Items below threshold',
      icon: AlertTriangle,
      color: 'text-accent-yellow',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground font-display">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome back, {profile?.full_name || 'User'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="bg-bg-card border-border-custom">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-bg-card border-border-custom">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest inventory actions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No recent activity to display.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-bg-card border-border-custom">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Quick actions will be available in future sprints.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
