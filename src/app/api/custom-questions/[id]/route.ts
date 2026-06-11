import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    const body = await req.json()
    const data: Record<string, unknown> = {}
    if (body.label !== undefined) data.label = body.label
    if (body.type !== undefined) data.type = body.type === 'multi' ? 'multi' : 'single'
    if (body.options !== undefined) {
      const options = Array.isArray(body.options) ? body.options.filter((o: unknown) => typeof o === 'string' && o.trim()) : []
      if (options.length < 2) {
        return NextResponse.json({ error: 'יש להזין לפחות שתי אפשרויות בחירה' }, { status: 400 })
      }
      data.options = options
    }
    if (body.isActive !== undefined) data.isActive = body.isActive
    if (body.order !== undefined) data.order = body.order
    const question = await prisma.customQuestion.update({ where: { id }, data })
    return NextResponse.json(question)
  } catch {
    return NextResponse.json({ error: 'שגיאה בעדכון השאלה' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    await prisma.customQuestion.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'שגיאה במחיקת השאלה' }, { status: 500 })
  }
}
