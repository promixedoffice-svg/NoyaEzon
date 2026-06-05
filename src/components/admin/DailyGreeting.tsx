'use client'

import { useState, useEffect } from 'react'

function getGreeting(h: number): { text: string; emoji: string } {
  if (h >= 5  && h < 12) return { text: 'בוקר טוב',      emoji: '☀️' }
  if (h >= 12 && h < 17) return { text: 'צהריים טובים',   emoji: '🌤️' }
  if (h >= 17 && h < 21) return { text: 'ערב טוב',        emoji: '🌆' }
  return                         { text: 'לילה טוב',       emoji: '🌙' }
}

export function DailyGreeting({ ownerName }: { ownerName: string }) {
  const [data, setData] = useState<{ text: string; emoji: string } | null>(null)

  useEffect(() => {
    const today = new Date().toDateString()
    if (localStorage.getItem('greeting_date') !== today) {
      localStorage.setItem('greeting_date', today)
      setData(getGreeting(new Date().getHours()))
    }
  }, [])

  if (!data) return null

  const firstName = ownerName.split(' ')[0] || ownerName

  return (
    <div className="bg-gradient-to-l from-brand-50 via-white to-brand-100 border border-brand-100 rounded-2xl px-5 py-4 shadow-sm">
      <p className="text-xl font-bold text-brand-900">{data.emoji} {data.text}, {firstName}!</p>
      <p className="text-sm text-muted mt-0.5">ברוכה הבאה לסטודיו שלך 💅</p>
    </div>
  )
}
