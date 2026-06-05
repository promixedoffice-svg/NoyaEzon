import { prisma } from '@/lib/prisma'
import { TasksPageClient } from '@/components/admin/TasksPageClient'

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const [tasks, deletedTasks, settings] = await Promise.all([
    prisma.task.findMany({
      where: { deletedAt: null },
      orderBy: [{ completedAt: 'asc' }, { dueAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
    }),
    prisma.task.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
    }),
    prisma.businessSettings.findFirst({ select: { taskReminderMinutes: true } }),
  ])

  return (
    <TasksPageClient
      initialTasks={tasks.map(t => ({ ...t, dueAt: t.dueAt?.toISOString() ?? null, completedAt: t.completedAt?.toISOString() ?? null, deletedAt: null, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString() }))}
      initialDeleted={deletedTasks.map(t => ({ ...t, dueAt: t.dueAt?.toISOString() ?? null, completedAt: t.completedAt?.toISOString() ?? null, deletedAt: t.deletedAt!.toISOString(), createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString() }))}
      reminderMinutes={settings?.taskReminderMinutes ?? 30}
    />
  )
}
