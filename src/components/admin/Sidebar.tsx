'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Calendar, Users, Scissors,
  AlertCircle, Receipt, BarChart2, Settings, LogOut,
  Megaphone, TrendingDown, MoreHorizontal, X, ListTodo
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { NotificationBell } from './NotificationBell'
import { ALL_NAV_ITEMS, NAV_STORAGE_KEY, DEFAULT_BOTTOM, DEFAULT_MORE } from './NavOrderSettings'

// Desktop sidebar always shows all items in fixed order
const ALL_ITEMS_ORDERED = [
  { href: '/admin',            label: 'בקרה',    icon: LayoutDashboard, exact: true },
  { href: '/admin/calendar',   label: 'יומן',    icon: Calendar },
  { href: '/admin/clients',    label: 'לקוחות',  icon: Users },
  { href: '/admin/tasks',      label: 'משימות',  icon: ListTodo },
  { href: '/admin/treatments', label: 'טיפולים', icon: Scissors },
  { href: '/admin/debts',      label: 'חובות',   icon: AlertCircle },
  { href: '/admin/receipts',   label: 'קבלות',   icon: Receipt },
  { href: '/admin/reports',    label: 'דוחות',   icon: BarChart2 },
  { href: '/admin/expenses',   label: 'הוצאות',  icon: TrendingDown },
  { href: '/admin/broadcast',  label: 'תפוצה',   icon: Megaphone },
  { href: '/admin/settings',   label: 'הגדרות',  icon: Settings },
]

const NAV_MAP = Object.fromEntries(ALL_NAV_ITEMS.map(i => [i.href, i]))

function resolveItems(hrefs: string[]) {
  return hrefs.map(h => NAV_MAP[h]).filter(Boolean)
}

interface SidebarProps {
  businessName?: string | null
  logoUrl?: string | null
}

export function Sidebar({ businessName, logoUrl }: SidebarProps) {
  const displayName = businessName?.trim() || 'Calitor'
  const pathname = usePathname()
  const router = useRouter()
  const [showMore, setShowMore] = useState(false)
  const [bottomHrefs, setBottomHrefs] = useState<string[]>(DEFAULT_BOTTOM)
  const [moreHrefs,   setMoreHrefs]   = useState<string[]>(DEFAULT_MORE)

  useEffect(() => {
    function load() {
      try {
        const raw = localStorage.getItem(NAV_STORAGE_KEY)
        if (raw) {
          const p = JSON.parse(raw)
          setBottomHrefs(p.bottom ?? DEFAULT_BOTTOM)
          setMoreHrefs(p.more   ?? DEFAULT_MORE)
        }
      } catch {}
    }
    load()
    window.addEventListener('nav-order-changed', load)
    return () => window.removeEventListener('nav-order-changed', load)
  }, [])

  const bottomItems = resolveItems(bottomHrefs)
  const moreNavItems = resolveItems(moreHrefs)

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  function isActive(item: { href: string; exact?: boolean }) {
    if (item.exact) return pathname === item.href
    return pathname.startsWith(item.href)
  }

  const isMoreActive = moreNavItems.some(item => pathname.startsWith(item.href))

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-l border-brand-100 h-screen sticky top-0 shadow-sm shrink-0">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-brand-100">
          <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
            {logoUrl ? <img src={logoUrl} alt={displayName} className="w-full h-full object-contain" /> : <span className="text-xl">💅</span>}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-brand-900 text-sm leading-tight truncate">{displayName}</p>
            <p className="text-xs text-muted">Calitor</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <ul className="space-y-0.5">
            {ALL_ITEMS_ORDERED.map(item => {
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
        <div className="flex items-center gap-2 min-w-0">
          {logoUrl ? (
            <img src={logoUrl} alt={displayName} className="w-6 h-6 rounded-lg object-contain shrink-0" />
          ) : (
            <span className="text-xl">💅</span>
          )}
          <span className="font-bold text-brand-900 text-sm truncate">{displayName}</span>
        </div>
        <NotificationBell />
      </div>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="lg:hidden fixed bottom-0 right-0 left-0 z-40 bg-white border-t border-brand-100 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] safe-bottom">
        <div className="flex items-center justify-around px-1 py-1">
          {bottomItems.map(item => {
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

          {/* "More" button — always visible */}
          <button
            onClick={() => setShowMore(true)}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[56px]',
              isMoreActive ? 'text-brand-500' : 'text-muted hover:text-brand-600'
            )}
          >
            <MoreHorizontal size={22} strokeWidth={isMoreActive ? 2.5 : 1.8} />
            <span className={cn('text-[10px] font-medium', isMoreActive ? 'text-brand-500' : 'text-muted')}>עוד</span>
          </button>
        </div>
      </nav>

      {/* ── "More" Drawer ── */}
      {showMore && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/40"
          onClick={() => setShowMore(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="flex items-center justify-between px-5 pb-3">
              <p className="font-semibold text-brand-900">תפריט</p>
              <button
                onClick={() => setShowMore(false)}
                className="p-1.5 rounded-xl hover:bg-brand-50 text-muted transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 px-5 pb-4">
              {moreNavItems.map(item => {
                const active = isActive(item)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className={cn(
                      'flex flex-col items-center gap-2 py-4 rounded-2xl transition-all',
                      active
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'bg-brand-50 text-brand-700 hover:bg-brand-100'
                    )}
                  >
                    <item.icon size={24} strokeWidth={active ? 2.5 : 1.8} />
                    <span className="text-xs font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </div>

            <div className="px-5 pb-8 pt-1 border-t border-brand-50">
              <button
                onClick={() => { setShowMore(false); handleLogout() }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all mt-3"
              >
                <LogOut size={18} /> יציאה מהמערכת
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
