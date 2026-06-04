import { prisma } from '@/lib/prisma'
import { BroadcastManager } from '@/components/admin/BroadcastManager'

export default async function BroadcastPage() {
  const clients = await prisma.client.findMany({
    where: { deletedAt: null },
    select: { id: true, fullName: true, phone: true, email: true, status: true },
    orderBy: { fullName: 'asc' },
  })

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold text-brand-900">📢 רשימת תפוצה</h1>
      <BroadcastManager clients={clients} />
    </div>
  )
}
