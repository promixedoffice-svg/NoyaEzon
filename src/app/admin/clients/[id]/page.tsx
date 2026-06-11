import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  formatDate, formatDateTime, formatCurrency,
  clientStatusLabel, clientStatusColor, paymentMethodLabel,
  appointmentStatusLabel, appointmentStatusColor, paymentStatusLabel
} from '@/lib/utils'
import { Phone, Mail, MapPin, Edit, Plus, Calendar, CreditCard, FileText, ArrowRight, Printer } from 'lucide-react'
import { ClientCardActions } from '@/components/admin/ClientCardActions'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      visits: { include: { treatment: { select: { name: true } } }, orderBy: { visitedAt: 'desc' }, take: 20 },
      appointments: { include: { treatment: { select: { name: true } } }, orderBy: { startAt: 'desc' }, take: 10 },
      payments: { orderBy: { paidAt: 'desc' }, take: 20 },
      receipts: { orderBy: { issuedAt: 'desc' }, take: 20 },
      debts: { where: { status: { in: ['open', 'partial'] } } },
    },
  })

  if (!client) notFound()

  const customAnswers = (client.customAnswers as Record<string, string | string[]> | null) ?? null
  const customQuestions = customAnswers ? await prisma.customQuestion.findMany({ where: { id: { in: Object.keys(customAnswers) } } }) : []

  const totalRevenue = client.payments.reduce((s, p) => s + p.amount, 0)
  const totalReceiptRevenue = client.receipts.filter(r => r.status === 'active' && !r.deletedAt).reduce((s, r) => s + r.amount, 0)
  const totalDebt = client.debts.reduce((s, d) => s + (d.originalAmount - d.paidAmount), 0)
  const nextAppointment = client.appointments.find(a =>
    new Date(a.startAt) > new Date() && ['pending', 'confirmed'].includes(a.status)
  )
  const lastVisit = client.visits[0]

  return (
    <div className="space-y-5 max-w-4xl">
      <Link href="/admin/clients" className="flex items-center gap-1.5 text-sm text-muted hover:text-brand-600 transition w-fit">
        <ArrowRight size={14} /> חזרה ללקוחות
      </Link>

      {/* Deleted banner */}
      {client.deletedAt && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3 flex items-center gap-3">
          <span className="text-lg">🗑</span>
          <p className="text-sm text-red-700 font-medium">לקוחה זו נמצאת בסל המחזור מ-{formatDate(client.deletedAt)}</p>
        </div>
      )}

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-2xl shrink-0">
            {client.fullName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-brand-900">{client.fullName}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${clientStatusColor(client.status)}`}>
                {clientStatusLabel(client.status)}
              </span>
              {totalDebt > 0 && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-medium">
                  חוב: {formatCurrency(totalDebt)}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted">
              {client.phone && <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 hover:text-brand-600 transition"><Phone size={13} />{client.phone}</a>}
              {client.email && <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 hover:text-brand-600 transition"><Mail size={13} />{client.email}</a>}
              {client.city && <span className="flex items-center gap-1.5"><MapPin size={13} />{client.city}</span>}
              {client.birthDate && <span className="flex items-center gap-1.5">🎂 {formatDate(client.birthDate)}</span>}
            </div>

            {/* Actions row */}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {!client.deletedAt && (
                <Link href={`/admin/clients/${id}/edit`}
                  className="flex items-center gap-1.5 text-sm bg-brand-50 hover:bg-brand-100 text-brand-700 font-medium px-3 py-2 rounded-xl transition">
                  <Edit size={14} /> עריכה
                </Link>
              )}
              <ClientCardActions
                clientId={id}
                clientName={client.fullName}
                lastVisit={lastVisit ? { id: lastVisit.id, treatmentName: lastVisit.treatment?.name ?? lastVisit.treatmentName, visitedAt: lastVisit.visitedAt, price: lastVisit.price } : null}
                isDeleted={!!client.deletedAt}
              />
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-brand-50">
          <div><p className="text-xs text-muted">ביקורים</p><p className="font-bold text-brand-900 text-lg">{client.visits.length}</p></div>
          <div>
            <p className="text-xs text-muted">סה״כ הכנסות</p>
            <p className="font-bold text-brand-900 text-lg">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-green-600 mt-0.5">🧾 {formatCurrency(totalReceiptRevenue)} עם קבלות</p>
          </div>
          <div><p className="text-xs text-muted">ביקור אחרון</p><p className="font-semibold text-brand-700 text-sm">{lastVisit ? formatDate(lastVisit.visitedAt) : '—'}</p></div>
          <div><p className="text-xs text-muted">תור הבא</p><p className="font-semibold text-brand-700 text-sm">{nextAppointment ? formatDateTime(nextAppointment.startAt) : '—'}</p></div>
        </div>
      </div>

      {/* Notes / preferences */}
      {(client.notes || client.preferences || client.sensitivities) && (
        <div className="grid sm:grid-cols-3 gap-4">
          {client.notes && <NoteCard title="הערות" text={client.notes} />}
          {client.preferences && <NoteCard title="העדפות" text={client.preferences} />}
          {client.sensitivities && <NoteCard title="רגישויות" text={client.sensitivities} highlight />}
        </div>
      )}

      {/* Custom intake answers */}
      {customAnswers && customQuestions.length > 0 && (
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-4">
          <h3 className="text-xs font-semibold uppercase mb-2 text-muted">פרטים נוספים</h3>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            {customQuestions.map(q => {
              const answer = customAnswers[q.id]
              if (!answer || (Array.isArray(answer) && answer.length === 0)) return null
              return (
                <div key={q.id}>
                  <p className="text-xs text-muted">{q.label}</p>
                  <p className="text-brand-900 font-medium">{Array.isArray(answer) ? answer.join(', ') : answer}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Visits */}
      <Section title="ביקורים" icon={<Calendar size={15} />}>
        {client.visits.length === 0 ? <Empty text="אין ביקורים עדיין" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-brand-50 text-xs text-muted">
                <th className="text-right pb-2 font-medium">תאריך</th>
                <th className="text-right pb-2 font-medium">טיפול</th>
                <th className="text-right pb-2 font-medium">מחיר</th>
                <th className="text-right pb-2 font-medium">תשלום</th>
              </tr></thead>
              <tbody>
                {client.visits.map(v => (
                  <tr key={v.id} className="border-b border-brand-50 hover:bg-brand-50/50">
                    <td className="py-2.5">{formatDate(v.visitedAt)}</td>
                    <td className="py-2.5">{v.treatment?.name ?? v.treatmentName}</td>
                    <td className="py-2.5 font-medium">{formatCurrency(v.price)}</td>
                    <td className="py-2.5"><StatusBadge status={v.paymentStatus} type="payment" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Appointments */}
      <Section title="תורים" icon={<Calendar size={15} />}>
        {client.appointments.length === 0 ? <Empty text="אין תורים" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-brand-50 text-xs text-muted">
                <th className="text-right pb-2 font-medium">תאריך ושעה</th>
                <th className="text-right pb-2 font-medium">טיפול</th>
                <th className="text-right pb-2 font-medium">סטטוס</th>
                <th className="text-right pb-2 font-medium">הערות</th>
              </tr></thead>
              <tbody>
                {client.appointments.map(a => (
                  <tr key={a.id} className="border-b border-brand-50 hover:bg-brand-50/50">
                    <td className="py-2.5">{formatDateTime(a.startAt)}</td>
                    <td className="py-2.5">{a.treatment?.name ?? '—'}</td>
                    <td className="py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${appointmentStatusColor(a.status)}`}>{appointmentStatusLabel(a.status)}</span></td>
                    <td className="py-2.5 text-muted text-xs max-w-[120px] truncate">{a.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Payments */}
      <Section title="תשלומים" icon={<CreditCard size={15} />}>
        {client.payments.length === 0 ? <Empty text="אין תשלומים" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-brand-50 text-xs text-muted">
                <th className="text-right pb-2 font-medium">תאריך</th>
                <th className="text-right pb-2 font-medium">סכום</th>
                <th className="text-right pb-2 font-medium">אמצעי תשלום</th>
              </tr></thead>
              <tbody>
                {client.payments.map((p: any) => (
                  <tr key={p.id} className="border-b border-brand-50 hover:bg-brand-50/50">
                    <td className="py-2.5">{formatDate(p.paidAt)}</td>
                    <td className="py-2.5 font-semibold text-green-700">{formatCurrency(p.amount)}</td>
                    <td className="py-2.5">{paymentMethodLabel(p.method)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Receipts */}
      <Section title="קבלות" icon={<FileText size={15} />}>
        {client.receipts.length === 0 ? <Empty text="אין קבלות" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-brand-50 text-xs text-muted">
                <th className="text-right pb-2 font-medium">#</th>
                <th className="text-right pb-2 font-medium">תאריך</th>
                <th className="text-right pb-2 font-medium">סכום</th>
                <th className="text-right pb-2 font-medium">שירות</th>
                <th className="text-right pb-2 font-medium">סטטוס</th>
                <th></th>
              </tr></thead>
              <tbody>
                {client.receipts.map(r => (
                  <tr key={r.id} className={`border-b border-brand-50 hover:bg-brand-50/50 ${r.status === 'cancelled' ? 'opacity-50' : ''}`}>
                    <td className="py-2.5 font-mono text-brand-600">#{r.receiptNumber}</td>
                    <td className="py-2.5">{formatDate(r.issuedAt)}</td>
                    <td className="py-2.5 font-semibold">{formatCurrency(r.amount)}</td>
                    <td className="py-2.5 max-w-[120px] truncate">{r.serviceDescription}</td>
                    <td className="py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 line-through'}`}>{r.status === 'active' ? 'פעילה' : 'בוטלה'}</span></td>
                    <td className="py-2.5">
                      <Link href={`/admin/receipts/${r.id}`} className="flex items-center gap-1 text-brand-500 hover:text-brand-700 text-xs font-medium transition">
                        <Printer size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  )
}

function NoteCard({ title, text, highlight }: { title: string; text: string; highlight?: boolean }) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-4 ${highlight ? 'border-l-2 border-l-red-400 border-brand-100' : 'border-brand-100'}`}>
      <h3 className={`text-xs font-semibold uppercase mb-2 ${highlight ? 'text-red-500' : 'text-muted'}`}>{title}</h3>
      <p className="text-sm text-brand-800 whitespace-pre-wrap">{text}</p>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
      <div className="flex items-center px-5 py-4 border-b border-brand-50">
        <h2 className="font-semibold text-brand-900 flex items-center gap-2 text-sm">{icon}{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="text-muted text-sm text-center py-3">{text}</p>
}

function StatusBadge({ status, type }: { status: string; type: 'payment' | 'appt' }) {
  const colors: Record<string, string> = {
    paid: 'bg-green-100 text-green-700', partial: 'bg-amber-100 text-amber-700', unpaid: 'bg-red-100 text-red-700',
    confirmed: 'bg-green-100 text-green-700', pending: 'bg-amber-100 text-amber-700', cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-700', no_show: 'bg-gray-100 text-gray-600',
  }
  const labels: Record<string, string> = {
    paid: 'שולם', partial: 'חלקי', unpaid: 'לא שולם',
    confirmed: 'מאושר', pending: 'ממתין', cancelled: 'בוטל', completed: 'הסתיים', no_show: 'לא הגיעה',
  }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>{labels[status] ?? status}</span>
}
