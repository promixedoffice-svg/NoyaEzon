'use client'

import { useState } from 'react'
import { Search, CheckSquare, Square, MessageCircle, Users, Send } from 'lucide-react'

interface Client {
  id: string
  fullName: string
  phone: string | null
  email: string | null
  status: string
}

const TEMPLATES = [
  { label: 'תזכורת תורים', text: 'שלום {שם}! 💅\nרק מזכירה לך שאפשר לקבוע תור אצלי.\nלהזמנת תור: {קישור}' },
  { label: 'מבצע מיוחד', text: 'שלום {שם}! 🌸\nיש לי בשורה מיוחדת — {הודעה}\nכמו תמיד, שמחה לשמוע ממך! 💕' },
  { label: 'הודעה כללית', text: 'שלום {שם}! 💅' },
]

export function BroadcastManager({ clients }: { clients: Client[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [step, setStep] = useState<'compose' | 'send'>('compose')

  const filtered = clients.filter(c => {
    const matchSearch = !search || c.fullName.includes(search) || c.phone?.includes(search)
    const matchStatus = !filterStatus || c.status === filterStatus
    const hasPhone = !!c.phone
    return matchSearch && matchStatus && hasPhone
  })

  const withPhone = clients.filter(c => c.phone)

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(c => c.id)))
    }
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectByStatus(status: string) {
    const ids = clients.filter(c => c.status === status && c.phone).map(c => c.id)
    setSelected(new Set(ids))
  }

  const selectedClients = clients.filter(c => selected.has(c.id) && c.phone)

  function getPersonalMessage(client: Client) {
    return message.replace('{שם}', client.fullName.split(' ')[0])
  }

  function getWhatsAppLink(client: Client) {
    if (!client.phone) return null
    const clean = client.phone.replace(/\D/g, '').replace(/^0/, '972')
    return `https://wa.me/${clean}?text=${encodeURIComponent(getPersonalMessage(client))}`
  }

  if (step === 'send') {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-brand-900">שליחה ל-{selectedClients.length} לקוחות</h2>
            <button onClick={() => setStep('compose')} className="text-sm text-muted hover:text-brand-600 transition">← חזרה</button>
          </div>

          {/* Message preview */}
          <div className="bg-brand-50 rounded-xl p-4 mb-4 text-sm text-brand-800 whitespace-pre-wrap border-r-4 border-brand-300">
            {message || 'הכניסי הודעה...'}
          </div>

          <p className="text-xs text-muted mb-3">לחצי על כל לקוחה לפתיחת WhatsApp עם ההודעה האישית:</p>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {selectedClients.map(client => (
              <a
                key={client.id}
                href={getWhatsAppLink(client)!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 rounded-xl transition border border-green-100 group"
              >
                <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-bold text-sm shrink-0">
                  {client.fullName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-brand-900 text-sm truncate">{client.fullName}</p>
                  <p className="text-xs text-muted">{client.phone}</p>
                </div>
                <MessageCircle size={18} className="text-green-600 shrink-0" />
              </a>
            ))}
          </div>

          <p className="text-xs text-center text-muted mt-4 bg-amber-50 rounded-xl p-2.5">
            💡 לחצי על כל שם בנפרד — כל לחיצה פותחת WhatsApp עם ההודעה המותאמת אישית
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Message composer */}
      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5">
        <h2 className="font-semibold text-brand-900 mb-3">✍️ כתיבת הודעה</h2>

        {/* Templates */}
        <div className="flex gap-2 flex-wrap mb-3">
          {TEMPLATES.map(t => (
            <button key={t.label} onClick={() => setMessage(t.text)}
              className="text-xs px-3 py-1.5 rounded-xl border border-brand-200 hover:border-brand-400 hover:bg-brand-50 text-brand-700 transition">
              {t.label}
            </button>
          ))}
        </div>

        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={5}
          placeholder="כתבי את ההודעה כאן...&#10;השתמשי ב-{שם} לשם הפרטי של הלקוחה"
          className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-brand-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition resize-none"
        />
        <p className="text-xs text-muted mt-1.5">💡 {'{שם}'} יוחלף בשם הפרטי של כל לקוחה</p>
      </div>

      {/* Client selector */}
      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-brand-900 flex items-center gap-2">
            <Users size={16} className="text-brand-400" />
            בחרי נמענים ({selected.size} נבחרו)
          </h2>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => selectByStatus('active')} className="text-xs px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition">פעילות</button>
            <button onClick={() => selectByStatus('new')} className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition">חדשות</button>
            <button onClick={() => setSelected(new Set())} className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition">נקה</button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש..."
            className="w-full pr-8 pl-4 py-2.5 rounded-xl border border-brand-200 bg-brand-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
          />
        </div>

        {/* Select all */}
        <button onClick={toggleAll} className="flex items-center gap-2 text-sm text-brand-700 hover:text-brand-900 transition mb-3 font-medium">
          {selected.size === filtered.length && filtered.length > 0
            ? <CheckSquare size={16} className="text-brand-500" />
            : <Square size={16} />
          }
          {selected.size === filtered.length && filtered.length > 0 ? 'בטלי בחירת הכל' : `בחרי הכל (${filtered.length})`}
        </button>

        {/* Client list */}
        <div className="space-y-1 max-h-[300px] overflow-y-auto">
          {filtered.map(client => (
            <button key={client.id} onClick={() => toggle(client.id)}
              className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition text-right ${selected.has(client.id) ? 'bg-brand-50 border border-brand-200' : 'hover:bg-gray-50'}`}
            >
              {selected.has(client.id)
                ? <CheckSquare size={16} className="text-brand-500 shrink-0" />
                : <Square size={16} className="text-gray-300 shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <p className="font-medium text-brand-900 text-sm truncate">{client.fullName}</p>
                <p className="text-xs text-muted">{client.phone}</p>
              </div>
            </button>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted text-sm py-4">אין לקוחות עם טלפון</p>}
        </div>
      </div>

      {/* Send button */}
      <button
        onClick={() => setStep('send')}
        disabled={selected.size === 0 || !message.trim()}
        className="w-full py-4 bg-green-500 hover:bg-green-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-2xl transition flex items-center justify-center gap-2 text-base shadow-sm"
      >
        <Send size={20} />
        שלחי ל-{selected.size} לקוחות ב-WhatsApp
      </button>
      {selected.size === 0 && <p className="text-center text-xs text-muted">יש לבחור לקוחות ולכתוב הודעה</p>}
    </div>
  )
}
