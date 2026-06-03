import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const blockedTimes = await prisma.blockedTime.findMany({ orderBy: { startAt: 'asc' } })
  return NextResponse.json(blockedTimes)
}

export async function POST(req: NextRequest) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const blocked = await prisma.blockedTime.create({
    data: {
      startAt: new Date(body.startAt),
      endAt: new Date(body.endAt),
      reason: body.reason || null,
      isVacation: body.isVacation ?? false,
    },
  })
  return NextResponse.json(blocked)
}
