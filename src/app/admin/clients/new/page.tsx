import { prisma } from '@/lib/prisma'
import { ClientForm } from '@/components/admin/ClientForm'

export default async function NewClientPage() {
  const customQuestions = await prisma.customQuestion.findMany({ where: { isActive: true }, orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] })

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-brand-900 mb-6">לקוחה חדשה</h1>
      <ClientForm customQuestions={customQuestions} />
    </div>
  )
}
