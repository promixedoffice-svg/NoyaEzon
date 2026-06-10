'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Client { id: string; fullName: string }
interface Treatment { id: string; name: string; defaultPrice: number; studentDiscountEnabled: boolean; studentDiscountPercent: number }
interface Addon { id: string; name: string; price: number }

interface DefaultValues {
  clientId?: string
  clientName?: string
  service?: string
  amount?: string
  addons?: { name: string; price: number }[]
  discountAmount?: string
  discountLabel?: string
}

function computePrice(treatment: Treatment | undefined, addonIds: string[], addons: Addon[], isStudentDiscount: boolean) {
  const selectedAddons = addonIds.map(id => addons.find(a => a.id === id)).filter(Boolean) as Addon[]
  const addonsTotal = selectedAddons.reduce((s, a) => s + a.price, 0)
  const subtotal = (treatment?.defaultPrice ?? 0) + addonsTotal
  const discountPercent = isStudentDiscount && treatment?.studentDiscountEnabled ? treatment.studentDiscountPercent : 0
  const discountAmount = Math.round((subtotal * discountPercent / 100) * 100) / 100
  return { selectedAddons, addonsTotal, subtotal, discountPercent, discountAmount, finalPrice: subtotal - discountAmount }
}

export function AddReceiptForm({
  clients,
  treatments,
  addons,
  defaultValues,
  onClose,
}: {
  clients: Client[]
  treatments: Treatment[]
  addons: Addon[]
  defaultValues?: DefaultValues | null
  onClose: () => void
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    clientId: defaultValues?.clientId ?? '',
    serviceDescription: defaultValues?.service ?? '',
    amount: defaultValues?.amount ?? '',
    method: 'cash' as const,
  })
  const [treatmentId, setTreatmentId] = useState('')
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([])
  const [isStudentDiscount, setIsStudentDiscount] = useState(false)

  const isPrefilled = !!defaultValues?.service
  const selectedTreatment = treatments.find(t => t.id === treatmentId)
  const { selectedAddons, discountAmount, discountPercent, finalPrice } = computePrice(selectedTreatment, selectedAddonIds, addons, isStudentDiscount)

  function set(field: string, value: string) { setForm(p => ({ ...p, [field]: value })) }

  function handleTreatmentChange(id: string) {
    setTreatmentId(id)
    setSelectedAddonIds([])
    setIsStudentDiscount(false)
    if (!id) return
    const t = treatments.find(x => x.id === id)
    if (!t) return
    setForm(p => ({ ...p, serviceDescription: t.name, amount: String(t.defaultPrice) }))
  }

  function toggleAddon(id: string) {
    const next = selectedAddonIds.includes(id) ? selectedAddonIds.filter(x => x !== id) : [...selectedAddonIds, id]
    setSelectedAddonIds(next)
    const { finalPrice: fp } = computePrice(selectedTreatment, next, addons, isStudentDiscount)
    setForm(p => ({ ...p, amount: String(fp) }))
  }

  function toggleStudentDiscount() {
    const next = !isStudentDiscount
    setIsStudentDiscount(next)
    const { finalPrice: fp } = computePrice(selectedTreatment, selectedAddonIds, addons, next)
    setForm(p => ({ ...p, amount: String(fp) }))
  }

  const selectedClient = clients.find(c => c.id === form.clientId)
  const clientName = selectedClient?.fullName ?? defaultValues?.clientName ?? ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.clientId || !form.serviceDescription || !form.amount) return
    setLoading(true); setError('')

    const body: any = {
      clientId: form.clientId,
      serviceDescription: form.serviceDescription,
      amount: parseFloat(form.amount),
      method: form.method,
      clientName,
    }

    if (isPrefilled) {
      if (defaultValues?.addons?.length) body.addons = defaultValues.addons
      if (defaultValues?.discountAmount) body.discountAmount = parseFloat(defaultValues.discountAmount)
      if (defaultValues?.discountLabel) body.discountLabel = defaultValues.discountLabel
    } else {
      if (selectedAddons.length) body.addons = selectedAddons.map(a => ({ name: a.name, price: a.price }))
      if (discountAmount) body.discountAmount = discountAmount
      if (discountPercent > 0) body.discountLabel = `הנחת חיילת/סטודנטית (${discountPercent}%)`
    }

    const res = await fetch('/api/receipts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    setLoading(false)
    if (!res.ok) { setError('שגיאה בהפקת קבלה'); return }
    router.push('/admin/receipts')
    onClose()
  }

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-brand-200 bg-brand-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
  const labelClass = "block text-sm font-medium text-brand-800 mb-1.5"

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-50 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-brand-900">הפקת קבלה</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-brand-50 text-muted transition"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={labelClass}>לקוחה *</label>
            <select value={form.clientId} onChange={e => set('clientId', e.target.value)} required className={inputClass}>
              <option value="">בחרי לקוחה...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
            </select>
          </div>

          {/* Itemized breakdown from a completed appointment */}
          {isPrefilled && (defaultValues?.addons?.length || defaultValues?.discountLabel) && (
            <div className="bg-brand-50 border border-brand-100 rounded-xl p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted">{defaultValues?.service}</span><span className="font-medium">{formatCurrency(parseFloat(defaultValues?.amount ?? '0') + parseFloat(defaultValues?.discountAmount ?? '0') - (defaultValues?.addons?.reduce((s, a) => s + a.price, 0) ?? 0))}</span></div>
              {defaultValues?.addons?.map((a, i) => (
                <div key={i} className="flex justify-between text-muted"><span>+ {a.name}</span><span>{formatCurrency(a.price)}</span></div>
              ))}
              {defaultValues?.discountLabel && (
                <div className="flex justify-between text-amber-700"><span>{defaultValues.discountLabel}</span><span>-{formatCurrency(parseFloat(defaultValues?.discountAmount ?? '0'))}</span></div>
              )}
            </div>
          )}

          {/* Treatment + addons + discount selection (manual receipts) */}
          {!isPrefilled && (
            <>
              <div>
                <label className={labelClass}>טיפול (אופציונלי)</label>
                <select value={treatmentId} onChange={e => handleTreatmentChange(e.target.value)} className={inputClass}>
                  <option value="">בחרי טיפול...</option>
                  {treatments.map(t => <option key={t.id} value={t.id}>{t.name} ({formatCurrency(t.defaultPrice)})</option>)}
                </select>
              </div>

              {treatmentId && addons.length > 0 && (
                <div className="bg-brand-50 border border-brand-100 rounded-xl p-3">
                  <p className="text-xs font-medium text-brand-700 mb-2">תוספות</p>
                  <div className="space-y-1.5">
                    {addons.map(a => (
                      <label key={a.id} className="flex items-center justify-between text-sm cursor-pointer">
                        <span className="flex items-center gap-2">
                          <input type="checkbox" checked={selectedAddonIds.includes(a.id)} onChange={() => toggleAddon(a.id)} className="rounded border-brand-300 text-brand-500 focus:ring-brand-400" />
                          {a.name}
                        </span>
                        <span className="text-muted">{formatCurrency(a.price)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {selectedTreatment?.studentDiscountEnabled && (
                <label className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm cursor-pointer">
                  <span className="flex items-center gap-2 text-amber-800 font-medium">
                    <input type="checkbox" checked={isStudentDiscount} onChange={toggleStudentDiscount} className="rounded border-amber-300 text-amber-600 focus:ring-amber-400" />
                    הנחת חיילת/סטודנטית ({selectedTreatment.studentDiscountPercent}%)
                  </span>
                  {discountAmount > 0 && <span className="text-amber-700">-{formatCurrency(discountAmount)}</span>}
                </label>
              )}
            </>
          )}

          <div>
            <label className={labelClass}>תיאור שירות *</label>
            <input
              value={form.serviceDescription}
              onChange={e => set('serviceDescription', e.target.value)}
              required
              className={inputClass}
              placeholder="לק ג׳ל, מניקור..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>סכום (₪) *</label>
              <input
                type="number"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
                required
                className={inputClass}
                min="0"
                step="0.01"
                dir="ltr"
              />
            </div>
            <div>
              <label className={labelClass}>אמצעי תשלום</label>
              <select value={form.method} onChange={e => set('method', e.target.value)} className={inputClass}>
                <option value="cash">מזומן</option>
                <option value="bit">ביט</option>
                <option value="paybox">פייבוקס</option>
                <option value="credit">אשראי</option>
                <option value="transfer">העברה</option>
                <option value="check">צ׳ק</option>
              </select>
            </div>
          </div>
          {error && <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 border border-red-100">{error}</div>}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading} className="flex-1 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-semibold rounded-xl transition">
              {loading ? 'מפיקה...' : 'הפקת קבלה'}
            </button>
            <button type="button" onClick={onClose} className="px-5 py-3 border border-brand-200 text-brand-700 hover:bg-brand-50 font-medium rounded-xl transition">ביטול</button>
          </div>
        </form>
      </div>
    </div>
  )
}
