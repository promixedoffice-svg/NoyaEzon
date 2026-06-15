import { ImageResponse } from 'next/og'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const size = { width: 64, height: 64 }
export const contentType = 'image/png'

export default async function Icon() {
  const settings = await prisma.businessSettings.findFirst({ select: { logoUrl: true } })

  if (settings?.logoUrl) {
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={settings.logoUrl} width={size.width} height={size.height} style={{ objectFit: 'contain' }} />
        </div>
      ),
      { ...size }
    )
  }

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>
        💅
      </div>
    ),
    { ...size }
  )
}
