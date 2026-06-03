import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatDateTime, formatCurrency, clientStatusLabel, clientStatusColor, paymentMethodLabel, appointmentStatusLabel, appointmentStatusColor, paymentStatusLabel } from '@/lib/utils'
import { Phone, Mail, MapPin, Edit, Plus, Calendar, CreditCard, FileText, ArrowRight } from 'lucide-react'

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

  const totalRevenue = client.payments.reduce((s, p) => s + p.amount, 0)
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

      <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-2xl shrink-0">
            {client.fullName.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-brand-900">{client.fullName}</h1>
              <span className={`text-sm px-3 py-1 rounded-full font-medium ${clientStatusColor(client.status)}`}>{clientStatusLabel(client.status)}</span>
              {totalDebt > 0 && <span className="text-sm px-3 py-1 rounded-full bg-red-100 text-red-700 font-medium">חוב: {formatCurrency(totalDebt)}</span>}
            </div>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted">
              {client.phone && <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 hover:text-brand-600 transition"><Phone size={14} />{client.phone}</a>}
              {client.email && <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 hover:text-brand-600 transition"><Mail size={14} />{client.email}</a>}
              {client.city && <span className="flex items-center gap-1.5"><MapPin size={14} />{client.city}</span>}
            </div>
          </div>
          <Link href={`/admin/clients/${id}/edit`} className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-800 font-medium transition shrink-0">
            <Edit size={15} /> עריכה
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-brand-50">
          <div><p className="text-xs text-muted">ביקורים</p><p className="font-bold text-brand-900 text-xl">{client.visits.length}</p></div>
          <div><p className="text-xs text-muted">סך הכנסות</p><p className="font-bold text-brand-900 text-xl">{formatCurrency(totalRevenue)}</p></div>
          <div><p className="text-xs text-muted">ביקור אחרון</p><p className="font-semibold text-brand-700 text-sm">{lastVisit ? formatDate(lastVisit.visitedAt) : '—'}</p></div>
          <div><p className="text-xs text-muted">תור הבא</p><p className="font-semibold text-brand-700 text-sm">{nextAppointment ? formatDateTime(nextAppointment.startAt) : '—'}</p></div>
        </div>
      </div>

      {(client.notes || client.preferences || client.sensitivities) && (
        <div className="grid sm:grid-cols-3 gap-4">
          {client.notes && <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-4"><h3 className="text-xs font-semibold text-muted uppercase mb-2">הערות</h3><p className="text-sm text-brand-800 whitespace-pre-wrap">{client.notes}</p></div>}
          {client.preferences && <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-4"><h3 className="text-xs font-semibold text-muted uppercase mb-2">העדפות</h3><p className="text-sm text-brand-800 whitespace-pre-wrap">{client.preferences}</p></div>}
          {client.sensitivities && <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-4 border-l-2 border-l-red-300"><h3 className="text-xs font-semibold text-red-500 uppercase mb-2">רגישויות</h3><p className="text-sm text-brand-800 whitespace-pre-wrap">{client.sensitivities}</p></div>}
        </div>
      )}

      <Section title="ביקורים" icon={<Calendar size={16} />}>
        {client.visits.length === 0 ? <Empty text="אין ביקורים עדיין" /> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-brand-50 text-xs text-muted"><th className="text-right pb-2 font-medium">תאריך</th><th className="text-right pb-2 font-medium">טיפול</th><th className="text-right pb-2 font-medium">מחיר</th><th className="text-right pb-2 font-medium">תשלום</th></tr></thead>
            <tbody>
              {client.visits.map(v => (
                <tr key={v.id} className="border-b border-brand-50 hover:bg-brand-50/50 transition">
                  <td className="py-3">{formatDate(v.visitedAt)}</td>
                  <td className="py-3">{v.treatment?.name ?? v.treatmentName}</td>
                  <td className="py-3 font-medium">{formatCurrency(v.price)}</td>
                  <td className="py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : v.paymentStatus === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{paymentStatusLabel(v.paymentStatus)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="תורים" icon={<Calendar size={16} />}>
        {client.appointments.length === 0 ? <Empty text="אין תורים" /> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-brand-50 text-xs text-muted"><th className="text-right pb-2 font-medium">תאריך ושעה</th><th className="text-right pb-2 font-medium">טיפול</th><th className="text-right pb-2 font-medium">סטטוס</th></tr></thead>
            <tbody>
              {client.appointments.map(a => (
                <tr key={a.id} className="border-b border-brand-50 hover:bg-brand-50/50 transition">
                  <td className="py-3">{formatDateTime(a.startAt)}</td>
                  <td className="py-3">{a.treatment?.name ?? '—'}</td>
                  <td className="py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${appointmentStatusColor(a.status)}`}>{appointmentStatusLabel(a.status)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="תשלומים" icon={<CreditCard size={16} />}>
        {client.payments.length === 0 ? <Empty text="אין תשלומים" /> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-brand-50 text-xs text-muted"><th className="text-right pb-2 font-medium">תאריך</th><th className="text-right pb-2 font-medium">סכום</th><th className="text-right pb-2 font-medium">אמצעי תשלום</th></tr></thead>
            <tbody>
              {client.payments.map(p => (
                <tr key={p.id} className="border-b border-brand-50 hover:bg-brand-50/50 transition">
                  <td className="py-3">{formatDate(p.paidAt)}</td>
                  <td className="py-3 font-semibold text-green-700">{formatCurrency(p.amount)}</td>
                  <td className="py-3">{paymentMethodLabel(p.method)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="קבלות" icon={<FileText size={16} />}>
        {client.receipts.length === 0 ? <Empty text="אין קבלות" /> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-brand-50 text-xs text-muted"><th className="text-right pb-2 font-medium">#</th><th className="text-right pb-2 font-medium">תאריך</th><th className="text-right pb-2 font-medium">סכום</th><th className="text-right pb-2 font-medium">שירות</th></tr></thead>
            <tbody>
              {client.receipts.map(r => (
                <tr key={r.id} className="border-b border-brand-50 hover:bg-brand-50/50 transition">
                  <td className="py-3">#{r.receiptNumber}</td>
                  <td className="py-3">{formatDate(r.issuedAt)}</td>
                  <td className="py-3 font-semibold">{formatCurrency(r.amount)}</td>
                  <td className="py-3">{r.serviceDescription}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
      <div className="flex items-center px-5 py-4 border-b border-brand-50">
        <h2 className="font-semibold text-brand-900 flex items-center gap-2">{icon}{title}</h2>
      </div>
      <div className="p-5 overflow-x-auto">{children}</div>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="text-muted text-sm text-center py-4">{text}</p>
}
