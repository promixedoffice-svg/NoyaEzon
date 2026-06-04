import { useState, useEffect } from 'react'

interface BusinessSettings {
  businessName: string
  ownerName: string
  phone: string
}

const cache: { data: BusinessSettings | null } = { data: null }

export function useBusinessSettings() {
  const [settings, setSettings] = useState<BusinessSettings>(
    cache.data ?? { businessName: 'הסטודיו', ownerName: '', phone: '' }
  )

  useEffect(() => {
    if (cache.data) { setSettings(cache.data); return }
    fetch('/api/settings/business')
      .then(r => r.json())
      .then(data => { cache.data = data; setSettings(data) })
      .catch(() => {})
  }, [])

  return settings
}

export function buildWhatsAppMessage({
  clientFirstName,
  type,
  treatmentName,
  date,
  time,
  amount,
  receiptNumber,
  businessName,
  ownerName,
}: {
  clientFirstName: string
  type: 'receipt' | 'appointment' | 'reminder'
  treatmentName?: string
  date?: string
  time?: string
  amount?: string
  receiptNumber?: number
  businessName: string
  ownerName: string
}) {
  const signature = ownerName ? `${ownerName} | ${businessName} 💅` : `${businessName} 💅`

  if (type === 'receipt') {
    return [
      `שלום ${clientFirstName}! 🌸`,
      ``,
      `מחכה לראות אותך שוב ✨`,
      ``,
      `📋 קבלה #${receiptNumber}`,
      treatmentName ? `✂️ ${treatmentName}` : '',
      amount ? `💰 ${amount}` : '',
      ``,
      `תמיד שמחה לראות אותך! 💕`,
      signature,
    ].filter(l => l !== '').join('\n')
  }

  if (type === 'appointment') {
    return [
      `שלום ${clientFirstName}! 🌸`,
      ``,
      `התור שלך אושר ✅`,
      date ? `📅 ${date}` : '',
      time ? `🕐 ${time}` : '',
      treatmentName ? `✂️ ${treatmentName}` : '',
      amount ? `💰 ${amount}` : '',
      ``,
      `מחכה לראות אותך! 💅`,
      signature,
    ].filter(l => l !== '').join('\n')
  }

  if (type === 'reminder') {
    return [
      `היי ${clientFirstName}! 😊`,
      ``,
      `רק מזכירה — יש לך תור מחר ⏰`,
      date ? `📅 ${date}` : '',
      time ? `🕐 ${time}` : '',
      treatmentName ? `✂️ ${treatmentName}` : '',
      ``,
      `מחכה לראות אותך! 💅`,
      signature,
    ].filter(l => l !== '').join('\n')
  }

  return `שלום ${clientFirstName}! 💅\n${signature}`
}

export function getFirstName(fullName: string) {
  return fullName.split(' ')[0]
}
