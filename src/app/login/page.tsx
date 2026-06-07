'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'שגיאה בכניסה')
      return
    }

    router.push('/admin')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-brand-100 mb-4 shadow-sm">
            <span className="text-3xl">💅</span>
          </div>
          <h1 className="text-3xl font-bold text-brand-900 tracking-tight">Calitor</h1>
          <p className="text-muted mt-1 text-sm">מערכת ניהול עסק ותורים</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-brand-100 p-8">
          <h2 className="text-xl font-semibold text-brand-900 mb-6 text-center">כניסה למערכת</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-800 mb-1.5">אימייל</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                dir="ltr"
                className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-brand-50 text-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-800 mb-1.5">סיסמה</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                dir="ltr"
                className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-brand-50 text-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-semibold rounded-xl transition shadow-sm"
            >
              {loading ? 'נכנסת...' : 'כניסה'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted mt-6">גרסה 1.0 · Calitor Business Management</p>
      </div>
    </div>
  )
}
