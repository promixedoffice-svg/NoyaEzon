'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { useBusinessSettings, buildWhatsAppMessage, getFirstName } from '@/lib/useBusinessSettings'
import { X, Search, UserPlus, Check, MessageCircle, Mail } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Treatment { id: string; name: string; defaultPrice: number; durationMinutes: number; bufferMinutes: number; color: string; studentDiscountEnabled?: boolean; studentDiscountPercent?: number }
interface Addon { id: string; name: string; price: number }
interface Client { id: string; fullName: string; phone: string | null }

interface Props {
  treatments: Treatment[]
  addons?: Addon[]
  clients: Client[]
  defaultTime?: Date | null
  slotIntervalMinutes?: number
  onClose: () => void
  onSaved: () => void
}

type ClientMode = 'existing' | 'new'

export function AppointmentModal({ treatments, addons = [], clients, defaultTime, slotIntervalMinutes = 15, onClose, onSaved }: Props) {
  const { businessName, ownerName } = useBusinessSettings()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState<{ id: string; clientName: string; clientPhone: string | null; clientEmail: string; startAt: string; treatmentName: string } | null>(null)
  const [clientMode, setClientMode] = useState<ClientMode>('existing')
  const [clientSearch, setClientSearch] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [newClient, setNewClient] = useState({ fullName: '', phone: '', email: '' })

  const defaultDate = defaultTime ? format(defaultTime, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  const defaultHour = defaultTime ? format(defaultTime, 'HH:mm') : '10:00'

  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([])
  const [isStudentDiscount, setIsStudentDiscount] = useState(false)

  const [form, setForm] = useState({
    treatmentId: treatments[0]?.id ?? '',
    date: defaultDate,
    startTime: defaultHour,
    notes: '',
    price: String(treatments[0]?.defaultPrice ?? 0),
  })

  function computePrice(treatment: Treatment | undefined, addonIds: string[], studentDiscount: boolean) {
    const addonsTotal = addons.filter(a => addonIds.includes(a.id)).reduce((sum, a) => sum + a.price, 0)
    const subtotal = (treatment?.defaultPrice ?? 0) + addonsTotal
    const discountPercent = treatment?.studentDiscountEnabled && studentDiscount ? (treatment.studentDiscountPercent ?? 0) : 0
    return subtotal - subtotal * (discountPercent / 100)
  }

  function setF(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (field === 'treatmentId') {
      const t = treatments.find(t => t.id === value)
      setSelectedAddonIds([])
      setIsStudentDiscount(false)
      if (t) setForm(prev => ({ ...prev, treatmentId: value, price: String(computePrice(t, [], false)) }))
    }
  }

  function toggleAddon(id: string) {
    const next = selectedAddonIds.includes(id) ? selectedAddonIds.filter(i => i !== id) : [...selectedAddonIds, id]
    setSelectedAddonIds(next)
    setForm(prev => ({ ...prev, price: String(computePrice(selectedTreatment, next, isStudentDiscount)) }))
  }

  function toggleStudentDiscount(checked: boolean) {
    setIsStudentDiscount(checked)
    setForm(prev => ({ ...prev, price: String(computePrice(selectedTreatment, selectedAddonIds, checked)) }))
  }

  const selectedTreatment = treatments.find(t => t.id === form.treatmentId)
  const addonsTotal = addons.filter(a => selectedAddonIds.includes(a.id)).reduce((sum, a) => sum + a.price, 0)
  const discountPercent = selectedTreatment?.studentDiscountEnabled && isStudentDiscount ? (selectedTreatment.studentDiscountPercent ?? 0) : 0
  const discountAmount = (((selectedTreatment?.defaultPrice ?? 0) + addonsTotal) * discountPercent) / 100
  const filteredClients = clients.filter(c =>
    !clientSearch || c.fullName.includes(clientSearch) || c.phone?.includes(clientSearch)
  ).slice(0, 8)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')

    const startAt = new Date(`${form.date}T${form.startTime}:00`)
    const endAt = new Date(startAt.getTime() + (selectedTreatment?.durationMinutes ?? 60) * 60000)

    let clientId: string | null = null
    let clientName = ''
    let clientPhone: string | null = null
    let clientEmail = ''

    if (clientMode === 'new' && newClient.fullName) {
      // Create new client
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: newClient.fullName, phone: newClient.phone || null, email: newClient.email || null }),
      })
      if (!res.ok) { setError('שגיאה ביצירת לקוחה'); setLoading(false); return }
      const c = await res.json()
      clientId = c.id
      clientName = newClient.fullName
      clientPhone = newClient.phone || null
      clientEmail = newClient.email
    } else if (clientMode === 'existing' && selectedClientId) {
      const c = clients.find(c => c.id === selectedClientId)
      clientId = selectedClientId
      clientName = c?.fullName ?? ''
      clientPhone = c?.phone ?? null
    }

    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId,
        treatmentId: form.treatmentId || null,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        price: parseFloat(form.price) || null,
        notes: form.notes || null,
        addonIds: selectedAddonIds,
        isStudentDiscount: discountPercent > 0,
        status: 'confirmed',
      }),
    })

    setLoading(false)
    if (res.status === 409) { setError('יש תור קיים בשעה זו — בחרי שעה אחרת'); return }
    if (!res.ok) { setError('שגיאה ביצירת תור'); return }

    setSaved({
      id: (await res.json()).id,
      clientName,
      clientPhone,
      clientEmail,
      startAt: startAt.toISOString(),
      treatmentName: selectedTreatment?.name ?? '',
    })
  }

  function getWhatsAppLink(phone: string) {
    const clean = phone.replace(/\D/g, '').replace(/^0/, '972')
    const date = saved ? format(new Date(saved.startAt), 'EEEE, d MMMM', { locale: he }) : ''
    const time = saved ? format(new Date(saved.startAt), 'HH:mm') : ''
    const msg = encodeURIComponent(buildWhatsAppMessage({
      clientFirstName: getFirstName(saved?.clientName ?? ''),
      type: 'appointment',
      treatmentName: saved?.treatmentName,
      date,
      time,
      businessName,
      ownerName,
    }))
    return `https://wa.me/${clean}?text=${msg}`
  }

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-brand-200 bg-brand-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
  const labelClass = "block text-sm font-medium text-brand-800 mb-1.5"

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-50 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-brand-900 text-lg">תור חדש</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-brand-50 text-muted transition"><X size={18} /></button>
        </div>

        {saved ? (
          /* Success state — send options */
          <div className="p-6 space-y-5">
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check size={28} className="text-green-500" />
              </div>
              <h3 className="font-bold text-brand-900 text-lg">התור נוצר!</h3>
            </div>

            <div className="bg-brand-50 rounded-xl p-4 text-sm space-y-1.5">
              <div className="flex justify-between"><span className="text-muted">לקוחה</span><span className="font-medium">{saved.clientName}</span></div>
              <div className="flex justify-between"><span className="text-muted">טיפול</span><span className="font-medium">{saved.treatmentName}</span></div>
              <div className="flex justify-between"><span className="text-muted">מועד</span><span className="font-medium">{format(new Date(saved.startAt), 'EEEE d MMMM, HH:mm', { locale: he })}</span></div>
            </div>

            <div>
              <p className="text-sm font-medium text-brand-800 mb-3">שלחי אישור ללקוחה:</p>
              <div className="grid grid-cols-1 gap-2">
                {saved.clientPhone && (
                  <a
                    href={getWhatsAppLink(saved.clientPhone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-medium py-3 rounded-xl transition"
                  >
                    <MessageCircle size={18} />
                    WhatsApp ל-{saved.clientPhone}
                  </a>
                )}
                {saved.clientEmail && (
                  <button
                    onClick={async () => {
                      await fetch('/api/appointments/confirm', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ appointmentId: saved.id, action: 'confirm' }),
                      })
                      alert('מייל אישור נשלח!')
                    }}
                    className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded-xl transition"
                  >
                    <Mail size={18} />
                    שלחי מייל ל-{saved.clientEmail}
                  </button>
                )}
              </div>
            </div>

            <button onClick={() => { onSaved() }} className="w-full py-3 border border-brand-200 text-brand-700 hover:bg-brand-50 font-medium rounded-xl transition text-sm">
              סגרי
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Client selection */}
            <div>
              <label className={labelClass}>לקוחה</label>
              <div className="flex gap-2 mb-2">
                <button type="button" onClick={() => setClientMode('existing')}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition border ${clientMode === 'existing' ? 'bg-brand-500 text-white border-brand-500' : 'border-brand-200 text-brand-700 hover:bg-brand-50'}`}>
                  לקוחה קיימת
                </button>
                <button type="button" onClick={() => setClientMode('new')}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition border flex items-center justify-center gap-1.5 ${clientMode === 'new' ? 'bg-brand-500 text-white border-brand-500' : 'border-brand-200 text-brand-700 hover:bg-brand-50'}`}>
                  <UserPlus size={14} /> לקוחה חדשה
                </button>
              </div>

              {clientMode === 'existing' ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      value={clientSearch}
                      onChange={e => setClientSearch(e.target.value)}
                      placeholder="חיפוש לפי שם או טלפון..."
                      className="w-full pr-8 pl-4 py-2.5 rounded-xl border border-brand-200 bg-brand-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
                    />
                  </div>
                  <div className="max-h-36 overflow-y-auto rounded-xl border border-brand-100 divide-y divide-brand-50">
                    {filteredClients.map(c => (
                      <button key={c.id} type="button"
                        onClick={() => { setSelectedClientId(c.id); setClientSearch(c.fullName) }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-right hover:bg-brand-50 transition ${selectedClientId === c.id ? 'bg-brand-50' : ''}`}>
                        {selectedClientId === c.id && <Check size={14} className="text-brand-500 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-brand-900 truncate">{c.fullName}</p>
                          {c.phone && <p className="text-xs text-muted">{c.phone}</p>}
                        </div>
                      </button>
                    ))}
                    {filteredClients.length === 0 && <p className="text-center text-muted text-sm py-3">לא נמצאו לקוחות</p>}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-brand-50 rounded-xl p-4">
                  <input value={newClient.fullName} onChange={e => setNewClient(p => ({ ...p, fullName: e.target.value }))}
                    className={inputClass} placeholder="שם מלא *" required={clientMode === 'new'} />
                  <input value={newClient.phone} onChange={e => setNewClient(p => ({ ...p, phone: e.target.value }))}
                    className={inputClass} placeholder="טלפון" dir="ltr" />
                  <input type="email" value={newClient.email} onChange={e => setNewClient(p => ({ ...p, email: e.target.value }))}
                    className={inputClass} placeholder="אימייל (לשליחת אישור)" dir="ltr" />
                </div>
              )}
            </div>

            {/* Treatment */}
            <div>
              <label className={labelClass}>סוג טיפול *</label>
              <select value={form.treatmentId} onChange={e => setF('treatmentId', e.target.value)} required className={inputClass}>
                {treatments.map(t => <option key={t.id} value={t.id}>{t.name} ({t.durationMinutes} דק׳)</option>)}
              </select>
            </div>

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>תאריך *</label>
                <input type="date" required value={form.date} onChange={e => setF('date', e.target.value)} className={inputClass} dir="ltr" />
              </div>
              <div>
                <label className={labelClass}>שעה *</label>
                <input type="time" required value={form.startTime} onChange={e => setF('startTime', e.target.value)} className={inputClass} dir="ltr" step={slotIntervalMinutes * 60} />
              </div>
            </div>

            {selectedTreatment && (
              <div className="bg-brand-50 rounded-xl px-4 py-3 text-sm text-brand-700">
                משך: {selectedTreatment.durationMinutes} דקות + {selectedTreatment.bufferMinutes} דק׳ מרווח
              </div>
            )}

            {/* Add-ons */}
            {addons.length > 0 && (
              <div>
                <label className={labelClass}>תוספות</label>
                <div className="space-y-2 bg-brand-50 rounded-xl p-3">
                  {addons.map(a => (
                    <label key={a.id} className="flex items-center justify-between gap-3 cursor-pointer">
                      <span className="flex items-center gap-2 text-sm text-brand-900">
                        <input type="checkbox" checked={selectedAddonIds.includes(a.id)} onChange={() => toggleAddon(a.id)} className="w-4 h-4 rounded accent-brand-500" />
                        {a.name}
                      </span>
                      <span className="text-sm font-medium text-brand-600">{formatCurrency(a.price)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Student/soldier discount */}
            {selectedTreatment?.studentDiscountEnabled && (
              <label className="flex items-center gap-2 cursor-pointer bg-amber-50 border border-amber-200 rounded-xl p-3">
                <input type="checkbox" checked={isStudentDiscount} onChange={e => toggleStudentDiscount(e.target.checked)} className="w-4 h-4 rounded accent-brand-500" />
                <span className="text-sm font-medium text-amber-900">חיילת/סטודנטית (הנחה {selectedTreatment.studentDiscountPercent}%)</span>
              </label>
            )}

            {discountAmount > 0 && (
              <div className="text-xs text-amber-700 -mt-2">הנחה: -{formatCurrency(discountAmount)}</div>
            )}

            <div>
              <label className={labelClass}>מחיר (₪)</label>
              <input type="number" value={form.price} onChange={e => setF('price', e.target.value)} className={inputClass} min="0" step="0.01" dir="ltr" />
            </div>

            <div>
              <label className={labelClass}>הערות</label>
              <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} rows={2} className={inputClass} />
            </div>

            {error && <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 border border-red-100">{error}</div>}

            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={loading} className="flex-1 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-semibold rounded-xl transition">
                {loading ? 'שומרת...' : 'יצירת תור'}
              </button>
              <button type="button" onClick={onClose} className="px-5 py-3 border border-brand-200 text-brand-700 hover:bg-brand-50 font-medium rounded-xl transition">ביטול</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
