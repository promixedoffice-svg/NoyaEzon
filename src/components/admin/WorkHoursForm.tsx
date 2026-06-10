'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { dayOfWeekLabel } from '@/lib/utils'

const DAYS = [0, 1, 2, 3, 4, 5, 6]

interface WorkHour { id: string; dayOfWeek: number; isWorking: boolean; startTime: string; endTime: string }
interface AvailSettings { id: string; minBookingHours: number; maxAppointmentsPerDay: number | null; slotIntervalMinutes: number }

interface Props { workHours: WorkHour[]; availSettings: AvailSettings | null }

export function WorkHoursForm({ workHours: initial, availSettings: initialAvail }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const defaultHours = DAYS.map(day => {
    const existing = initial.find(w => w.dayOfWeek === day)
    return existing ?? { id: '', dayOfWeek: day, isWorking: day !== 6, startTime: '09:00', endTime: '18:00' }
  })

  const [hours, setHours] = useState(defaultHours)
  const [avail, setAvail] = useState({
    minBookingHours: initialAvail?.minBookingHours ?? 24,
    maxAppointmentsPerDay: initialAvail?.maxAppointmentsPerDay ?? null as number | null,
    slotIntervalMinutes: initialAvail?.slotIntervalMinutes ?? 15,
  })

  function updateDay(day: number, field: string, value: string | boolean) {
    setHours(prev => prev.map(h => h.dayOfWeek === day ? { ...h, [field]: value } : h))
    setSaved(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    await fetch('/api/settings/work-hours', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hours, avail }) })
    setLoading(false); setSaved(true); router.refresh()
  }

  const timeInputClass = "w-full px-3 py-2 rounded-xl border border-brand-200 bg-white text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition touch-manipulation"
  const numInputClass = "w-full px-3 py-2.5 rounded-xl border border-brand-200 bg-brand-50 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition touch-manipulation"

  return (
    <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-4 sm:p-6">
      <h2 className="font-semibold text-brand-900 mb-4">שעות עבודה וזמינות</h2>
      <form onSubmit={handleSave} className="space-y-4">

        {/* Days list */}
        <div className="space-y-1">
          {hours.map(h => (
            h.isWorking ? (
              /* Working day — compact card */
              <div key={h.dayOfWeek} className="rounded-xl border border-brand-100 bg-brand-50/40 px-3 py-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer touch-manipulation">
                  <input
                    type="checkbox"
                    checked={h.isWorking}
                    onChange={e => updateDay(h.dayOfWeek, 'isWorking', e.target.checked)}
                    className="w-4 h-4 rounded accent-brand-500 shrink-0"
                  />
                  <span className="font-medium text-brand-900 text-sm flex-1">{dayOfWeekLabel(String(h.dayOfWeek))}</span>
                </label>
                <div className="flex items-end gap-2 mt-2">
                  <div className="flex-1">
                    <p className="text-xs text-muted mb-1">משעה</p>
                    <input type="time" value={h.startTime} onChange={e => updateDay(h.dayOfWeek, 'startTime', e.target.value)} className={timeInputClass} dir="ltr" />
                  </div>
                  <span className="text-muted text-base mb-2 shrink-0">—</span>
                  <div className="flex-1">
                    <p className="text-xs text-muted mb-1">עד שעה</p>
                    <input type="time" value={h.endTime} onChange={e => updateDay(h.dayOfWeek, 'endTime', e.target.value)} className={timeInputClass} dir="ltr" />
                  </div>
                </div>
              </div>
            ) : (
              /* Closed day — slim row */
              <label key={h.dayOfWeek} className="flex items-center gap-2.5 px-1 py-1.5 cursor-pointer touch-manipulation">
                <input
                  type="checkbox"
                  checked={h.isWorking}
                  onChange={e => updateDay(h.dayOfWeek, 'isWorking', e.target.checked)}
                  className="w-4 h-4 rounded accent-brand-500 shrink-0"
                />
                <span className="text-sm text-muted flex-1">{dayOfWeekLabel(String(h.dayOfWeek))}</span>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">סגור</span>
              </label>
            )
          ))}
        </div>

        {/* Booking settings */}
        <div className="border-t border-brand-50 pt-3 space-y-3">
          <h3 className="font-medium text-brand-800 text-sm">הגדרות הזמנה</h3>

          <div>
            <label className="block text-xs font-medium text-brand-700 mb-1.5">קפיצות זמן בין תורים</label>
            <div className="flex gap-2">
              {[{ v: 5, label: '5 דק׳' }, { v: 15, label: 'רבע שעה' }, { v: 30, label: 'חצי שעה' }, { v: 60, label: 'שעה' }].map(({ v, label }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => { setAvail(p => ({ ...p, slotIntervalMinutes: v })); setSaved(false) }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition touch-manipulation ${avail.slotIntervalMinutes === v ? 'bg-brand-500 text-white border-brand-500' : 'border-brand-200 text-brand-700 hover:bg-brand-50 active:bg-brand-100'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-brand-700 mb-1.5">מינ׳ שעות מראש</label>
              <input type="number" value={avail.minBookingHours} onChange={e => setAvail(p => ({ ...p, minBookingHours: parseInt(e.target.value)||24 }))} className={numInputClass} min="1" dir="ltr" inputMode="numeric" />
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-700 mb-1.5">מקס׳ תורים ביום</label>
              <input type="number" value={avail.maxAppointmentsPerDay ?? ''} onChange={e => setAvail(p => ({ ...p, maxAppointmentsPerDay: e.target.value ? parseInt(e.target.value) : null }))} className={numInputClass} min="1" dir="ltr" inputMode="numeric" placeholder="ללא הגבלה" />
            </div>
          </div>
        </div>

        {saved && <div className="bg-green-50 text-green-700 text-sm rounded-xl px-4 py-3 border border-green-100">✓ נשמר בהצלחה</div>}
        <button type="submit" disabled={loading} className="w-full py-3 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 disabled:bg-brand-300 text-white font-semibold rounded-xl transition touch-manipulation text-base">{loading ? 'שומרת...' : 'שמירת שעות עבודה'}</button>
      </form>
    </div>
  )
}
