'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Calendar, Users, Scissors, CreditCard, AlertCircle,
  Receipt, BarChart2, Settings, LogOut, Menu, X
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const navItems = [
  { href: '/admin', label: 'לוח בקרה', icon: LayoutDashboard, exact: true },
  { href: '/admin/calendar', label: 'יומן', icon: Calendar },
  { href: '/admin/clients', label: 'לקוחות', icon: Users },
  { href: '/admin/treatments', label: 'טיפולים', icon: Scissors },
  { href: '/admin/payments', label: 'תשלומים', icon: CreditCard },
  { href: '/admin/debts', label: 'חובות', icon: AlertCircle },
  { href: '/admin/receipts', label: 'קבלות', icon: Receipt },
  { href: '/admin/reports', label: 'דוחות', icon: BarChart2 },
  { href: '/admin/settings', label: 'הגדרות', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  function isActive(item: typeof navItems[0]) {
    if (item.exact) return pathname === item.href
    return pathname.startsWith(item.href)
  }

  const NavContent = () => (
    <>
      <div className="flex items-center gap-3 px-5 py-6 border-b border-brand-100">
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
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                    active
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'text-brand-700 hover:bg-brand-100 hover:text-brand-900'
                  )}
                >
                  <item.icon className="shrink-0" size={18} />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-3 border-t border-brand-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut size={18} />
          יציאה מהמערכת
        </button>
      </div>
    </>
  )

  return (
    <>
      <aside className="hidden lg:flex flex-col w-60 bg-white border-l border-brand-100 h-screen sticky top-0 shadow-sm">
        <NavContent />
      </aside>

      <div className="lg:hidden fixed top-0 right-0 left-0 z-40 bg-white border-b border-brand-100 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xl">💅</span>
          <span className="font-bold text-brand-900 text-sm">NoyaGayaEzon</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-xl hover:bg-brand-50 text-brand-700 transition">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileOpen && <div className="lg:hidden fixed inset-0 z-30 bg-black/30" onClick={() => setMobileOpen(false)} />}

      <aside className={cn(
        'lg:hidden fixed top-0 right-0 z-40 h-full w-64 bg-white flex flex-col shadow-xl transition-transform duration-300',
        mobileOpen ? 'translate-x-0' : 'translate-x-full'
      )}>
        <NavContent />
      </aside>
    </>
  )
}
