'use client'

import { useState, useMemo, useEffect } from 'react'
import { addDays, format, isBefore, startOfDay, getDay } from 'date-fns'
import { he } from 'date-fns/locale'
import { ChevronRight, ChevronLeft, Check, Clock, Calendar, Loader2 } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

interface Treatment { id: string; name: string; description: string | null; defaultPrice: number; durationMinutes: number; bufferMinutes: number; color: string; studentDiscountEnabled?: boolean; studentDiscountPercent?: number }
interface Addon { id: string; name: string; price: number }
interface WorkHour { dayOfWeek: number; isWorking: boolean; startTime: string; endTime: string }
interface BlockedTime { id: string; startAt: string; endAt: string; reason: string | null; isVacation: boolean }
interface CustomQuestion { id: string; label: string; type: 'single' | 'multi'; options: string[] }
interface Props { businessName: string; logoUrl?: string | null; welcomeMessage?: string | null; treatments: Treatment[]; addons?: Addon[]; workHours: WorkHour[]; minBookingHours: number; slotIntervalMinutes: number; blockedTimes?: BlockedTime[]; customQuestions?: CustomQuestion[] }

type Step = 'treatment' | 'date' | 'time' | 'info' | 'success'

export function BookingPortal({ businessName, logoUrl, welcomeMessage, treatments, addons = [], workHours, minBookingHours, blockedTimes = [], customQuestions = [] }: Props) {
  const [step, setStep] = useState<Step>('treatment')
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [info, setInfo] = useState({ name: '', phone: '', email: '', notes: '' })
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([])
  const [isStudentDiscount, setIsStudentDiscount] = useState(false)
  const [loading, setLoading] = useState(false)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [error, setError] = useState('')
  const [recognized, setRecognized] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [birthDate, setBirthDate] = useState('')
  const [customAnswers, setCustomAnswers] = useState<Record<string, string | string[]>>({})
  const [calendarOffset, setCalendarOffset] = useState(0)
  const [bookedAppointment, setBookedAppointment] = useState<{ id: string; startAt: string; endAt: string } | null>(null)

  const minDate = addDays(new Date(), Math.ceil(minBookingHours / 24))
  const calendarDays = useMemo(() => Array.from({ length: 28 }, (_, i) => addDays(minDate, i + calendarOffset)), [calendarOffset, minDate])

  function toggleAddon(id: string) {
    setSelectedAddonIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  function setSingleAnswer(questionId: string, value: string) {
    setCustomAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  function toggleMultiAnswer(questionId: string, value: string) {
    setCustomAnswers(prev => {
      const current = Array.isArray(prev[questionId]) ? prev[questionId] as string[] : []
      const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value]
      return { ...prev, [questionId]: next }
    })
  }

  const addonsTotal = useMemo(
    () => addons.filter(a => selectedAddonIds.includes(a.id)).reduce((sum, a) => sum + a.price, 0),
    [addons, selectedAddonIds]
  )
  const subtotal = (selectedTreatment?.defaultPrice ?? 0) + addonsTotal
  const discountPercent = selectedTreatment?.studentDiscountEnabled && isStudentDiscount ? (selectedTreatment.studentDiscountPercent ?? 0) : 0
  const discountAmount = subtotal * (discountPercent / 100)
  const finalPrice = subtotal - discountAmount

  function isWorkingDay(date: Date) {
    const wh = workHours.find(w => w.dayOfWeek === getDay(date))
    return wh?.isWorking ?? false
  }

  // Returns the blocking record if the ENTIRE day is blocked.
  function getFullDayBlock(date: Date): BlockedTime | null {
    const d0 = new Date(date); d0.setHours(0, 0, 0, 0)
    const d1 = new Date(date); d1.setHours(23, 59, 0, 0)
    return blockedTimes.find(bt => new Date(bt.startAt) <= d0 && new Date(bt.endAt) >= d1) ?? null
  }

  // Recognize returning client by phone and prefill their details
  useEffect(() => {
    const phone = info.phone.replace(/[-\s]/g, '')
    if (!/^0\d{8,9}$/.test(phone)) { setRecognized(false); return }
    const timer = setTimeout(() => {
      fetch(`/api/clients/lookup?phone=${encodeURIComponent(phone)}`)
        .then(r => r.json())
        .then(data => {
          if (data.fullName) {
            setInfo(p => ({ ...p, name: p.name || data.fullName, email: p.email || data.email || '' }))
            setRecognized(true)
          }
        })
        .catch(() => {})
    }, 600)
    return () => clearTimeout(timer)
  }, [info.phone])

  // Fetch real available slots when date+treatment selected
  useEffect(() => {
    if (!selectedDate || !selectedTreatment) return
    setSlotsLoading(true)
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    fetch(`/api/availability?date=${dateStr}&treatmentId=${selectedTreatment.id}`)
      .then(r => r.json())
      .then(data => { setAvailableSlots(data.slots ?? []); setSlotsLoading(false) })
      .catch(() => setSlotsLoading(false))
  }, [selectedDate, selectedTreatment])

  async function handleSubmit() {
    if (!selectedTreatment || !selectedDate || !selectedTime || !info.name || !info.phone || !termsAccepted) return
    setLoading(true); setError('')
    const [h, m] = selectedTime.split(':').map(Number)
    const startAt = new Date(selectedDate); startAt.setHours(h, m, 0, 0)
    const endAt = new Date(startAt.getTime() + selectedTreatment.durationMinutes * 60000)

    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        treatmentId: selectedTreatment.id,
        guestName: info.name,
        guestPhone: info.phone,
        guestEmail: info.email || null,
        notes: info.notes || null,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        price: finalPrice,
        addonIds: selectedAddonIds,
        isStudentDiscount: discountPercent > 0,
        status: 'pending',
        termsAccepted: true,
        birthDate: !recognized && birthDate ? birthDate : null,
        customAnswers: !recognized ? customAnswers : undefined,
      }),
    })

    setLoading(false)
    if (!res.ok) { setError('שגיאה בשליחת הבקשה. נסי שוב.'); return }
    const data = await res.json()
    setBookedAppointment({ id: data.id, startAt: startAt.toISOString(), endAt: endAt.toISOString() })
    setStep('success')
  }

  // Calendar add links
  function getCalendarLinks() {
    if (!bookedAppointment || !selectedTreatment) return null
    const title = encodeURIComponent(`תור — ${selectedTreatment.name} | ${businessName}`)
    const start = bookedAppointment.startAt
    const end = bookedAppointment.endAt
    const desc = encodeURIComponent(`תור ל${selectedTreatment.name} אצל ${businessName}`)

    const startFmt = start.replace(/[-:]/g, '').split('.')[0] + 'Z'
    const endFmt = end.replace(/[-:]/g, '').split('.')[0] + 'Z'

    return {
      google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startFmt}/${endFmt}&details=${desc}`,
      ics: `/api/calendar-invite?title=${title}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&description=${desc}`,
    }
  }

  if (step === 'success' && bookedAppointment) {
    const links = getCalendarLinks()
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Check size={36} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-brand-900 mb-2">הבקשה נשלחה!</h2>
          <p className="text-muted text-sm mb-5">בקשת התור שלך התקבלה ומחכה לאישור המעצבת.</p>

          {/* Summary */}
          <div className="bg-brand-50 rounded-2xl p-5 text-right mb-5 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted">טיפול</span>
              <span className="font-semibold text-brand-900">{selectedTreatment?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">תאריך</span>
              <span className="font-semibold text-brand-900">
                {selectedDate ? format(selectedDate, 'EEEE, d MMMM yyyy', { locale: he }) : ''}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">שעה</span>
              <span className="font-semibold text-brand-900">{selectedTime}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">מחיר</span>
              <span className="font-semibold text-brand-900">{formatCurrency(finalPrice)}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-amber-600 bg-amber-50 rounded-xl p-3 text-sm mb-6">
            <Clock size={16} /> ממתין לאישור המעצבת
          </div>

          {/* Add to calendar */}
          {links && (
            <div>
              <p className="text-sm font-medium text-brand-800 mb-3 flex items-center justify-center gap-2">
                <Calendar size={16} /> הוסיפי לוח שנה שלך
              </p>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={links.google}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-white border border-brand-200 hover:border-brand-400 hover:bg-brand-50 text-brand-800 text-sm font-medium py-2.5 rounded-xl transition"
                >
                  📅 Google Calendar
                </a>
                <a
                  href={links.ics}
                  className="flex items-center justify-center gap-2 bg-white border border-brand-200 hover:border-brand-400 hover:bg-brand-50 text-brand-800 text-sm font-medium py-2.5 rounded-xl transition"
                >
                  🍎 Apple / Outlook
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const steps = [
    { key: 'treatment', label: 'טיפול' },
    { key: 'date', label: 'תאריך' },
    { key: 'time', label: 'שעה' },
    { key: 'info', label: 'פרטים' },
  ]
  const currentStepIndex = steps.findIndex(s => s.key === step)

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-md mb-3 text-3xl overflow-hidden">
          {logoUrl ? <img src={logoUrl} alt={businessName} className="w-full h-full object-contain" /> : '💅'}
        </div>
        <h1 className="text-2xl font-bold text-brand-900">{businessName}</h1>
        <p className="text-muted text-sm mt-1">הזמנת תור אונליין</p>
        {welcomeMessage && <p className="text-brand-700 text-sm mt-2 max-w-md mx-auto">{welcomeMessage}</p>}
      </div>

      <div className="flex justify-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition',
              i < currentStepIndex ? 'bg-brand-500 text-white' :
              i === currentStepIndex ? 'bg-brand-100 text-brand-600 ring-2 ring-brand-400' :
              'bg-gray-100 text-gray-400'
            )}>
              {i < currentStepIndex ? <Check size={12} /> : i + 1}
            </div>
            <span className={cn('text-xs font-medium hidden sm:block', i === currentStepIndex ? 'text-brand-700' : 'text-muted')}>{s.label}</span>
            {i < steps.length - 1 && <div className="w-8 h-px bg-brand-200" />}
          </div>
        ))}
      </div>

      <div className="max-w-lg mx-auto">
        {/* Step 1: Treatment */}
        {step === 'treatment' && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-brand-900 text-center mb-4">בחרי סוג טיפול</h2>
            {treatments.map(t => (
              <button key={t.id} onClick={() => { setSelectedTreatment(t); setSelectedAddonIds([]); setIsStudentDiscount(false); setStep('date') }}
                className="w-full bg-white rounded-2xl border border-brand-100 shadow-sm hover:shadow-md hover:border-brand-300 p-5 text-right transition flex items-center gap-4 group">
                <div className="w-3 h-12 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                <div className="flex-1">
                  <p className="font-semibold text-brand-900 group-hover:text-brand-600 transition">{t.name}</p>
                  {t.description && <p className="text-sm text-muted mt-0.5">{t.description}</p>}
                  <div className="flex gap-3 mt-1 text-xs text-muted">
                    <span>{t.durationMinutes} דקות</span>
                    <span className="font-semibold text-brand-600">{formatCurrency(t.defaultPrice)}</span>
                  </div>
                </div>
                <ChevronLeft size={18} className="text-brand-300 group-hover:text-brand-500 transition" />
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Date */}
        {step === 'date' && (
          <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-brand-900 text-center mb-5">בחרי תאריך</h2>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCalendarOffset(p => Math.max(0, p - 7))} disabled={calendarOffset === 0} className="p-2 rounded-xl hover:bg-brand-50 disabled:opacity-30 text-brand-600 transition"><ChevronRight size={18} /></button>
              <span className="text-sm font-medium text-brand-700">{format(calendarDays[0], 'MMMM yyyy', { locale: he })}</span>
              <button onClick={() => setCalendarOffset(p => p + 7)} className="p-2 rounded-xl hover:bg-brand-50 text-brand-600 transition"><ChevronLeft size={18} /></button>
            </div>
            <div className="grid grid-cols-7 mb-2">{['א','ב','ג','ד','ה','ו','ש'].map(d => <div key={d} className="text-center text-xs text-muted font-medium py-1">{d}</div>)}</div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: getDay(calendarDays[0]) }).map((_, i) => <div key={i} />)}
              {calendarDays.map(day => {
                const working = isWorkingDay(day)
                const isPast = isBefore(day, startOfDay(minDate))
                const isSelected = selectedDate && format(day,'yyyy-MM-dd') === format(selectedDate,'yyyy-MM-dd')
                const fullBlock = getFullDayBlock(day)
                const disabled = !working || isPast || !!fullBlock
                return (
                  <button
                    key={day.toISOString()}
                    disabled={disabled}
                    onClick={() => { setSelectedDate(day); setAvailableSlots([]); setStep('time') }}
                    title={fullBlock?.reason ? fullBlock.reason : fullBlock ? (fullBlock.isVacation ? 'יום חופש' : 'לא זמין') : undefined}
                    className={cn('relative h-10 rounded-xl text-sm font-medium transition',
                      isSelected ? 'bg-brand-500 text-white' :
                      fullBlock ? 'bg-red-50 text-red-300 cursor-not-allowed' :
                      working && !isPast ? 'hover:bg-brand-100 text-brand-900' :
                      'text-gray-300 cursor-not-allowed'
                    )}>
                    {format(day, 'd')}
                    {fullBlock && (
                      <span className="absolute bottom-0.5 right-0 left-0 flex justify-center text-[8px] leading-none text-red-400">
                        {fullBlock.isVacation ? '🏖️' : '🔒'}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Legend for blocked days */}
            {calendarDays.some(d => !!getFullDayBlock(d)) && (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted bg-red-50 rounded-xl px-3 py-2">
                <span>🔒</span>
                <span>ימים עם אייקון אינם זמינים להזמנה</span>
              </div>
            )}

            <button onClick={() => setStep('treatment')} className="mt-4 text-sm text-muted hover:text-brand-600 transition w-full text-center">← חזרה</button>
          </div>
        )}

        {/* Step 3: Time */}
        {step === 'time' && selectedDate && (
          <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-brand-900 text-center mb-2">בחרי שעה</h2>
            <p className="text-center text-muted text-sm mb-5">{format(selectedDate, 'EEEE, d MMMM', { locale: he })}</p>
            {slotsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-brand-400" size={28} /></div>
            ) : availableSlots.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted">אין שעות פנויות ביום זה</p>
                <button onClick={() => setStep('date')} className="mt-3 text-sm text-brand-500 hover:text-brand-700 transition">בחרי תאריך אחר</button>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {availableSlots.map(slot => (
                  <button key={slot} onClick={() => { setSelectedTime(slot); setStep('info') }}
                    className="py-3 rounded-xl border border-brand-200 hover:border-brand-400 hover:bg-brand-50 text-sm font-medium text-brand-800 transition">
                    {slot}
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setStep('date')} className="mt-4 text-sm text-muted hover:text-brand-600 transition w-full text-center">← חזרה</button>
          </div>
        )}

        {/* Step 4: Info */}
        {step === 'info' && (
          <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-brand-900 text-center mb-5">פרטי הזמנה</h2>
            <div className="bg-brand-50 rounded-xl p-4 mb-5 text-sm text-brand-800 space-y-1">
              <p>🌸 <strong>{selectedTreatment?.name}</strong></p>
              <p>📅 {selectedDate ? format(selectedDate, 'EEEE, d MMMM', { locale: he }) : ''} · {selectedTime}</p>
              <p>⏱ {selectedTreatment?.durationMinutes} דקות · {formatCurrency(selectedTreatment?.defaultPrice ?? 0)}</p>
            </div>

            {/* Add-ons */}
            {addons.length > 0 && (
              <div className="bg-white border border-brand-100 rounded-xl p-4 mb-5">
                <p className="text-sm font-medium text-brand-800 mb-3">תוספות (אופציונלי)</p>
                <div className="space-y-2">
                  {addons.map(a => (
                    <label key={a.id} className="flex items-center justify-between gap-3 cursor-pointer">
                      <span className="flex items-center gap-2 text-sm text-brand-900">
                        <input type="checkbox" checked={selectedAddonIds.includes(a.id)} onChange={() => toggleAddon(a.id)} className="w-4 h-4 rounded accent-brand-500" />
                        {a.name}
                      </span>
                      <span className="text-sm font-medium text-brand-600">{formatCurrency(a.price)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Student/soldier discount */}
            {selectedTreatment?.studentDiscountEnabled && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isStudentDiscount} onChange={e => setIsStudentDiscount(e.target.checked)} className="w-4 h-4 rounded accent-brand-500" />
                  <span className="text-sm font-medium text-amber-900">חיילת/סטודנטית (הנחה {selectedTreatment.studentDiscountPercent}%)</span>
                </label>
              </div>
            )}

            {/* Price summary */}
            {(addonsTotal > 0 || discountAmount > 0) && (
              <div className="bg-brand-50 rounded-xl p-4 mb-5 text-sm space-y-1">
                <div className="flex justify-between text-brand-700">
                  <span>סכום ביניים</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span>הנחת חיילת/סטודנטית ({discountPercent}%)</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-brand-900 pt-1 border-t border-brand-100">
                  <span>סה״כ לתשלום</span>
                  <span>{formatCurrency(finalPrice)}</span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-800 mb-1.5">טלפון *</label>
                <input required type="tel" value={info.phone} onChange={e => setInfo(p => ({ ...p, phone: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-brand-200 bg-brand-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition" placeholder="050-0000000" dir="ltr" />
              </div>
              {recognized && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2 text-xs text-green-800">
                  <Check size={13} className="shrink-0" />
                  <span>תודה שחזרת! זיהינו אותך ומילאנו עבורך את הפרטים - ניתן לערוך אותם</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-brand-800 mb-1.5">שם מלא *</label>
                <input required value={info.name} onChange={e => setInfo(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-brand-200 bg-brand-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition" placeholder="שם פרטי + שם משפחה" />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-800 mb-1.5">אימייל (לאישור + הוספה ליומן)</label>
                <input type="email" value={info.email} onChange={e => setInfo(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-brand-200 bg-brand-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition" placeholder="email@example.com" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-800 mb-1.5">הערה למטפלת (אופציונלי)</label>
                <textarea value={info.notes} onChange={e => setInfo(p => ({ ...p, notes: e.target.value }))} rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-brand-200 bg-brand-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition resize-none"
                  placeholder="בקשות מיוחדות, הערות לטיפול..." />
              </div>

              {/* First-time client extras */}
              {!recognized && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-brand-800 mb-1.5">תאריך לידה (אופציונלי)</label>
                    <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-brand-200 bg-brand-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition" dir="ltr" />
                    <p className="text-xs text-muted mt-1">שנדע להגיד מזל טוב ביום הולדתך 🎂</p>
                  </div>

                  {customQuestions.map(q => (
                    <div key={q.id}>
                      <label className="block text-sm font-medium text-brand-800 mb-1.5">{q.label}</label>
                      <div className="flex flex-wrap gap-2">
                        {q.options.map(opt => (
                          <label key={opt} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-brand-200 bg-brand-50 text-sm cursor-pointer">
                            {q.type === 'single' ? (
                              <input type="radio" name={`cq-${q.id}`} checked={customAnswers[q.id] === opt} onChange={() => setSingleAnswer(q.id, opt)} className="accent-brand-500" />
                            ) : (
                              <input type="checkbox" checked={Array.isArray(customAnswers[q.id]) && (customAnswers[q.id] as string[]).includes(opt)} onChange={() => toggleMultiAnswer(q.id, opt)} className="accent-brand-500" />
                            )}
                            {opt}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Disclaimer */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-800">
              <span className="text-base leading-none mt-0.5">⚠️</span>
              <p>בקשת התור <strong>אינה בתוקף</strong> עד לאישור המטפלת. תקבלי הודעה לאחר האישור.</p>
            </div>

            {/* Terms acceptance */}
            <label className="flex items-start gap-2 cursor-pointer text-xs text-brand-800">
              <input type="checkbox" required checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} className="w-4 h-4 rounded accent-brand-500 mt-0.5 shrink-0" />
              <span>
                קראתי ואני מסכימ/ה ל
                <a href="/legal" target="_blank" rel="noopener noreferrer" className="text-brand-600 underline hover:text-brand-700">תנאי השימוש ומדיניות הפרטיות</a>
                {' '}של {businessName}
              </span>
            </label>

            {error && <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 border border-red-100">{error}</div>}
            <div className="flex gap-3">
              <button onClick={handleSubmit} disabled={loading || !info.name || !info.phone || !termsAccepted}
                className="flex-1 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-semibold rounded-xl transition">
                {loading ? 'שולחת...' : 'שליחת בקשת תור'}
              </button>
              <button onClick={() => setStep('time')} className="px-5 py-3 border border-brand-200 text-brand-700 hover:bg-brand-50 font-medium rounded-xl transition">חזרה</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
