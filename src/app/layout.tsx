import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Calitor | מערכת ניהול עסק ותורים',
  description: 'מערכת ניהול מקצועית לעסקים ועוסקים זעירים — תורים, לקוחות וקבלות',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className="h-full">
      <body className="min-h-full bg-brand-50">{children}</body>
    </html>
  )
}
