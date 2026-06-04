'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Calendar, Users, Scissors, CreditCard,
  AlertCircle, Receipt, BarChart2, Settings, LogOut, Megaphone
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { NotificationBell } from './NotificationBell'

const navItems = [
  { href: '/admin', label: 'בקרה', icon: LayoutDashboard, exact: true },
  { href: '/admin/calendar', label: 'יומן', icon: Calendar },
  { href: '/admin/clients', label: 'לקוחות', icon: Users },
  { href: '/admin/treatments', label: 'טיפולים', icon: Scissors },
  { href: '/admin/payments', label: 'תשלומים', icon: CreditCard },
  { href: '/admin/debts', label: 'חובות', icon: AlertCircle },
  { href: '/admin/receipts', label: 'קבלות', icon: Receipt },
  { href: '/admin/reports', label: 'דוחות', icon: BarChart2 },
  { href: '/admin/broadcast', label: 'תפוצה', icon: Megaphone },
  { href: '/admin/settings', label: 'הגדרות', icon: Settings },
]

// Bottom nav shows 5 most important items on mobile
const bottomNavItems = [
  { href: '/admin', label: 'בקרה', icon: LayoutDashboard, exact: true },
  { href: '/admin/calendar', label: 'יומן', icon: Calendar },
  { href: '/admin/clients', label: 'לקוחות', icon: Users },
  { href: '/admin/payments', label: 'תשלומים', icon: CreditCard },
  { href: '/admin/settings', label: 'הגדרות', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  function isActive(item: { href: string; exact?: boolean }) {
    if (item.exact) return pathname === item.href
    return pathname.startsWith(item.href)
  }

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-l border-brand-100 h-screen sticky top-0 shadow-sm shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-brand-100">
          <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-xl shadow-sm">💅</div>
          <div>
            <p className="font-bold text-brand-900 text-sm leading-tight">NoyaGayaEzon</p>
            <p className="text-xs text-muted">סטודיו לציפורניים</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <ul className="space-y-0.5">
            {navItems.map(item => {
              const active = isActive(item)
              return (
                <li key={item.href}>
                  <Link href={item.href} className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                    active ? 'bg-brand-500 text-white shadow-sm' : 'text-brand-700 hover:bg-brand-100 hover:text-brand-900'
                  )}>
                    <item.icon className="shrink-0" size={18} />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="p-3 border-t border-brand-100">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:bg-red-50 hover:text-red-600 transition-all">
            <LogOut size={18} /> יציאה מהמערכת
          </button>
        </div>
      </aside>

      {/* ── Mobile Top Header ── */}
      <div className="lg:hidden fixed top-0 right-0 left-0 z-40 bg-white border-b border-brand-100 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xl">💅</span>
          <span className="font-bold text-brand-900 text-sm">NoyaGayaEzon</span>
        </div>
        <NotificationBell />
      </div>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="lg:hidden fixed bottom-0 right-0 left-0 z-40 bg-white border-t border-brand-100 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] safe-bottom">
        <div className="flex items-center justify-around px-1 py-1">
          {bottomNavItems.map(item => {
            const active = isActive(item)
            return (
              <Link key={item.href} href={item.href} className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[56px]',
                active ? 'text-brand-500' : 'text-muted hover:text-brand-600'
              )}>
                <item.icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                <span className={cn('text-[10px] font-medium', active ? 'text-brand-500' : 'text-muted')}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
