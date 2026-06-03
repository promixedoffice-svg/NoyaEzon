'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Check } from 'lucide-react'

export function NotificationSettings() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setSupported(true)
      setPermission(Notification.permission)
    }
  }, [])

  async function requestPermission() {
    if (!supported) return
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted') {
      new Notification('💅 NoyaGayaEzon', { body: 'התראות הופעלו בהצלחה!' })
    }
  }

  if (!supported) {
    return (
      <p className="text-sm text-muted">הדפדפן שלך אינו תומך בהתראות</p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-brand-900 text-sm">התראות דפדפן</p>
          <p className="text-xs text-muted mt-0.5">קבלי התראה כשלקוחה קובעת תור</p>
        </div>
        {permission === 'granted' ? (
          <div className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
            <Check size={16} />
            מופעל
          </div>
        ) : permission === 'denied' ? (
          <div className="flex items-center gap-1.5 text-red-500 text-sm">
            <BellOff size={16} />
            חסום בדפדפן
          </div>
        ) : (
          <button
            onClick={requestPermission}
            className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition"
          >
            <Bell size={15} />
            הפעלה
          </button>
        )}
      </div>

      {permission === 'denied' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
          כדי לאפשר התראות: לחצי על 🔒 בשורת הכתובת של הדפדפן → הרשאות אתר → התראות → אפשרי
        </div>
      )}

      {permission === 'granted' && (
        <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-xs text-green-800">
          ✓ תקבלי התראה בכל פעם שלקוחה קובעת תור, כל עוד הדפדפן פתוח
        </div>
      )}
    </div>
  )
}
