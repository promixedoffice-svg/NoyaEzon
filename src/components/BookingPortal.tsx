'use client'

import { useState, useMemo } from 'react'
import { addDays, format, isBefore, startOfDay, getDay } from 'date-fns'
import { he } from 'date-fns/locale'
import { ChevronRight, ChevronLeft, Check, Clock } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

interface Treatment { id: string; name: string; description: string | null; defaultPrice: number; durationMinutes: number; bufferMinutes: number; color: string }
interface WorkHour { dayOfWeek: number; isWorking: boolean; startTime: string; endTime: string }
interface Props { businessName: string; treatments: Treatment[]; workHours: WorkHour[]; minBookingHours: number; slotIntervalMinutes: number }

export function BookingPortal({ businessName, treatments, workHours, minBookingHours, slotIntervalMinutes }: Props) {
  const [step, setStep] = useState<'treatment' | 'date' | 'time' | 'info'>('treatment')
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [info, setInfo] = useState({ name: '', phone: '', email: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [calendarOffset, setCalendarOffset] = useState(0)

  const minDate = addDays(new Date(), Math.ceil(minBookingHours / 24))
  const calendarDays = useMemo(() => Array.from({ length: 28 }, (_, i) => addDays(minDate, i + calendarOffset)), [calendarOffset, minDate])

  function isWorkingDay(date: Date) { const wh = workHours.find(w => w.dayOfWeek === getDay(date)); return wh?.isWorking ?? false }

  function getTimeSlots(date: Date, treatment: Treatment) {
    const wh = workHours.find(w => w.dayOfWeek === getDay(date))
    if (!wh || !wh.isWorking) return []
    const [sh, sm] = wh.startTime.split(':').map(Number)
    const [eh, em] = wh.endTime.split(':').map(Number)
    const startMin = sh * 60 + sm; const endMin = eh * 60 + em
    const totalDur = treatment.durationMinutes + treatment.bufferMinutes
    const slots: string[] = []
    for (let m = startMin; m + totalDur <= endMin; m += slotIntervalMinutes) {
      slots.push(`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`)
    }
    return slots
  }

  const timeSlots = useMemo(() => selectedDate && selectedTreatment ? getTimeSlots(selectedDate, selectedTreatment) : [], [selectedDate, selectedTreatment])

  async function handleSubmit() {
    if (!selectedTreatment || !selectedDate || !selectedTime || !info.name || !info.phone) return
    setLoading(true); setError('')
    const [h, m] = selectedTime.split(':').map(Number)
    const startAt = new Date(selectedDate); startAt.setHours(h, m, 0, 0)
    const endAt = new Date(startAt.getTime() + selectedTreatment.durationMinutes * 60000)

    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ treatmentId: selectedTreatment.id, guestName: info.name, guestPhone: info.phone, guestEmail: info.email || null, startAt: startAt.toISOString(), endAt: endAt.toISOString(), price: selectedTreatment.defaultPrice, status: 'pending' }),
    })

    setLoading(false)
    if (!res.ok) { setError('שגיאה בשליחת הבקשה. נסי שוב.'); return }
    setSuccess(true)
  }

  if (success) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5"><Check size={36} className="text-green-500" /></div>
        <h2 className="text-2xl font-bold text-brand-900 mb-2">הבקשה נשלחה!</h2>
        <p className="text-muted">בקשת התור שלך התקבלה ומחכה לאישור.</p>
        <div className="mt-6 bg-brand-50 rounded-xl p-4 text-sm text-brand-800 space-y-1">
          <p><strong>טיפול:</strong> {selectedTreatment?.name}</p>
          <p><strong>תאריך:</strong> {selectedDate ? format(selectedDate, 'EEEE, d MMMM yyyy', { locale: he }) : ''}</p>
          <p><strong>שעה:</strong> {selectedTime}</p>
        </div>
        <div className="mt-5 flex items-center justify-center gap-2 text-amber-600 bg-amber-50 rounded-xl p-3 text-sm"><Clock size={16} />התור ממתין לאישור המעצבת</div>
      </div>
    </div>
  )

  const steps = [{ key: 'treatment', label: 'טיפול' }, { key: 'date', label: 'תאריך' }, { key: 'time', label: 'שעה' }, { key: 'info', label: 'פרטים' }]
  const currentStepIndex = steps.findIndex(s => s.key === step)

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-md mb-3 text-3xl">💅</div>
        <h1 className="text-2xl font-bold text-brand-900">{businessName}</h1>
        <p className="text-muted text-sm mt-1">הזמנת תור אונליין</p>
      </div>

      <div className="flex justify-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition', i < currentStepIndex ? 'bg-brand-500 text-white' : i === currentStepIndex ? 'bg-brand-100 text-brand-600 ring-2 ring-brand-400' : 'bg-gray-100 text-gray-400')}>
              {i < currentStepIndex ? <Check size={12} /> : i + 1}
            </div>
            <span className={cn('text-xs font-medium hidden sm:block', i === currentStepIndex ? 'text-brand-700' : 'text-muted')}>{s.label}</span>
            {i < steps.length - 1 && <div className="w-8 h-px bg-brand-200" />}
          </div>
        ))}
      </div>

      <div className="max-w-lg mx-auto">
        {step === 'treatment' && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-brand-900 text-center mb-4">בחרי סוג טיפול</h2>
            {treatments.map(t => (
              <button key={t.id} onClick={() => { setSelectedTreatment(t); setStep('date') }} className="w-full bg-white rounded-2xl border border-brand-100 shadow-sm hover:shadow-md hover:border-brand-300 p-5 text-right transition flex items-center gap-4 group">
                <div className="w-3 h-12 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                <div className="flex-1">
                  <p className="font-semibold text-brand-900 group-hover:text-brand-600 transition">{t.name}</p>
                  {t.description && <p className="text-sm text-muted mt-0.5">{t.description}</p>}
                  <div className="flex gap-3 mt-1 text-xs text-muted"><span>{t.durationMinutes} דקות</span><span className="font-semibold text-brand-600">{formatCurrency(t.defaultPrice)}</span></div>
                </div>
                <ChevronLeft size={18} className="text-brand-300 group-hover:text-brand-500 transition" />
              </button>
            ))}
          </div>
        )}

        {step === 'date' && (
          <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-brand-900 text-center mb-5">בחרי תאריך</h2>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCalendarOffset(prev => Math.max(0, prev - 7))} disabled={calendarOffset === 0} className="p-2 rounded-xl hover:bg-brand-50 disabled:opacity-30 text-brand-600 transition"><ChevronRight size={18} /></button>
              <span className="text-sm font-medium text-brand-700">{format(calendarDays[0], 'MMMM yyyy', { locale: he })}</span>
              <button onClick={() => setCalendarOffset(prev => prev + 7)} className="p-2 rounded-xl hover:bg-brand-50 text-brand-600 transition"><ChevronLeft size={18} /></button>
            </div>
            <div className="grid grid-cols-7 mb-2">{['א','ב','ג','ד','ה','ו','ש'].map(d => <div key={d} className="text-center text-xs text-muted font-medium py-1">{d}</div>)}</div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: getDay(calendarDays[0]) }).map((_, i) => <div key={i} />)}
              {calendarDays.map(day => {
                const working = isWorkingDay(day); const isPast = isBefore(day, startOfDay(minDate))
                const isSelected = selectedDate && format(day,'yyyy-MM-dd') === format(selectedDate,'yyyy-MM-dd')
                return (
                  <button key={day.toISOString()} disabled={!working || isPast} onClick={() => { setSelectedDate(day); setStep('time') }}
                    className={cn('h-10 rounded-xl text-sm font-medium transition', isSelected ? 'bg-brand-500 text-white' : working && !isPast ? 'hover:bg-brand-100 text-brand-900' : 'text-gray-300 cursor-not-allowed')}>
                    {format(day, 'd')}
                  </button>
                )
              })}
            </div>
            <button onClick={() => setStep('treatment')} className="mt-4 text-sm text-muted hover:text-brand-600 transition w-full text-center">← חזרה</button>
          </div>
        )}

        {step === 'time' && selectedDate && (
          <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-brand-900 text-center mb-2">בחרי שעה</h2>
            <p className="text-center text-muted text-sm mb-5">{format(selectedDate, 'EEEE, d MMMM', { locale: he })}</p>
            {timeSlots.length === 0 ? <p className="text-center text-muted">אין שעות פנויות ביום זה</p> : (
              <div className="grid grid-cols-4 gap-2">
                {timeSlots.map(slot => (
                  <button key={slot} onClick={() => { setSelectedTime(slot); setStep('info') }} className="py-3 rounded-xl border border-brand-200 hover:border-brand-400 hover:bg-brand-50 text-sm font-medium text-brand-800 transition">{slot}</button>
                ))}
              </div>
            )}
            <button onClick={() => setStep('date')} className="mt-4 text-sm text-muted hover:text-brand-600 transition w-full text-center">← חזרה</button>
          </div>
        )}

        {step === 'info' && (
          <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-brand-900 text-center mb-5">פרטי הזמנה</h2>
            <div className="bg-brand-50 rounded-xl p-4 mb-5 text-sm text-brand-800 space-y-1">
              <p>🌸 <strong>{selectedTreatment?.name}</strong></p>
              <p>📅 {selectedDate ? format(selectedDate, 'EEEE, d MMMM', { locale: he }) : ''} · {selectedTime}</p>
              <p>⏱ {selectedTreatment?.durationMinutes} דקות · {formatCurrency(selectedTreatment?.defaultPrice ?? 0)}</p>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-brand-800 mb-1.5">שם מלא *</label><input required value={info.name} onChange={e => setInfo(p => ({ ...p, name: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-brand-200 bg-brand-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition" placeholder="שם פרטי + שם משפחה" /></div>
              <div><label className="block text-sm font-medium text-brand-800 mb-1.5">טלפון *</label><input required type="tel" value={info.phone} onChange={e => setInfo(p => ({ ...p, phone: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-brand-200 bg-brand-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition" placeholder="050-0000000" dir="ltr" /></div>
              <div><label className="block text-sm font-medium text-brand-800 mb-1.5">אימייל (לאישור)</label><input type="email" value={info.email} onChange={e => setInfo(p => ({ ...p, email: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-brand-200 bg-brand-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition" placeholder="email@example.com" dir="ltr" /></div>
            </div>
            {error && <div className="mt-4 bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 border border-red-100">{error}</div>}
            <div className="flex gap-3 mt-5">
              <button onClick={handleSubmit} disabled={loading || !info.name || !info.phone} className="flex-1 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-semibold rounded-xl transition">{loading ? 'שולחת...' : 'שליחת בקשת תור'}</button>
              <button onClick={() => setStep('time')} className="px-5 py-3 border border-brand-200 text-brand-700 hover:bg-brand-50 font-medium rounded-xl transition">חזרה</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
