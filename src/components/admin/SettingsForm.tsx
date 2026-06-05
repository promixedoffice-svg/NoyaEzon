'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  settings: { id: string; businessName: string; ownerName: string | null; businessNumber: string | null; phone: string | null; email: string | null; address: string | null; receiptStartingNumber: number; receiptFooterText: string | null; taskReminderMinutes?: number } | null
}

export function SettingsForm({ settings }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    businessName: settings?.businessName ?? 'NoyaGayaEzon',
    ownerName: settings?.ownerName ?? '',
    businessNumber: settings?.businessNumber ?? '',
    phone: settings?.phone ?? '',
    email: settings?.email ?? '',
    address: settings?.address ?? '',
    receiptStartingNumber: settings?.receiptStartingNumber ?? 1000,
    receiptFooterText: settings?.receiptFooterText ?? 'תודה על הביקור!',
    taskReminderMinutes: settings?.taskReminderMinutes ?? 30,
  })

  function set(field: string, value: string | number) { setForm(prev => ({ ...prev, [field]: value })); setSaved(false) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setLoading(false); setSaved(true); router.refresh()
  }

  // text-base prevents iOS auto-zoom (requires ≥16px font-size on inputs)
  const inputClass = "w-full px-4 py-3 rounded-xl border border-brand-200 bg-brand-50 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition touch-manipulation"
  const labelClass = "block text-sm font-medium text-brand-800 mb-1.5"

  return (
    <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-4 sm:p-6">
      <h2 className="font-semibold text-brand-900 mb-5">פרטי העסק</h2>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
          <div><label className={labelClass}>שם העסק</label><input value={form.businessName} onChange={e => set('businessName', e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>שם המעצבת</label><input value={form.ownerName} onChange={e => set('ownerName', e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>מספר עוסק</label><input value={form.businessNumber} onChange={e => set('businessNumber', e.target.value)} className={inputClass} dir="ltr" /></div>
          <div><label className={labelClass}>טלפון</label><input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className={inputClass} dir="ltr" /></div>
          <div><label className={labelClass}>אימייל</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputClass} dir="ltr" inputMode="email" /></div>
          <div><label className={labelClass}>כתובת</label><input value={form.address} onChange={e => set('address', e.target.value)} className={inputClass} /></div>
        </div>
        <div className="border-t border-brand-50 pt-4 space-y-4">
          <h3 className="font-medium text-brand-800 text-sm">קבלות</h3>
          <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
            <div><label className={labelClass}>מספר קבלה התחלתי</label><input type="number" value={form.receiptStartingNumber} onChange={e => set('receiptStartingNumber', parseInt(e.target.value)||1000)} className={inputClass} min="1" dir="ltr" inputMode="numeric" /></div>
          </div>
          <div><label className={labelClass}>טקסט בתחתית קבלה</label><textarea value={form.receiptFooterText} onChange={e => set('receiptFooterText', e.target.value)} rows={2} className={inputClass} /></div>
        </div>

        <div className="border-t border-brand-50 pt-4 space-y-3">
          <h3 className="font-medium text-brand-800 text-sm">משימות</h3>
          <div>
            <label className={labelClass}>תזכורת לפני יעד המשימה</label>
            <div className="flex gap-2">
              {[{ v: 15, label: '15 דק׳' }, { v: 30, label: 'חצי שעה' }, { v: 60, label: 'שעה' }, { v: 120, label: '2 שעות' }].map(({ v, label }) => (
                <button key={v} type="button"
                  onClick={() => { set('taskReminderMinutes', v) }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition touch-manipulation ${form.taskReminderMinutes === v ? 'bg-brand-500 text-white border-brand-500' : 'border-brand-200 text-brand-700 hover:bg-brand-50 active:bg-brand-100'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {saved && <div className="bg-green-50 text-green-700 text-sm rounded-xl px-4 py-3 border border-green-100">✓ נשמר בהצלחה</div>}
        <button type="submit" disabled={loading} className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 disabled:bg-brand-300 text-white font-semibold rounded-xl transition touch-manipulation text-base">{loading ? 'שומרת...' : 'שמירת הגדרות'}</button>
      </form>
    </div>
  )
}
