'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Check } from 'lucide-react'

const PAUSED_KEY = 'notifications_paused'

export function NotificationSettings() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [supported, setSupported] = useState(false)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setSupported(true)
      setPermission(Notification.permission)
      setPaused(localStorage.getItem(PAUSED_KEY) === '1')
    }
  }, [])

  async function requestPermission() {
    if (!supported) return
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted') {
      new Notification('💅 Calitor', { body: 'התראות הופעלו בהצלחה!' })
    }
  }

  function togglePause() {
    const next = !paused
    setPaused(next)
    if (next) localStorage.setItem(PAUSED_KEY, '1')
    else localStorage.removeItem(PAUSED_KEY)
  }

  if (!supported) {
    return <p className="text-sm text-muted">הדפדפן שלך אינו תומך בהתראות</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-brand-900 text-sm">התראות דפדפן</p>
          <p className="text-xs text-muted mt-0.5">
            {permission === 'granted' && !paused
              ? 'פעילות — תורים חדשים ומשימות'
              : permission === 'granted' && paused
              ? 'מושהות כרגע'
              : 'קבלי התראה על תורים ומשימות'}
          </p>
        </div>

        {permission === 'granted' ? (
          <button
            onClick={togglePause}
            className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-xl border transition touch-manipulation ${
              paused
                ? 'bg-brand-500 text-white border-brand-500 hover:bg-brand-600 active:bg-brand-700'
                : 'border-brand-200 text-brand-700 hover:bg-brand-50 active:bg-brand-100'
            }`}
          >
            {paused ? <Bell size={14} /> : <BellOff size={14} />}
            {paused ? 'הפעל' : 'כבה'}
          </button>
        ) : permission === 'denied' ? (
          <div className="flex items-center gap-1.5 text-red-500 text-sm shrink-0">
            <BellOff size={16} />
            חסום
          </div>
        ) : (
          <button
            onClick={requestPermission}
            className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition touch-manipulation"
          >
            <Bell size={15} />
            הפעלה
          </button>
        )}
      </div>

      {permission === 'denied' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
          כדי לאפשר: לחצי על 🔒 בשורת הכתובת ← הרשאות אתר ← התראות ← אפשרי
        </div>
      )}

      {permission === 'granted' && !paused && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl p-3 text-xs text-green-800">
          <Check size={13} className="shrink-0" />
          <span>התראות פעילות כל עוד הדפדפן פתוח</span>
        </div>
      )}

      {permission === 'granted' && paused && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-600">
          ⏸ התראות מושהות — לחצי "הפעל" כדי לחדש
        </div>
      )}
    </div>
  )
}
