import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { ArrowRight, RotateCcw } from 'lucide-react'
import { RestoreClientButton } from '@/components/admin/RestoreClientButton'

export default async function DeletedClientsPage() {
  const clients = await prisma.client.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: 'desc' },
  })

  return (
    <div className="space-y-5 max-w-2xl">
      <Link href="/admin/clients" className="flex items-center gap-1.5 text-sm text-muted hover:text-brand-600 transition w-fit">
        <ArrowRight size={14} /> חזרה ללקוחות
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-brand-900">🗑 סל מחזור</h1>
        <span className="text-sm text-muted">{clients.length} לקוחות</span>
      </div>

      {clients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm px-6 py-12 text-center">
          <p className="text-brand-800 font-medium">סל המחזור ריק</p>
        </div>
      ) : (
        <div className="space-y-2">
          {clients.map(client => (
            <div key={client.id} className="bg-white rounded-2xl border border-brand-100 shadow-sm p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold shrink-0">
                {client.fullName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-600">{client.fullName}</p>
                <div className="flex gap-3 text-xs text-muted mt-0.5">
                  {client.phone && <span>{client.phone}</span>}
                  <span>נמחקה: {client.deletedAt ? formatDate(client.deletedAt) : '—'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <RestoreClientButton clientId={client.id} />
                <Link href={`/admin/clients/${client.id}`} className="text-xs text-muted hover:text-brand-600 transition px-3 py-1.5 rounded-xl hover:bg-brand-50">
                  צפייה
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
