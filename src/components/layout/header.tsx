import { User } from '@supabase/supabase-js'
import { UserNav } from './user-nav'
import { ThemeToggle } from '@/components/theme-toggle'
import type { Profile } from '@/lib/auth/types'

interface HeaderProps {
  user: User
  profile: Profile | null
}

export function Header({ user, profile }: HeaderProps) {
  return (
    <header className="h-16 border-b border-border-custom bg-bg-secondary px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-foreground md:hidden">NPI Manager</h2>
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />
        <UserNav user={user} profile={profile} />
      </div>
    </header>
  )
}
