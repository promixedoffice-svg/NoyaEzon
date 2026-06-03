import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { PaymentMethod, AppointmentStatus, ClientStatus, DebtStatus, PaymentStatus } from '@/types/database'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return `${formatDate(date)} ${formatTime(date)}`
}

export function paymentMethodLabel(method: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = {
    cash: 'מזומן',
    bit: 'ביט',
    paybox: 'פייבוקס',
    credit: 'אשראי',
    transfer: 'העברה בנקאית',
    check: 'צ׳ק',
  }
  return labels[method]
}

export function appointmentStatusLabel(status: AppointmentStatus): string {
  const labels: Record<AppointmentStatus, string> = {
    pending: 'ממתין לאישור',
    confirmed: 'מאושר',
    cancelled: 'בוטל',
    completed: 'הסתיים',
    no_show: 'לא הגיעה',
  }
  return labels[status]
}

export function appointmentStatusColor(status: AppointmentStatus): string {
  const colors: Record<AppointmentStatus, string> = {
    pending: 'bg-amber-100 text-amber-800',
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    completed: 'bg-blue-100 text-blue-800',
    no_show: 'bg-gray-100 text-gray-800',
  }
  return colors[status]
}

export function clientStatusLabel(status: ClientStatus): string {
  const labels: Record<ClientStatus, string> = {
    new: 'חדשה',
    active: 'פעילה',
    inactive: 'לא פעילה',
    debt: 'חייבת',
  }
  return labels[status]
}

export function clientStatusColor(status: ClientStatus): string {
  const colors: Record<ClientStatus, string> = {
    new: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    debt: 'bg-red-100 text-red-800',
  }
  return colors[status]
}

export function debtStatusLabel(status: DebtStatus): string {
  const labels: Record<DebtStatus, string> = {
    open: 'פתוח',
    partial: 'שולם חלקית',
    closed: 'סגור',
  }
  return labels[status]
}

export function paymentStatusLabel(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    paid: 'שולם מלא',
    partial: 'שולם חלקית',
    unpaid: 'לא שולם',
  }
  return labels[status]
}

export function dayOfWeekLabel(day: string): string {
  const labels: Record<string, string> = {
    '0': 'ראשון',
    '1': 'שני',
    '2': 'שלישי',
    '3': 'רביעי',
    '4': 'חמישי',
    '5': 'שישי',
    '6': 'שבת',
  }
  return labels[day] ?? day
}

export function getDaysBetween(date1: string | Date, date2: string | Date): number {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const diff = Math.abs(d2.getTime() - d1.getTime())
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}
