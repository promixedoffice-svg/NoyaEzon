'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addDays, addWeeks, addMonths, subWeeks, subMonths, isSameDay, isToday
} from 'date-fns'
import { he } from 'date-fns/locale'
import { ChevronRight, ChevronLeft, Plus, Check, X, Clock } from 'lucide-react'
import { cn, formatTime, appointmentStatusLabel, appointmentStatusColor, formatCurrency } from '@/lib/utils'
import { AppointmentModal } from './AppointmentModal'
import { CompleteReceiptModal } from './CompleteReceiptModal'

type ViewMode = 'day' | 'week' | 'month'
type Appointment = any
type BlockedTime = { id: string; startAt: string; endAt: string; reason: string | null; isVacation: boolean }
type Treatment = { id: string; name: string; defaultPrice: number; durationMinutes: number; bufferMinutes: number; color: string; studentDiscountEnabled?: boolean; studentDiscountPercent?: number }
type Client = { id: string; fullName: string; phone: string | null }
type Addon = { id: string; name: string; price: number }

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7)

interface Props { treatments: Treatment[]; clients: Client[]; addons: Addon[] }

export function CalendarView({ treatments, clients, addons }: Props) {
  const [view, setView] = useState<ViewMode>('day')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [newApptTime, setNewApptTime] = useState<Date | null>(null)
  const [completingAppt, setCompletingAppt] = useState<Appointment | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const fetchAppointments = useCallback(async () => {
    setLoading(true)
    let start: Date, end: Date
    if (view === 'day') { start = new Date(currentDate); start.setHours(0,0,0,0); end = new Date(currentDate); end.setHours(23,59,59,999) }
    else if (view === 'week') { start = startOfWeek(currentDate, { weekStartsOn: 0 }); end = endOfWeek(currentDate, { weekStartsOn: 0 }) }
    else { start = startOfMonth(currentDate); end = endOfMonth(currentDate) }

    const [apptRes, blockedRes] = await Promise.all([
      fetch(`/api/appointments?start=${start.toISOString()}&end=${end.toISOString()}`),
      fetch('/api/blocked-times'),
    ])
    setAppointments(await apptRes.json())
    setBlockedTimes(await blockedRes.json())
    setLoading(false)
  }, [view, currentDate])

  useEffect(() => { fetchAppointments() }, [fetchAppointments])

  // Default to day view on mobile
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) setView('day')
    else setView('week')
  }, [])

  // Auto-scroll to current hour in day/week view
  useEffect(() => {
    if (view !== 'month' && scrollRef.current) {
      const now = new Date()
      const hour = now.getHours()
      if (hour >= 7 && hour <= 21) {
        const scrollTo = Math.max(0, (hour - 7 - 1) * 64)
        scrollRef.current.scrollTop = scrollTo
      }
    }
  }, [view])

  function navigate(dir: 1 | -1) {
    if (view === 'day') setCurrentDate(prev => addDays(prev, dir))
    else if (view === 'week') setCurrentDate(prev => dir === 1 ? addWeeks(prev, 1) : subWeeks(prev, 1))
    else setCurrentDate(prev => dir === 1 ? addMonths(prev, 1) : subMonths(prev, 1))
  }

  async function updateStatus(appt: Appointment, status: string) {
    const now = new Date().toISOString()
    await fetch(`/api/appointments/${appt.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        ...(status === 'confirmed' ? { confirmedAt: now } : {}),
        ...(status === 'cancelled' ? { cancelledAt: now } : {}),
        ...(status === 'completed' ? { completedAt: now } : {}),
      }),
    })
    fetchAppointments()
    setSelectedAppt(null)
  }

  const headerLabel = () => {
    if (view === 'day') return format(currentDate, 'EEEE, d MMMM yyyy', { locale: he })
    if (view === 'week') { const s = startOfWeek(currentDate, { weekStartsOn: 0 }); const e = endOfWeek(currentDate, { weekStartsOn: 0 }); return `${format(s, 'd MMM', { locale: he })} – ${format(e, 'd MMM yyyy', { locale: he })}` }
    return format(currentDate, 'MMMM yyyy', { locale: he })
  }

  const weekDays = view === 'week' ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(currentDate, { weekStartsOn: 0 }), i)) : view === 'day' ? [currentDate] : []
  const apptsByDay = (day: Date) => appointments.filter((a: any) => isSameDay(new Date(a.startAt), day))
  const pendingCount = appointments.filter((a: any) => a.status === 'pending').length

  return (
    <div className="bg-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
      {/* ── Calendar Header ── */}
      <div className="border-b border-brand-50">
        {/* Row 1: Navigation + desktop controls */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3">
          <div className="flex items-center gap-1 sm:gap-2">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-brand-50 text-brand-600 transition"><ChevronRight size={18} /></button>
            <button onClick={() => setCurrentDate(new Date())} className="text-sm font-semibold text-brand-900 px-2 sm:px-3 py-1.5 rounded-xl hover:bg-brand-50 transition text-center max-w-[160px] sm:min-w-[160px] truncate">{headerLabel()}</button>
            <button onClick={() => navigate(1)} className="p-2 rounded-xl hover:bg-brand-50 text-brand-600 transition"><ChevronLeft size={18} /></button>
          </div>
          {/* Desktop only controls */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="bg-brand-50 rounded-xl p-1 flex">
              {(['day', 'week', 'month'] as ViewMode[]).map(v => (
                <button key={v} onClick={() => setView(v)} className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition', view === v ? 'bg-white text-brand-900 shadow-sm' : 'text-muted hover:text-brand-700')}>
                  {v === 'day' ? 'יום' : v === 'week' ? 'שבוע' : 'חודש'}
                </button>
              ))}
            </div>
            <button onClick={() => { setNewApptTime(null); setShowNewModal(true) }} className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition shadow-sm">
              <Plus size={16} /> תור חדש
            </button>
          </div>
        </div>
        {/* Row 2: Mobile controls only */}
        <div className="sm:hidden flex items-center gap-2 px-4 pb-3">
          <div className="bg-brand-50 rounded-xl p-1 flex flex-1">
            {(['day', 'month'] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setView(v)} className={cn('flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition', view === v ? 'bg-white text-brand-900 shadow-sm' : 'text-muted')}>
                {v === 'day' ? 'יום' : 'חודש'}
              </button>
            ))}
          </div>
          <button onClick={() => { setNewApptTime(null); setShowNewModal(true) }} className="flex items-center justify-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition shadow-sm">
            <Plus size={16} /> תור
          </button>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="bg-amber-50 border-b border-amber-100 px-5 py-2.5 flex items-center gap-2 text-amber-700 text-sm">
          <Clock size={14} /> {pendingCount} תורים ממתינים לאישור
        </div>
      )}

      {view === 'month' ? (
        <MonthView currentDate={currentDate} appointments={appointments} onDayClick={day => { setCurrentDate(day); setView('day') }} onApptClick={setSelectedAppt} />
      ) : (
        <div className="overflow-auto" ref={scrollRef}>
          <div className={view === 'week' ? 'min-w-[600px]' : ''}>
            <div className={cn('grid border-b border-brand-50', view === 'week' ? 'grid-cols-[60px_repeat(7,1fr)]' : 'grid-cols-[60px_1fr]')}>
              <div className="border-l border-brand-50" />
              {weekDays.map(day => (
                <div key={day.toISOString()} className={cn('text-center py-3 text-sm border-l border-brand-50 cursor-pointer hover:bg-brand-50 transition', isToday(day) && 'bg-brand-50')} onClick={() => { setCurrentDate(day); setView('day') }}>
                  <p className="text-xs text-muted">{format(day, 'EEE', { locale: he })}</p>
                  <p className={cn('font-semibold mt-0.5', isToday(day) ? 'text-brand-500' : 'text-brand-900')}>{format(day, 'd')}</p>
                  <p className="text-xs text-muted">{apptsByDay(day).length} תורים</p>
                </div>
              ))}
            </div>
            <div className={cn('grid relative', view === 'week' ? 'grid-cols-[60px_repeat(7,1fr)]' : 'grid-cols-[60px_1fr]')}>
              <div>{HOURS.map(h => (<div key={h} className="h-16 border-b border-brand-50 flex items-start pt-1 pr-2"><span className="text-xs text-muted">{String(h).padStart(2,'0')}:00</span></div>))}</div>
              {weekDays.map(day => {
                const dayAppts = apptsByDay(day)
                return (
                  <div key={day.toISOString()} className={cn('relative border-l border-brand-50', isToday(day) && 'bg-brand-50/30')} style={{ height: `${HOURS.length * 64}px` }}
                    onClick={e => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      const y = e.clientY - rect.top
                      const totalMin = (y / rect.height) * HOURS.length * 60
                      const hour = Math.floor(totalMin / 60) + 7
                      const minute = Math.round((totalMin % 60) / 15) * 15
                      const d = new Date(day); d.setHours(hour, minute, 0, 0)
                      setNewApptTime(d); setShowNewModal(true)
                    }}>
                    {HOURS.map(h => (<div key={h} className="absolute w-full border-t border-brand-50" style={{ top: `${(h-7)*64}px` }} />))}
                    {/* Current time indicator */}
                    {isToday(day) && (() => {
                      const now = new Date()
                      const nowMin = (now.getHours() - 7) * 60 + now.getMinutes()
                      if (nowMin < 0 || nowMin > HOURS.length * 60) return null
                      return (
                        <div className="absolute left-0 right-0 z-10 pointer-events-none flex items-center" style={{ top: `${(nowMin / 60) * 64}px` }}>
                          <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                          <div className="flex-1 h-px bg-red-400" />
                        </div>
                      )
                    })()}
                    {/* Blocked times */}
                    {blockedTimes.filter(bt => {
                      const btStart = new Date(bt.startAt); const btEnd = new Date(bt.endAt)
                      return btStart.toDateString() === day.toDateString() || (btStart < day && btEnd > day)
                    }).map(bt => {
                      const btStart = new Date(bt.startAt)
                      const btEnd = new Date(bt.endAt)
                      const startMin = Math.max((btStart.getHours()-7)*60+btStart.getMinutes(), 0)
                      const endMin = Math.min((btEnd.getHours()-7)*60+btEnd.getMinutes(), 14*60)
                      const top = (startMin/60)*64; const height = Math.max(((endMin-startMin)/60)*64, 20)
                      return (
                        <div key={bt.id} className="absolute left-0 right-0 opacity-60 pointer-events-none"
                          style={{ top: `${top}px`, height: `${height}px`, backgroundColor: bt.isVacation ? '#fed7aa' : '#fecaca', borderRight: `3px solid ${bt.isVacation ? '#f97316' : '#ef4444'}` }}>
                          <p className="text-xs font-medium px-1 pt-0.5 truncate" style={{ color: bt.isVacation ? '#c2410c' : '#dc2626' }}>
                            {bt.isVacation ? '🏖' : '🔒'} {bt.reason ?? 'חסום'}
                          </p>
                        </div>
                      )
                    })}
                    {dayAppts.map((appt: any) => {
                      const start = new Date(appt.startAt); const end = new Date(appt.endAt)
                      const topMin = (start.getHours()-7)*60+start.getMinutes()
                      const durationMin = (end.getTime()-start.getTime())/60000
                      const top = (topMin/60)*64; const height = Math.max((durationMin/60)*64, 30)
                      return (
                        <div key={appt.id} onClick={e => { e.stopPropagation(); setSelectedAppt(appt) }}
                          className={cn('absolute left-0.5 right-0.5 rounded-lg px-2 py-1 text-xs cursor-pointer hover:brightness-95 transition overflow-hidden', appt.status === 'pending' && 'border-2 border-dashed border-amber-400')}
                          style={{ top: `${top}px`, height: `${height}px`, backgroundColor: (appt.treatment?.color ?? '#d4605c')+'33', borderRight: `3px solid ${appt.treatment?.color ?? '#d4605c'}` }}>
                          <p className="font-semibold truncate" style={{ color: appt.treatment?.color ?? '#d4605c' }}>{appt.client?.fullName ?? appt.guestName}</p>
                          {height > 35 && <p className="text-muted truncate">{appt.treatment?.name}</p>}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {selectedAppt && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40" onClick={() => setSelectedAppt(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md" onClick={e => e.stopPropagation()}>
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div><h3 className="font-bold text-brand-900 text-lg">{selectedAppt.client?.fullName ?? selectedAppt.guestName ?? 'לקוחה'}</h3><p className="text-muted text-sm">{selectedAppt.treatment?.name}</p></div>
              <button onClick={() => setSelectedAppt(null)} className="p-1 rounded-lg hover:bg-brand-50 text-muted transition"><X size={18} /></button>
            </div>
            <div className="space-y-2 text-sm mb-5">
              <div className="flex justify-between"><span className="text-muted">זמן</span><span className="font-medium">{formatTime(selectedAppt.startAt)} – {formatTime(selectedAppt.endAt)}</span></div>
              {selectedAppt.price && <div className="flex justify-between"><span className="text-muted">מחיר</span><span className="font-medium">{formatCurrency(selectedAppt.price)}</span></div>}
              <div className="flex justify-between"><span className="text-muted">סטטוס</span><span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', appointmentStatusColor(selectedAppt.status))}>{appointmentStatusLabel(selectedAppt.status)}</span></div>
            </div>
            {/* Future appointment warning */}
            {new Date(selectedAppt.startAt) > new Date() && selectedAppt.status === 'confirmed' && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-xs text-blue-700 mb-3">
                📅 תור עתידי — לא ניתן לסמן כהסתיים עד מועד התור
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {selectedAppt.status === 'pending' && <>
                <button onClick={() => updateStatus(selectedAppt, 'confirmed')} className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition"><Check size={14} /> אישור</button>
                <button onClick={() => updateStatus(selectedAppt, 'cancelled')} className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium px-4 py-2 rounded-xl transition"><X size={14} /> דחייה</button>
              </>}
              {selectedAppt.status === 'confirmed' && new Date(selectedAppt.startAt) <= new Date() && <>
                <button onClick={() => { setCompletingAppt(selectedAppt); setSelectedAppt(null) }} className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition"><Check size={14} /> סיום טיפול</button>
                <button onClick={() => updateStatus(selectedAppt, 'no_show')} className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium px-4 py-2 rounded-xl transition">לא הגיעה</button>
              </>}
              {(selectedAppt.status === 'confirmed' || selectedAppt.status === 'pending') && (
                <button onClick={() => updateStatus(selectedAppt, 'cancelled')} className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium px-4 py-2 rounded-xl transition"><X size={14} /> ביטול</button>
              )}
            </div>
            </div>
          </div>
        </div>
      )}

      {showNewModal && <AppointmentModal treatments={treatments} addons={addons} clients={clients} defaultTime={newApptTime} onClose={() => { setShowNewModal(false); setNewApptTime(null) }} onSaved={() => { setShowNewModal(false); setNewApptTime(null); fetchAppointments() }} />}

      {completingAppt && (() => {
        const apptAddons = (completingAppt.addonIds ?? [])
          .map((id: string) => addons.find(a => a.id === id))
          .filter(Boolean)
          .map((a: any) => ({ name: a.name as string, price: a.price as number }))
        const apptTreatment = treatments.find(t => t.id === completingAppt.treatmentId)
        const addonsTotal = apptAddons.reduce((s: number, a: { name: string; price: number }) => s + a.price, 0)
        const subtotal = (apptTreatment?.defaultPrice ?? 0) + addonsTotal
        const discountPercent = completingAppt.isStudentDiscount ? (apptTreatment?.studentDiscountPercent ?? 0) : 0
        const discountAmount = Math.round((subtotal * discountPercent / 100) * 100) / 100
        const discountLabel = discountPercent > 0 ? `הנחת חיילת/סטודנטית (${discountPercent}%)` : null
        return (
          <CompleteReceiptModal
            appointmentId={completingAppt.id}
            clientId={completingAppt.clientId}
            clientName={completingAppt.client?.fullName ?? completingAppt.guestName ?? 'לקוחה'}
            clientPhone={completingAppt.client?.phone ?? completingAppt.guestPhone}
            guestEmail={completingAppt.guestEmail}
            treatmentName={completingAppt.treatment?.name ?? 'טיפול'}
            price={completingAppt.price}
            addons={apptAddons}
            discountAmount={discountAmount}
            discountLabel={discountLabel}
            onComplete={() => { setCompletingAppt(null); fetchAppointments() }}
            onClose={() => setCompletingAppt(null)}
          />
        )
      })()}
    </div>
  )
}

function MonthView({ currentDate, appointments, onDayClick, onApptClick }: { currentDate: Date; appointments: any[]; onDayClick: (d: Date) => void; onApptClick: (a: any) => void }) {
  const start = startOfMonth(currentDate); const end = endOfMonth(currentDate)
  const firstDay = startOfWeek(start, { weekStartsOn: 0 }); const lastDay = endOfWeek(end, { weekStartsOn: 0 })
  const days: Date[] = []; let d = firstDay; while (d <= lastDay) { days.push(d); d = addDays(d, 1) }
  return (
    <div className="p-4">
      <div className="grid grid-cols-7 mb-2">{['א','ב','ג','ד','ה','ו','ש'].map(l => <div key={l} className="text-center text-xs text-muted font-medium py-1">{l}</div>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {days.map(day => {
          const dayAppts = appointments.filter((a: any) => isSameDay(new Date(a.startAt), day))
          const inMonth = day.getMonth() === currentDate.getMonth()
          return (
            <div key={day.toISOString()} onClick={() => onDayClick(day)} className={cn('min-h-[80px] rounded-xl p-2 cursor-pointer transition hover:bg-brand-50', !inMonth && 'opacity-30', isToday(day) && 'bg-brand-50 ring-2 ring-brand-300')}>
              <p className={cn('text-sm font-medium mb-1', isToday(day) ? 'text-brand-500' : 'text-brand-800')}>{format(day, 'd')}</p>
              {dayAppts.slice(0, 3).map((a: any) => (
                <div key={a.id} onClick={e => { e.stopPropagation(); onApptClick(a) }} className="text-xs rounded px-1 py-0.5 mb-0.5 truncate font-medium" style={{ backgroundColor: (a.treatment?.color ?? '#d4605c')+'33', color: a.treatment?.color ?? '#d4605c' }}>
                  {formatTime(a.startAt)} {a.client?.fullName ?? a.guestName}
                </div>
              ))}
              {dayAppts.length > 3 && <p className="text-xs text-muted">+{dayAppts.length - 3}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
