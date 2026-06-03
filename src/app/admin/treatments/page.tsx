import { prisma } from '@/lib/prisma'
import { TreatmentsManager } from '@/components/admin/TreatmentsManager'

export default async function TreatmentsPage() {
  const treatments = await prisma.treatment.findMany({ orderBy: { name: 'asc' } })
  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold text-brand-900">סוגי טיפולים</h1>
      <TreatmentsManager treatments={treatments} />
    </div>
  )
}
