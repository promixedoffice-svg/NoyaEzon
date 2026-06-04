import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = req.nextUrl
  const month = searchParams.get('month') // YYYY-MM
  const year = searchParams.get('year')   // YYYY

  let where: any = {}
  if (month) {
    const [y, m] = month.split('-').map(Number)
    where.date = {
      gte: new Date(y, m - 1, 1),
      lte: new Date(y, m, 0, 23, 59, 59),
    }
  } else if (year) {
    where.date = {
      gte: new Date(Number(year), 0, 1),
      lte: new Date(Number(year), 11, 31, 23, 59, 59),
    }
  }

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(expenses)
}

export async function POST(req: NextRequest) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const expense = await prisma.expense.create({
    data: {
      category: body.category,
      description: body.description,
      amount: parseFloat(body.amount),
      date: body.date ? new Date(body.date) : new Date(),
      notes: body.notes || null,
    },
  })
  return NextResponse.json(expense)
}
