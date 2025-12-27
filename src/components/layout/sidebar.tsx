'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
  Tags,
  FileBox,
  Truck,
  ClipboardList,
  Settings,
  BarChart3,
} from 'lucide-react'

const navItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Inventory',
    href: '/inventory',
    icon: Package,
  },
  {
    title: 'Categories',
    href: '/categories',
    icon: Tags,
  },
  {
    title: 'Suppliers',
    href: '/suppliers',
    icon: Truck,
  },
  {
    title: 'Orders',
    href: '/orders',
    icon: FileBox,
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: BarChart3,
  },
  {
    title: 'Audit Log',
    href: '/audit',
    icon: ClipboardList,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const logoSrc = mounted && theme === 'dark' ? '/logo-b.webp' : '/logo.webp'

  return (
    <aside className="hidden md:flex w-64 flex-col bg-bg-secondary border-r border-border-custom min-h-screen">
      <div className="h-16 px-6 border-b border-border-custom flex items-center justify-center">
        <Link href="/dashboard" className="relative h-10 w-40">
          <Image
            src={logoSrc}
            alt="NPI Manager"
            fill
            priority
            className="object-contain"
          />
        </Link>
      </div>

      <nav className="flex-1 px-5 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent-cyan/10 text-accent-cyan'
                      : 'text-muted-foreground hover:text-foreground hover:bg-bg-tertiary'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.title}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-border-custom">
        <p className="text-xs text-muted-foreground text-center">
          v0.1.0 - Sprint 0
        </p>
      </div>
    </aside>
  )
}
