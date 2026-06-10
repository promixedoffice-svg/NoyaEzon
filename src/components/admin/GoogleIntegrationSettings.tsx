'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, RefreshCw } from 'lucide-react'

interface Props {
  settings: {
    googleSheetId: string | null
    googleCalendarId: string | null
    googleSheetsBackupEnabled: boolean
    googleCalendarSyncEnabled: boolean
  } | null
  serviceAccountEmail: string | null
  isConfigured: boolean
}

export function GoogleIntegrationSettings({ settings, serviceAccountEmail, isConfigured }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [backupRunning, setBackupRunning] = useState(false)
  const [backupResult, setBackupResult] = useState<string>('')
  const [form, setForm] = useState({
    googleSheetId: settings?.googleSheetId ?? '',
    googleCalendarId: settings?.googleCalendarId ?? '',
    googleSheetsBackupEnabled: settings?.googleSheetsBackupEnabled ?? false,
    googleCalendarSyncEnabled: settings?.googleCalendarSyncEnabled ?? false,
  })

  function set(field: string, value: string | boolean) { setForm(prev => ({ ...prev, [field]: value })); setSaved(false) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setLoading(false); setSaved(true); router.refresh()
  }

  async function copyEmail() {
    if (!serviceAccountEmail) return
    await navigator.clipboard.writeText(serviceAccountEmail)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function runBackupNow() {
    setBackupRunning(true); setBackupResult('')
    const res = await fetch('/api/cron/sheets-backup', { method: 'POST' })
    const data = await res.json()
    setBackupRunning(false)
    if (!res.ok) { setBackupResult(`שגיאה: ${data.error ?? 'לא ידוע'}`); return }
    setBackupResult(`גיבוי הושלם: ${data.counts.clients} לקוחות, ${data.counts.receipts} קבלות, ${data.counts.appointments} תורים`)
  }

  const inputClass = "w-full px-4 py-3 rounded-xl border border-brand-200 bg-brand-50 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition touch-manipulation"
  const labelClass = "block text-sm font-medium text-brand-800 mb-1.5"

  if (!isConfigured) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        חיבור ל-Google אינו מוגדר עדיין במערכת. כדי להפעיל גיבוי ל-Google Sheets וסנכרון יומן ל-Google Calendar, יש להגדיר תחילה Service Account בענן של Google ולהוסיף את פרטיו למשתני הסביבה.
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="bg-brand-50 rounded-xl p-3 space-y-2">
        <p className="text-sm font-medium text-brand-800">כתובת חשבון השירות (Service Account)</p>
        <p className="text-xs text-muted">יש לשתף את ה-Google Sheet וה-Google Calendar שלך עם כתובת זו (הרשאת עריכה)</p>
        <div className="flex items-center gap-2">
          <code dir="ltr" className="flex-1 text-xs bg-white border border-brand-200 rounded-lg px-3 py-2 overflow-x-auto whitespace-nowrap">{serviceAccountEmail}</code>
          <button type="button" onClick={copyEmail} className="shrink-0 p-2.5 rounded-xl border border-brand-200 text-brand-700 hover:bg-white transition">
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className={labelClass}>מזהה Google Sheet (Sheet ID)</label>
          <input value={form.googleSheetId} onChange={e => set('googleSheetId', e.target.value)} className={inputClass} dir="ltr" placeholder="לדוגמה: 1AbCDeFgHiJkLmNoPQRsTuVwXyZ..." />
          <p className="text-xs text-muted mt-1">ניתן למצוא את המזהה בכתובת ה-URL של הגיליון, בין /d/ ל-/edit</p>
        </div>
        <div>
          <label className={labelClass}>מזהה Google Calendar (Calendar ID)</label>
          <input value={form.googleCalendarId} onChange={e => set('googleCalendarId', e.target.value)} className={inputClass} dir="ltr" placeholder="לדוגמה: example@gmail.com" />
          <p className="text-xs text-muted mt-1">ניתן למצוא בהגדרות היומן ב-Google Calendar, תחת "שילוב יומן"</p>
        </div>
      </div>

      <div className="border-t border-brand-50 pt-4 space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.googleSheetsBackupEnabled} onChange={e => set('googleSheetsBackupEnabled', e.target.checked)} className="w-4 h-4 rounded accent-brand-500" />
          <span className="text-sm font-medium text-brand-800">גיבוי שבועי אוטומטי ל-Google Sheets</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.googleCalendarSyncEnabled} onChange={e => set('googleCalendarSyncEnabled', e.target.checked)} className="w-4 h-4 rounded accent-brand-500" />
          <span className="text-sm font-medium text-brand-800">סנכרון יומן תורים ל-Google Calendar</span>
        </label>
      </div>

      {saved && <div className="bg-green-50 text-green-700 text-sm rounded-xl px-4 py-3 border border-green-100">✓ נשמר בהצלחה</div>}
      <button type="submit" disabled={loading} className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 disabled:bg-brand-300 text-white font-semibold rounded-xl transition touch-manipulation text-base">{loading ? 'שומרת...' : 'שמירת הגדרות'}</button>

      <div className="border-t border-brand-50 pt-4 space-y-2">
        <button type="button" onClick={runBackupNow} disabled={backupRunning || !form.googleSheetId} className="w-full flex items-center justify-center gap-2 py-3 border border-brand-200 text-brand-700 hover:bg-brand-50 disabled:opacity-50 font-medium rounded-xl transition touch-manipulation">
          <RefreshCw size={15} className={backupRunning ? 'animate-spin' : ''} />
          {backupRunning ? 'מריץ גיבוי...' : 'הרץ גיבוי עכשיו'}
        </button>
        {backupResult && <p className="text-xs text-center text-muted">{backupResult}</p>}
      </div>
    </form>
  )
}
