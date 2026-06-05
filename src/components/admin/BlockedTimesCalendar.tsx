'use client'

import { useState, useEffect, useRef } from 'react'
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay, getDay, parseISO } from 'date-fns'
import { he } from 'date-fns/locale'
import { ChevronRight, ChevronLeft, X, Lock, Trash2, Pencil } from 'lucide-react'

// Grid range: 08:00 – 21:00 in 30-min slots
const H_START = 8
const H_END = 21
const SLOTS = Array.from({ length: (H_END - H_START) * 2 }, (_, i) => i) // 0..25
const DAY_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

function slotToTime(slot: number) {
  const m = H_START * 60 + slot * 30
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

interface BlockedTime { id: string; startAt: string; endAt: string; reason: string | null; isVacation: boolean }
interface Pending { day: Date; startSlot: number; endSlot: number; fullDay: boolean }

export function BlockedTimesCalendar() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }))
  const [blocked, setBlocked] = useState<BlockedTime[]>([])
  const [pending, setPending] = useState<Pending | null>(null)
  const [reason, setReason] = useState('')
  const [isVacation, setIsVacation] = useState(false)
  const [saving, setSaving] = useState(false)
  const [clickedBlock, setClickedBlock] = useState<BlockedTime | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingBlock, setEditingBlock] = useState<BlockedTime | null>(null)
  const [editForm, setEditForm] = useState({ date: '', startTime: '', endTime: '', reason: '', isVacation: false })

  // Drag state via refs (avoids stale closures in global listeners)
  const [selection, setSelection] = useState<{ dayIdx: number; lo: number; hi: number } | null>(null)
  const isDraggingRef = useRef(false)
  const dragDayRef = useRef<number | null>(null)
  const dragStartRef = useRef<number | null>(null)
  const dragEndRef = useRef<number | null>(null)
  const weekStartRef = useRef(weekStart)
  useEffect(() => { weekStartRef.current = weekStart }, [weekStart])

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  useEffect(() => {
    fetch('/api/blocked-times').then(r => r.json()).then(setBlocked)
  }, [])

  // ── Helpers ──────────────────────────────────────────
  function getBlockedAt(day: Date, slot: number): BlockedTime | null {
    const totalMin = H_START * 60 + slot * 30
    const slotStart = new Date(day)
    slotStart.setHours(Math.floor(totalMin / 60), totalMin % 60, 0, 0)
    const slotEnd = new Date(slotStart.getTime() + 30 * 60000)
    return blocked.find(b => new Date(b.startAt) < slotEnd && new Date(b.endAt) > slotStart) ?? null
  }

  function isFirstSlot(day: Date, slot: number, bt: BlockedTime) {
    if (slot === 0) return true
    const prev = getBlockedAt(day, slot - 1)
    return !prev || prev.id !== bt.id
  }

  function getFullDayBlock(day: Date): BlockedTime | null {
    const d0 = new Date(day); d0.setHours(0, 0, 0, 0)
    const d1 = new Date(day); d1.setHours(23, 59, 0, 0)
    return blocked.find(b => new Date(b.startAt) <= d0 && new Date(b.endAt) >= d1) ?? null
  }

  // ── Drag ─────────────────────────────────────────────
  function startDrag(dayIdx: number, slot: number) {
    isDraggingRef.current = true
    dragDayRef.current = dayIdx
    dragStartRef.current = slot
    dragEndRef.current = slot
    setSelection({ dayIdx, lo: slot, hi: slot })
  }

  function moveDrag(dayIdx: number, slot: number) {
    if (!isDraggingRef.current || dayIdx !== dragDayRef.current) return
    dragEndRef.current = slot
    const lo = Math.min(dragStartRef.current!, slot)
    const hi = Math.max(dragStartRef.current!, slot)
    setSelection({ dayIdx, lo, hi })
  }

  function endDrag() {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    const dayIdx = dragDayRef.current!
    const lo = Math.min(dragStartRef.current!, dragEndRef.current!)
    const hi = Math.max(dragStartRef.current!, dragEndRef.current!)
    setSelection(null)
    const day = addDays(weekStartRef.current, dayIdx)
    setPending({ day, startSlot: lo, endSlot: hi, fullDay: false })
    setReason(''); setIsVacation(false)
  }

  // ── Global listeners ──────────────────────────────────
  useEffect(() => {
    function onMouseUp() { endDrag() }

    function onTouchMove(e: TouchEvent) {
      if (!isDraggingRef.current) return
      e.preventDefault()
      const t = e.touches[0]
      const el = document.elementFromPoint(t.clientX, t.clientY)
      const cell = el?.closest('[data-day][data-slot]')
      if (!cell) return
      const di = Number(cell.getAttribute('data-day'))
      const si = Number(cell.getAttribute('data-slot'))
      if (!isNaN(di) && !isNaN(si)) moveDrag(di, si)
    }

    function onTouchEnd() { endDrag() }

    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, []) // uses refs only

  // ── Save / Delete ─────────────────────────────────────
  async function handleSave() {
    if (!pending) return
    setSaving(true)
    let startAt: Date, endAt: Date
    if (pending.fullDay) {
      startAt = new Date(pending.day); startAt.setHours(0, 0, 0, 0)
      endAt = new Date(pending.day); endAt.setHours(23, 59, 0, 0)
    } else {
      const sm = H_START * 60 + pending.startSlot * 30
      const em = H_START * 60 + (pending.endSlot + 1) * 30
      startAt = new Date(pending.day); startAt.setHours(Math.floor(sm / 60), sm % 60, 0, 0)
      endAt = new Date(pending.day); endAt.setHours(Math.floor(em / 60), em % 60, 0, 0)
    }
    const res = await fetch('/api/blocked-times', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startAt: startAt.toISOString(), endAt: endAt.toISOString(), reason: reason || null, isVacation }),
    })
    const data = await res.json()
    setBlocked(prev => [...prev, data].sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt)))
    setSaving(false)
    setPending(null)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await fetch(`/api/blocked-times/${id}`, { method: 'DELETE' })
    setBlocked(prev => prev.filter(b => b.id !== id))
    setDeletingId(null)
    setClickedBlock(null)
  }

  function openEdit(bt: BlockedTime) {
    const start = parseISO(bt.startAt)
    const end = parseISO(bt.endAt)
    setEditForm({
      date: format(start, 'yyyy-MM-dd'),
      startTime: format(start, 'HH:mm'),
      endTime: format(end, 'HH:mm'),
      reason: bt.reason ?? '',
      isVacation: bt.isVacation,
    })
    setEditingBlock(bt)
    setClickedBlock(null)
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editingBlock) return
    setSaving(true)
    // Delete old, create new
    await fetch(`/api/blocked-times/${editingBlock.id}`, { method: 'DELETE' })
    const startAt = new Date(`${editForm.date}T${editForm.startTime}:00`)
    const endAt = new Date(`${editForm.date}T${editForm.endTime}:00`)
    const res = await fetch('/api/blocked-times', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startAt: startAt.toISOString(), endAt: endAt.toISOString(), reason: editForm.reason || null, isVacation: editForm.isVacation }),
    })
    const data = await res.json()
    setBlocked(prev => [...prev.filter(b => b.id !== editingBlock.id), data].sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt)))
    setSaving(false)
    setEditingBlock(null)
  }

  const inputClass = "w-full px-3 py-2.5 rounded-xl border border-brand-200 bg-brand-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
  const labelClass = "block text-xs font-medium text-brand-700 mb-1"

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-semibold text-brand-900 flex items-center gap-2 text-sm">
          <Lock size={15} /> חסימת זמנים
        </h3>
        <div className="flex items-center gap-1">
          <button onClick={() => setWeekStart(w => subWeeks(w, 1))}
            className="p-1.5 rounded-xl hover:bg-brand-100 text-brand-700 transition">
            <ChevronRight size={16} />
          </button>
          <span className="text-xs font-medium text-brand-800 min-w-[120px] text-center">
            {format(weekStart, 'd MMM', { locale: he })} – {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: he })}
          </span>
          <button onClick={() => setWeekStart(w => addWeeks(w, 1))}
            className="p-1.5 rounded-xl hover:bg-brand-100 text-brand-700 transition">
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))}
            className="text-xs px-2 py-1 rounded-xl border border-brand-200 text-brand-700 hover:bg-brand-50 transition mr-1"
          >
            היום
          </button>
        </div>
      </div>

      <p className="text-xs text-muted">גרור שעות ביום לחסימה · לחץ על כותרת יום לחסימת יום שלם · לחץ על חסימה קיימת למחיקה</p>

      {/* Grid */}
      <div className="overflow-x-auto rounded-xl border border-brand-100 bg-white">
        <div className="min-w-[400px]" style={{ userSelect: 'none' }}>

          {/* Day headers */}
          <div className="grid border-b border-brand-100 bg-brand-50" style={{ gridTemplateColumns: '36px repeat(7, 1fr)' }}>
            <div />
            {days.map((day, di) => {
              const fullBlock = getFullDayBlock(day)
              const isToday = isSameDay(day, new Date())
              return (
                <button
                  key={di}
                  onClick={() => {
                    if (fullBlock) {
                      handleDelete(fullBlock.id)
                    } else {
                      setPending({ day, startSlot: 0, endSlot: SLOTS.length - 1, fullDay: true })
                      setReason(''); setIsVacation(false)
                    }
                  }}
                  className={`py-1.5 text-center border-r border-brand-100 last:border-r-0 transition
                    ${fullBlock ? 'bg-red-100 hover:bg-red-200' : isToday ? 'hover:bg-brand-100' : 'hover:bg-brand-50'}
                    ${isToday && !fullBlock ? 'text-brand-500' : fullBlock ? 'text-red-700' : 'text-brand-800'}
                  `}
                  title={fullBlock ? `${fullBlock.reason ?? (fullBlock.isVacation ? 'חופשה' : 'חסום')} — לחץ למחיקה` : 'לחץ לחסימת יום שלם'}
                >
                  <div className="text-[10px] font-bold">{DAY_SHORT[getDay(day)]}</div>
                  <div className={`text-[10px] ${fullBlock ? 'text-red-500' : 'text-muted'}`}>{format(day, 'd/M')}</div>
                  {fullBlock && (
                    <div className="text-[8px] text-red-600 truncate px-0.5 leading-tight">
                      {fullBlock.isVacation ? '🏖️' : '🔒'} {fullBlock.reason ?? 'חסום'}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Slots */}
          <div>
            {SLOTS.map(slot => (
              <div key={slot} className="grid" style={{ gridTemplateColumns: '36px repeat(7, 1fr)' }}>
                {/* Time label */}
                <div className="flex items-start justify-end pr-1.5 pt-0.5 border-r border-brand-50">
                  {slot % 2 === 0 && (
                    <span className="text-[9px] text-muted leading-none">{slotToTime(slot)}</span>
                  )}
                </div>

                {/* Cells */}
                {days.map((day, di) => {
                  const bt = getBlockedAt(day, slot)
                  const isFirst = bt ? isFirstSlot(day, slot, bt) : false
                  const inSel = selection?.dayIdx === di && slot >= selection.lo && slot <= selection.hi
                  const isHour = slot % 2 === 0

                  return (
                    <div
                      key={di}
                      data-day={di}
                      data-slot={slot}
                      onMouseDown={() => { if (!bt) startDrag(di, slot) }}
                      onMouseEnter={() => moveDrag(di, slot)}
                      onClick={() => { if (bt) setClickedBlock(bt) }}
                      className={[
                        'relative border-r border-brand-50 last:border-r-0',
                        isHour ? 'border-t border-brand-100' : 'border-t border-brand-50/50',
                        'h-[22px]',
                        bt
                          ? bt.isVacation
                            ? 'bg-orange-100 cursor-pointer'
                            : 'bg-red-100 cursor-pointer'
                          : inSel
                            ? 'bg-brand-200 cursor-ns-resize'
                            : 'hover:bg-brand-50 cursor-ns-resize',
                      ].join(' ')}
                    >
                      {bt && isFirst && (
                        <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-0.5 px-0.5 pointer-events-none overflow-hidden">
                          <span className="text-[8px] font-medium text-red-700 truncate leading-tight">
                            {bt.isVacation ? '🏖️' : '🔒'} {bt.reason}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Clicked block popup */}
      {clickedBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setClickedBlock(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-brand-900 text-sm">
                  {clickedBlock.isVacation ? '🏖️ חופשה' : '🔒 חסום'}
                </p>
                {clickedBlock.reason && <p className="text-sm text-muted mt-0.5">{clickedBlock.reason}</p>}
                <p className="text-xs text-muted mt-1">
                  {format(new Date(clickedBlock.startAt), 'EEEE d MMMM, HH:mm', { locale: he })}
                  {' – '}
                  {format(new Date(clickedBlock.endAt), 'HH:mm')}
                </p>
              </div>
              <button onClick={() => setClickedBlock(null)} className="p-1 rounded-lg hover:bg-brand-50 text-muted shrink-0"><X size={16} /></button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => openEdit(clickedBlock)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-brand-50 hover:bg-brand-100 text-brand-700 font-medium rounded-xl transition text-sm"
              >
                <Pencil size={13} /> עריכה
              </button>
              <button
                onClick={() => handleDelete(clickedBlock.id)}
                disabled={deletingId === clickedBlock.id}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 disabled:opacity-50 font-medium rounded-xl transition text-sm"
              >
                <Trash2 size={13} /> {deletingId === clickedBlock.id ? 'מוחק...' : 'מחיקה'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingBlock && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40" onClick={() => setEditingBlock(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="sm:hidden flex justify-center -mt-2 mb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-brand-900">עריכת חסימה</h3>
              <button onClick={() => setEditingBlock(null)} className="p-1 rounded-lg hover:bg-brand-50 text-muted"><X size={16} /></button>
            </div>
            <form onSubmit={handleEditSave} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-brand-700 mb-1">תאריך</label>
                <input type="date" required value={editForm.date} onChange={e => setEditForm(p => ({ ...p, date: e.target.value }))} className={inputClass} dir="ltr" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-brand-700 mb-1">משעה</label>
                  <input type="time" required value={editForm.startTime} onChange={e => setEditForm(p => ({ ...p, startTime: e.target.value }))} className={inputClass} dir="ltr" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-brand-700 mb-1">עד שעה</label>
                  <input type="time" required value={editForm.endTime} onChange={e => setEditForm(p => ({ ...p, endTime: e.target.value }))} className={inputClass} dir="ltr" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-700 mb-1">סיבה (אופציונלי)</label>
                <input value={editForm.reason} onChange={e => setEditForm(p => ({ ...p, reason: e.target.value }))} className={inputClass} placeholder="חופשה, הכשרה..." />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editForm.isVacation} onChange={e => setEditForm(p => ({ ...p, isVacation: e.target.checked }))} className="w-4 h-4 rounded accent-brand-500" />
                <span className="text-sm text-brand-800">חופשה / יום חופש</span>
              </label>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-medium rounded-xl transition text-sm">
                  {saving ? 'שומרת...' : 'שמרי שינויים'}
                </button>
                <button type="button" onClick={() => setEditingBlock(null)}
                  className="px-4 py-2.5 border border-brand-200 text-brand-700 hover:bg-brand-50 rounded-xl transition text-sm">
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reason modal after drag / full-day */}
      {pending && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40" onClick={() => setPending(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="sm:hidden flex justify-center -mt-2 mb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div>
              <h3 className="font-bold text-brand-900">
                {pending.fullDay ? 'חסימת יום שלם' : 'חסימת שעות'}
              </h3>
              <p className="text-sm text-muted mt-0.5">
                {format(pending.day, 'EEEE, d MMMM', { locale: he })}
                {!pending.fullDay && (
                  <span className="mr-1 font-medium text-brand-700">
                    {slotToTime(pending.startSlot)} – {slotToTime(pending.endSlot + 1)}
                  </span>
                )}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-brand-700 mb-1">סיבה (אופציונלי)</label>
              <input
                autoFocus
                value={reason}
                onChange={e => setReason(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                className={inputClass}
                placeholder="חופשה, הכשרה, אירוע..."
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isVacation} onChange={e => setIsVacation(e.target.checked)} className="w-4 h-4 rounded accent-brand-500" />
              <span className="text-sm text-brand-800">חופשה / יום חופש</span>
            </label>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-medium rounded-xl transition text-sm"
              >
                {saving ? 'שומרת...' : 'שמרי חסימה'}
              </button>
              <button
                onClick={() => setPending(null)}
                className="px-4 py-2.5 border border-brand-200 text-brand-700 hover:bg-brand-50 rounded-xl transition text-sm"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming blocks list */}
      {blocked.filter(b => new Date(b.endAt) > new Date()).length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted font-medium">חסימות קרובות</p>
          {blocked
            .filter(b => new Date(b.endAt) > new Date())
            .map(b => (
              <div key={b.id} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${b.isVacation ? 'bg-orange-50 border border-orange-100' : 'bg-red-50 border border-red-100'}`}>
                <span className={`font-medium flex-1 truncate ${b.isVacation ? 'text-orange-700' : 'text-red-700'}`}>
                  {b.isVacation ? '🏖️' : '🔒'} {b.reason ?? (b.isVacation ? 'חופשה' : 'חסום')}
                  <span className="text-muted font-normal mr-1">
                    · {format(new Date(b.startAt), 'd/M HH:mm')} – {format(new Date(b.endAt), 'HH:mm')}
                  </span>
                </span>
                <button
                  onClick={() => handleDelete(b.id)}
                  disabled={deletingId === b.id}
                  className="p-1 rounded-lg hover:bg-white/60 text-muted hover:text-red-500 transition disabled:opacity-50"
                >
                  <X size={12} />
                </button>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}
