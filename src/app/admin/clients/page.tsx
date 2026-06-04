import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatDate, formatCurrency, clientStatusLabel, clientStatusColor } from '@/lib/utils'
import { Plus, Search, Phone, Mail } from 'lucide-react'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const { q, status } = await searchParams

  const deletedCount = await prisma.client.count({ where: { deletedAt: { not: null } } })

  const clients = await prisma.client.findMany({
    where: {
      deletedAt: null, // exclude deleted
      ...(q ? {
        OR: [
          { fullName: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
          { email: { contains: q, mode: 'insensitive' } },
        ]
      } : {}),
      ...(status ? { status: status as any } : {}),
    },
    orderBy: { fullName: 'asc' },
    include: {
      _count: { select: { visits: true } },
    },
  })

  const clientIds = clients.map(c => c.id)

  const [visitRevenues, openDebts] = await Promise.all([
    prisma.payment.groupBy({
      by: ['clientId'],
      where: { clientId: { in: clientIds } },
      _sum: { amount: true },
    }),
    prisma.debt.findMany({
      where: { clientId: { in: clientIds }, status: { in: ['open', 'partial'] } },
      select: { clientId: true, originalAmount: true, paidAmount: true },
    }),
  ])

  const revenueMap = Object.fromEntries(visitRevenues.map(r => [r.clientId, r._sum.amount ?? 0]))
  const debtMap: Record<string, number> = {}
  for (const d of openDebts) {
    debtMap[d.clientId] = (debtMap[d.clientId] ?? 0) + (d.originalAmount - d.paidAmount)
  }

  const statusOptions = [
    { value: '', label: 'כולן' },
    { value: 'new', label: 'חדשה' },
    { value: 'active', label: 'פעילה' },
    { value: 'inactive', label: 'לא פעילה' },
    { value: 'debt', label: 'חייבת' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">לקוחות</h1>
          <p className="text-muted text-sm mt-0.5">{clients.length} לקוחות</p>
        </div>
        <div className="flex items-center gap-2">
          {deletedCount > 0 && (
            <Link href="/admin/clients/deleted" className="flex items-center gap-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-600 font-medium px-3 py-2.5 rounded-xl transition">
              🗑 סל מחזור ({deletedCount})
            </Link>
          )}
          <Link href="/admin/clients/new" className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium px-4 py-2.5 rounded-xl transition shadow-sm text-sm">
            <Plus size={16} /> לקוחה חדשה
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-brand-100 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <form className="flex-1 relative" method="get">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              name="q"
              defaultValue={q}
              placeholder="חיפוש לפי שם, טלפון, אימייל..."
              className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-brand-200 bg-brand-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition"
            />
            {status && <input type="hidden" name="status" value={status} />}
          </form>
          <div className="flex gap-2 flex-wrap">
            {statusOptions.map(opt => (
              <Link
                key={opt.value}
                href={`/admin/clients?${q ? `q=${q}&` : ''}${opt.value ? `status=${opt.value}` : ''}`}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition ${
                  (status ?? '') === opt.value ? 'bg-brand-500 text-white' : 'bg-brand-50 text-brand-700 hover:bg-brand-100'
                }`}
              >
                {opt.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm px-6 py-16 text-center">
          <div className="text-5xl mb-3">👤</div>
          <p className="text-brand-900 font-medium">אין לקוחות</p>
          <Link href="/admin/clients/new" className="inline-block mt-4 text-brand-500 hover:text-brand-700 text-sm font-medium transition">+ הוסיפי לקוחה</Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {clients.map(client => {
            const debt = debtMap[client.id] ?? 0
            const revenue = revenueMap[client.id] ?? 0
            return (
              <Link key={client.id} href={`/admin/clients/${client.id}`}
                className="bg-white rounded-2xl border border-brand-100 shadow-sm hover:shadow-md transition-all hover:border-brand-200 p-5 flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-lg shrink-0">
                  {client.fullName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-semibold text-brand-900 group-hover:text-brand-600 transition">{client.fullName}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${clientStatusColor(client.status)}`}>{clientStatusLabel(client.status)}</span>
                    {debt > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">חוב: {formatCurrency(debt)}</span>}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted">
                    {client.phone && <span className="flex items-center gap-1"><Phone size={11} />{client.phone}</span>}
                    {client.email && <span className="flex items-center gap-1"><Mail size={11} />{client.email}</span>}
                    {client.city && <span>{client.city}</span>}
                  </div>
                </div>
                <div className="hidden sm:flex gap-6 text-center shrink-0">
                  <div>
                    <p className="font-bold text-brand-900 text-lg">{client._count.visits}</p>
                    <p className="text-xs text-muted">ביקורים</p>
                  </div>
                  <div>
                    <p className="font-bold text-brand-900 text-lg">{formatCurrency(revenue)}</p>
                    <p className="text-xs text-muted">הכנסות</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">נפתחה</p>
                    <p className="text-sm font-medium text-brand-700">{formatDate(client.cardOpenedAt)}</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
