'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Cake, X } from 'lucide-react'

interface BirthdayClient {
  id: string
  fullName: string
}

export function BirthdayAlert({ clients }: { clients: BirthdayClient[] }) {
  const [dismissed, setDismissed] = useState<string[]>([])

  const visible = clients.filter(c => !dismissed.includes(c.id))
  if (visible.length === 0) return null

  return (
    <div className="bg-pink-50 border-2 border-pink-200 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 bg-pink-100/50">
        <Cake size={18} className="text-pink-500 shrink-0" />
        <p className="font-semibold text-pink-800 text-sm">
          {visible.length === 1 ? 'יש לך מזל טוב להגיד היום! 🎉' : `${visible.length} ימי הולדת היום! 🎉`}
        </p>
      </div>
      <div className="divide-y divide-pink-100">
        {visible.map(client => (
          <div key={client.id} className="flex items-center gap-3 px-5 py-3.5 bg-white/60">
            <div className="flex-1 min-w-0">
              <Link href={`/admin/clients/${client.id}`} className="font-medium text-brand-900 text-sm truncate hover:text-brand-600 transition">
                {client.fullName}
              </Link>
              <p className="text-xs text-muted">חוגגת יום הולדת היום 🎂</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={() => setDismissed(prev => [...prev, client.id])} className="text-muted hover:text-brand-600 transition">
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
