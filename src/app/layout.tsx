import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NoyaGayaEzon | סטודיו לציפורניים',
  description: 'מערכת ניהול מקצועית לסטודיו לק ג׳ל וציפורניים',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className="h-full">
      <body className="min-h-full bg-brand-50">{children}</body>
    </html>
  )
}
