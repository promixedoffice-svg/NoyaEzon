'use client'

import { useState } from 'react'
import { Download, Mail, FileSpreadsheet } from 'lucide-react'

export function ReceiptsExportActions({ defaultEmail }: { defaultEmail?: string | null }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState(defaultEmail ?? '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setMessage('')
    const res = await fetch('/api/receipts/export/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) { setMessage(data.message || 'שגיאה בשליחת המייל'); return }
    setMessage(`נשלח בהצלחה ל-${data.to}`)
  }

  const inputClass = "flex-1 px-3 py-2 rounded-xl border border-brand-200 bg-brand-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-2 bg-white border border-brand-200 hover:bg-brand-50 text-brand-700 font-medium px-4 py-2.5 rounded-xl transition shadow-sm text-sm"
      >
        <FileSpreadsheet size={16} /> ייצוא לאקסל
      </button>

      {open && (
        <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 bg-white border border-brand-100 rounded-2xl shadow-lg p-4 z-20 space-y-3">
          <a
            href="/api/receipts/export"
            className="flex items-center gap-2 bg-brand-50 hover:bg-brand-100 text-brand-700 font-medium px-3 py-2.5 rounded-xl transition text-sm"
          >
            <Download size={15} /> הורדת קובץ Excel
          </a>

          <div className="border-t border-brand-50 pt-3">
            <p className="text-xs font-medium text-brand-700 mb-2 flex items-center gap-1.5"><Mail size={13} /> שליחה במייל</p>
            <form onSubmit={handleSendEmail} className="flex items-center gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@mail.com"
                dir="ltr"
                className={inputClass}
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-medium px-3 py-2 rounded-xl transition text-sm whitespace-nowrap"
              >
                {loading ? '...' : 'שליחה'}
              </button>
            </form>
            {message && <p className="text-xs text-muted mt-2">{message}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
