'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function NotificationBell() {
  const [count, setCount] = useState(0)
  const [pulse, setPulse] = useState(false)
  const prevCount = useRef(0)
  const router = useRouter()

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch('/api/notifications/count')
        const data = await res.json()
        const newCount = data.count ?? 0

        // New notification arrived
        if (newCount > prevCount.current) {
          setPulse(true)
          setTimeout(() => setPulse(false), 2000)

          // Browser notification
          if (
            typeof window !== 'undefined' &&
            'Notification' in window &&
            Notification.permission === 'granted' &&
            localStorage.getItem('notifications_paused') !== '1'
          ) {
            new Notification('💅 Calitor', {
              body: `${newCount} בקשת תור ממתינה לאישור`,
              icon: '/favicon.ico',
            })
          }
        }

        prevCount.current = newCount
        setCount(newCount)
      } catch {}
    }

    fetchCount()
    const interval = setInterval(fetchCount, 30000) // Poll every 30s
    return () => clearInterval(interval)
  }, [])

  if (count === 0) return null

  return (
    <button
      onClick={() => router.push('/admin')}
      className={`relative p-2 rounded-xl hover:bg-brand-50 transition ${pulse ? 'animate-bounce' : ''}`}
      title={`${count} תורים ממתינים`}
    >
      <Bell size={20} className="text-amber-500" />
      <span className="absolute -top-0.5 -left-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
        {count > 9 ? '9+' : count}
      </span>
    </button>
  )
}
