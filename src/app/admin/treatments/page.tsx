import { prisma } from '@/lib/prisma'
import { TreatmentsManager } from '@/components/admin/TreatmentsManager'
import { AddonsManager } from '@/components/admin/AddonsManager'

export default async function TreatmentsPage() {
  const [treatments, addons] = await Promise.all([
    prisma.treatment.findMany({ orderBy: { name: 'asc' } }),
    prisma.addon.findMany({ orderBy: [{ order: 'asc' }, { name: 'asc' }] }),
  ])
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-brand-900">סוגי טיפולים</h1>
        <TreatmentsManager treatments={treatments} />
      </div>
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-brand-900">תוספות</h2>
        <AddonsManager addons={addons} />
      </div>
    </div>
  )
}
