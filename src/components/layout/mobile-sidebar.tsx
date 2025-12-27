'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  LayoutDashboard,
  Package,
  Tags,
  FileBox,
  Truck,
  ClipboardList,
  Settings,
  BarChart3,
  Menu,
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

export function MobileSidebar() {
  const pathname = usePathname()
  const { theme } = useTheme()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close sidebar when route changes
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const logoSrc = mounted && theme === 'dark' ? '/logo-b.webp' : '/logo.webp'

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="p-0 flex flex-col">
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
      </SheetContent>
    </Sheet>
  )
}
