'use client'

import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Calendar, Users, Scissors,
  AlertCircle, Receipt, BarChart2, Settings,
  Megaphone, TrendingDown, ListTodo,
  ChevronUp, ChevronDown, ArrowRight, ArrowLeft,
} from 'lucide-react'

export const NAV_STORAGE_KEY = 'nav_order'

export const ALL_NAV_ITEMS = [
  { href: '/admin',              label: 'בקרה',    icon: LayoutDashboard, exact: true },
  { href: '/admin/calendar',     label: 'יומן',    icon: Calendar },
  { href: '/admin/tasks',        label: 'משימות',  icon: ListTodo },
  { href: '/admin/clients',      label: 'לקוחות',  icon: Users },
  { href: '/admin/treatments',   label: 'טיפולים', icon: Scissors },
  { href: '/admin/debts',        label: 'חובות',   icon: AlertCircle },
  { href: '/admin/receipts',     label: 'קבלות',   icon: Receipt },
  { href: '/admin/reports',      label: 'דוחות',   icon: BarChart2 },
  { href: '/admin/expenses',     label: 'הוצאות',  icon: TrendingDown },
  { href: '/admin/broadcast',    label: 'תפוצה',   icon: Megaphone },
  { href: '/admin/settings',     label: 'הגדרות',  icon: Settings },
]

export const DEFAULT_BOTTOM = ['/admin', '/admin/calendar', '/admin/tasks', '/admin/clients']
export const DEFAULT_MORE   = ['/admin/receipts', '/admin/treatments', '/admin/debts', '/admin/reports', '/admin/expenses', '/admin/broadcast', '/admin/settings']

function itemFor(href: string) {
  return ALL_NAV_ITEMS.find(i => i.href === href)
}

function swap<T>(arr: T[], i: number, j: number): T[] {
  const next = [...arr]
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

export function NavOrderSettings() {
  const [bottom, setBottom] = useState<string[]>(DEFAULT_BOTTOM)
  const [more,   setMore]   = useState<string[]>(DEFAULT_MORE)
  const [saved,  setSaved]  = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(NAV_STORAGE_KEY)
      if (raw) {
        const p = JSON.parse(raw)
        setBottom(p.bottom ?? DEFAULT_BOTTOM)
        setMore(p.more   ?? DEFAULT_MORE)
      }
    } catch {}
  }, [])

  function save() {
    localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify({ bottom, more }))
    window.dispatchEvent(new Event('nav-order-changed'))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function toMore(href: string) {
    setBottom(p => p.filter(h => h !== href))
    setMore(p => [href, ...p])
    setSaved(false)
  }

  function toBottom(href: string) {
    if (bottom.length >= 4) return
    setMore(p => p.filter(h => h !== href))
    setBottom(p => [...p, href])
    setSaved(false)
  }

  const btn = "p-1.5 rounded-lg text-muted hover:bg-gray-100 active:bg-gray-200 transition touch-manipulation disabled:opacity-25 disabled:pointer-events-none"
  const moveBtn = (extra = '') => `flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition touch-manipulation ${extra}`

  return (
    <div className="space-y-4">

      {/* Bottom bar section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-brand-800">סרגל תחתון</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${bottom.length >= 4 ? 'bg-red-100 text-red-600' : 'bg-brand-100 text-brand-600'}`}>
            {bottom.length}/4
          </span>
        </div>
        <div className="rounded-xl border border-brand-100 divide-y divide-brand-50 overflow-hidden">
          {bottom.map((href, idx) => {
            const item = itemFor(href)
            if (!item) return null
            return (
              <div key={href} className="flex items-center gap-2 px-3 py-2.5 bg-brand-50/40">
                <item.icon size={15} className="text-brand-500 shrink-0" />
                <span className="text-sm font-medium text-brand-900 flex-1">{item.label}</span>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => setBottom(p => swap(p, idx, idx-1))} disabled={idx === 0} className={btn}><ChevronUp size={14} /></button>
                  <button onClick={() => setBottom(p => swap(p, idx, idx+1))} disabled={idx === bottom.length - 1} className={btn}><ChevronDown size={14} /></button>
                  <button
                    onClick={() => toMore(href)}
                    className={moveBtn('border-gray-200 text-gray-500 hover:bg-gray-50 active:bg-gray-100 mr-1')}
                    title="העבר לתפריט עוד"
                  >
                    <ArrowLeft size={12} />
                    לעוד
                  </button>
                </div>
              </div>
            )
          })}
          {bottom.length === 0 && (
            <p className="px-4 py-5 text-center text-xs text-muted">הסרגל ריק — העברי פריטים מלמטה</p>
          )}
        </div>
        <p className="text-xs text-muted mt-1 px-1">כפתור "עוד" מופיע תמיד בסוף הסרגל</p>
      </div>

      {/* More section */}
      <div>
        <p className="text-sm font-semibold text-brand-800 mb-2">תפריט "עוד"</p>
        <div className="rounded-xl border border-brand-100 divide-y divide-brand-50 overflow-hidden">
          {more.map((href, idx) => {
            const item = itemFor(href)
            if (!item) return null
            const canAdd = bottom.length < 4
            return (
              <div key={href} className="flex items-center gap-2 px-3 py-2.5">
                <item.icon size={15} className="text-muted shrink-0" />
                <span className="text-sm text-brand-800 flex-1">{item.label}</span>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => setMore(p => swap(p, idx, idx-1))} disabled={idx === 0} className={btn}><ChevronUp size={14} /></button>
                  <button onClick={() => setMore(p => swap(p, idx, idx+1))} disabled={idx === more.length - 1} className={btn}><ChevronDown size={14} /></button>
                  <button
                    onClick={() => toBottom(href)}
                    disabled={!canAdd}
                    title={canAdd ? 'העבר לסרגל' : 'הסרגל מלא (4/4)'}
                    className={moveBtn(`border-brand-200 text-brand-600 hover:bg-brand-50 active:bg-brand-100 mr-1 ${!canAdd ? 'opacity-30 pointer-events-none' : ''}`)}
                  >
                    <ArrowRight size={12} />
                    לסרגל
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {saved && (
        <div className="bg-green-50 text-green-700 text-sm rounded-xl px-4 py-3 border border-green-100">
          ✓ נשמר — הניווט עודכן
        </div>
      )}
      <button
        onClick={save}
        className="w-full py-3 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold rounded-xl transition touch-manipulation text-base"
      >
        שמור סדר ניווט
      </button>
    </div>
  )
}
