import { User } from '@supabase/supabase-js'
import { UserNav } from './user-nav'
import { ThemeToggle } from '@/components/theme-toggle'
import { MobileSidebar } from './mobile-sidebar'
import type { Profile } from '@/lib/auth/types'

interface HeaderProps {
  user: User
  profile: Profile | null
}

export function Header({ user, profile }: HeaderProps) {
  return (
    <header className="h-16 border-b border-border-custom bg-bg-secondary px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <MobileSidebar />
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />
        <UserNav user={user} profile={profile} />
      </div>
    </header>
  )
}
