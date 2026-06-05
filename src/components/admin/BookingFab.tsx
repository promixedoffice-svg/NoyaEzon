'use client'

import { useState, useRef, useEffect } from 'react'
import { CalendarPlus, Loader2 } from 'lucide-react'
import { AppointmentModal } from './AppointmentModal'

const DEFAULT_POS = { right: 20, bottom: 88 }

export function BookingFab() {
  const [enabled, setEnabled] = useState(false)
  const [pos, setPos] = useState(DEFAULT_POS)
  const [showModal, setShowModal] = useState(false)
  const [treatments, setTreatments] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const isDragging = useRef(false)
  const dragStart = useRef({ cx: 0, cy: 0, right: DEFAULT_POS.right, bottom: DEFAULT_POS.bottom })
  const posRef = useRef(DEFAULT_POS)

  useEffect(() => {
    const v = localStorage.getItem('fab_booking')
    setEnabled(v !== 'false')

    try {
      const saved = localStorage.getItem('fab_booking_pos')
      if (saved) {
        const p = JSON.parse(saved)
        setPos(p)
        posRef.current = p
      }
    } catch {}

    function onSettingsChange(e: Event) {
      setEnabled((e as CustomEvent).detail.enabled)
    }
    window.addEventListener('fab_settings_changed', onSettingsChange)
    return () => window.removeEventListener('fab_settings_changed', onSettingsChange)
  }, [])

  async function openModal() {
    if (loading) return
    setLoading(true)
    try {
      const [tRes, cRes] = await Promise.all([
        fetch('/api/treatments'),
        fetch('/api/clients'),
      ])
      const t = await tRes.json()
      const c = await cRes.json()
      setTreatments(Array.isArray(t) ? t.filter((x: any) => x.isActive !== false) : [])
      setClients(Array.isArray(c) ? c.filter((x: any) => !x.deletedAt) : [])
    } catch {}
    setLoading(false)
    setShowModal(true)
  }

  function calcNewPos(startRight: number, startBottom: number, dx: number, dy: number) {
    return {
      right: Math.max(8, Math.min(window.innerWidth - 64, startRight - dx)),
      bottom: Math.max(80, Math.min(window.innerHeight - 80, startBottom - dy)),
    }
  }

  // ── Touch (mobile) ──────────────────────────
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    isDragging.current = false
    dragStart.current = { cx: t.clientX, cy: t.clientY, ...posRef.current }
  }

  function onTouchMove(e: React.TouchEvent) {
    const t = e.touches[0]
    const dx = t.clientX - dragStart.current.cx
    const dy = t.clientY - dragStart.current.cy
    if (!isDragging.current && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      isDragging.current = true
    }
    if (isDragging.current) {
      e.preventDefault()
      const newPos = calcNewPos(dragStart.current.right, dragStart.current.bottom, dx, dy)
      setPos(newPos)
      posRef.current = newPos
    }
  }

  function onTouchEnd() {
    if (isDragging.current) {
      localStorage.setItem('fab_booking_pos', JSON.stringify(posRef.current))
    } else {
      openModal()
    }
    isDragging.current = false
  }

  // ── Mouse (desktop) ─────────────────────────
  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    isDragging.current = false
    dragStart.current = { cx: e.clientX, cy: e.clientY, ...posRef.current }

    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - dragStart.current.cx
      const dy = ev.clientY - dragStart.current.cy
      if (!isDragging.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        isDragging.current = true
      }
      if (isDragging.current) {
        const newPos = calcNewPos(dragStart.current.right, dragStart.current.bottom, dx, dy)
        setPos(newPos)
        posRef.current = newPos
      }
    }

    function onUp() {
      if (isDragging.current) {
        localStorage.setItem('fab_booking_pos', JSON.stringify(posRef.current))
      } else {
        openModal()
      }
      isDragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  if (!enabled) return null

  return (
    <>
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        className="fixed select-none touch-none cursor-grab active:cursor-grabbing"
        style={{ right: `${pos.right}px`, bottom: `${pos.bottom}px`, zIndex: 35 }}
        title="תיאום טיפול חדש"
      >
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full bg-brand-400 opacity-20 animate-ping" />
        {/* Button */}
        <div className="relative w-14 h-14 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform">
          {loading
            ? <Loader2 size={22} className="text-white animate-spin" />
            : <CalendarPlus size={22} className="text-white" />
          }
        </div>
      </div>

      {showModal && (
        <AppointmentModal
          treatments={treatments}
          clients={clients}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); setTreatments([]); setClients([]) }}
        />
      )}
    </>
  )
}
