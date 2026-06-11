import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const questions = await prisma.customQuestion.findMany({
    where: { isActive: true },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, label: true, type: true, options: true },
  })
  return NextResponse.json(questions)
}
