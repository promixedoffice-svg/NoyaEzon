import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const client = await prisma.client.create({
    data: {
      fullName: body.fullName,
      phone: body.phone || null,
      email: body.email || null,
      city: body.city || null,
      address: body.address || null,
      notes: body.notes || null,
      preferences: body.preferences || null,
      sensitivities: body.sensitivities || null,
      status: body.status ?? 'new',
    },
  })
  return NextResponse.json(client)
}
