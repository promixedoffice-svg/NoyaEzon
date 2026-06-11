import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { ClientForm } from '@/components/admin/ClientForm'

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [client, customQuestions] = await Promise.all([
    prisma.client.findUnique({ where: { id } }),
    prisma.customQuestion.findMany({ where: { isActive: true }, orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] }),
  ])
  if (!client) notFound()

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-brand-900 mb-6">עריכת {client.fullName}</h1>
      <ClientForm client={{ ...client, id: client.id, customAnswers: client.customAnswers as Record<string, string | string[]> | null }} customQuestions={customQuestions} />
    </div>
  )
}
