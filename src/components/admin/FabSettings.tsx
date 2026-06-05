'use client'

import { useState, useEffect } from 'react'
import { CalendarPlus, RotateCcw } from 'lucide-react'

export function FabSettings() {
  const [enabled, setEnabled] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const v = localStorage.getItem('fab_booking')
    setEnabled(v !== 'false')
    setMounted(true)
  }, [])

  function toggle() {
    const next = !enabled
    setEnabled(next)
    localStorage.setItem('fab_booking', next ? 'true' : 'false')
    window.dispatchEvent(new CustomEvent('fab_settings_changed', { detail: { enabled: next } }))
  }

  function resetPosition() {
    localStorage.removeItem('fab_booking_pos')
    window.location.reload()
  }

  if (!mounted) return null

  return (
    <div className="space-y-3">
      {/* Toggle row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
            <CalendarPlus size={18} className="text-brand-600" />
          </div>
          <div>
            <p className="font-medium text-brand-900 text-sm">כפתור תיאום טיפול</p>
            <p className="text-xs text-muted">כפתור צף ניתן לגרירה בכל עמוד</p>
          </div>
        </div>
        {/* iOS-style toggle */}
        <button
          onClick={toggle}
          dir="ltr"
          className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${enabled ? 'bg-brand-500' : 'bg-gray-200'}`}
          aria-label={enabled ? 'בטלי כפתור' : 'הפעילי כפתור'}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0'}`}
          />
        </button>
      </div>

      {/* Reset position */}
      {enabled && (
        <button
          onClick={resetPosition}
          className="flex items-center gap-2 text-xs text-muted hover:text-brand-600 transition mr-12"
        >
          <RotateCcw size={12} /> איפוס מיקום הכפתור
        </button>
      )}
    </div>
  )
}
