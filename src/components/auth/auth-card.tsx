import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface AuthCardProps {
  title: string
  description: string
  children: React.ReactNode
}

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-accent-cyan font-display">NPI Manager</h1>
        <p className="text-sm text-muted-foreground mt-1">Inventory Management System</p>
      </div>
      <Card className="w-full bg-bg-card border-border-custom">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-display text-foreground">
            {title}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {children}
        </CardContent>
      </Card>
    </div>
  )
}
