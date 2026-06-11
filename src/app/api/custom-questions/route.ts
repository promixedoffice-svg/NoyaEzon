import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const questions = await prisma.customQuestion.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] })
  return NextResponse.json(questions)
}

export async function POST(req: NextRequest) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    if (!body.label || typeof body.label !== 'string') {
      return NextResponse.json({ error: 'יש להזין את נוסח השאלה' }, { status: 400 })
    }
    const options = Array.isArray(body.options) ? body.options.filter((o: unknown) => typeof o === 'string' && o.trim()) : []
    if (options.length < 2) {
      return NextResponse.json({ error: 'יש להזין לפחות שתי אפשרויות בחירה' }, { status: 400 })
    }
    const last = await prisma.customQuestion.findFirst({ orderBy: { order: 'desc' } })
    const question = await prisma.customQuestion.create({
      data: {
        label: body.label,
        type: body.type === 'multi' ? 'multi' : 'single',
        options,
        order: (last?.order ?? -1) + 1,
        isActive: body.isActive ?? true,
      },
    })
    return NextResponse.json(question)
  } catch {
    return NextResponse.json({ error: 'שגיאה בשמירת השאלה' }, { status: 500 })
  }
}
