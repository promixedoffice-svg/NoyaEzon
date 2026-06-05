import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const deleted = req.nextUrl.searchParams.get('deleted') === 'true'
  const tasks = await prisma.task.findMany({
    where: deleted ? { deletedAt: { not: null } } : { deletedAt: null },
    orderBy: deleted ? { deletedAt: 'desc' } : [{ completedAt: 'asc' }, { dueAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
  })
  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const task = await prisma.task.create({
    data: {
      title: body.title,
      description: body.description || null,
      dueAt: body.dueAt ? new Date(body.dueAt) : null,
    },
  })
  return NextResponse.json(task)
}
