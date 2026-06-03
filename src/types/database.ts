export type ClientStatus = 'new' | 'active' | 'inactive' | 'debt'
export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
export type PaymentStatus = 'paid' | 'partial' | 'unpaid'
export type PaymentMethod = 'cash' | 'bit' | 'paybox' | 'credit' | 'transfer' | 'check'
export type DebtStatus = 'open' | 'partial' | 'closed'
export type ReceiptStatus = 'active' | 'cancelled'
export type DayOfWeek = '0' | '1' | '2' | '3' | '4' | '5' | '6'

export interface BusinessSettings {
  id: string
  owner_id: string
  business_name: string
  owner_name: string | null
  business_number: string | null
  phone: string | null
  email: string | null
  address: string | null
  logo_url: string | null
  receipt_starting_number: number
  receipt_footer_text: string | null
  created_at: string
  updated_at: string
}

export interface Treatment {
  id: string
  owner_id: string
  name: string
  description: string | null
  default_price: number
  duration_minutes: number
  buffer_minutes: number
  is_active: boolean
  color: string
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  owner_id: string
  full_name: string
  phone: string | null
  email: string | null
  city: string | null
  address: string | null
  notes: string | null
  preferences: string | null
  sensitivities: string | null
  status: ClientStatus
  card_opened_at: string
  created_at: string
  updated_at: string
}

export interface WorkHours {
  id: string
  owner_id: string
  day_of_week: DayOfWeek
  is_working: boolean
  start_time: string
  end_time: string
}

export interface Break {
  id: string
  owner_id: string
  day_of_week: DayOfWeek | null
  start_time: string
  end_time: string
  label: string
  is_recurring: boolean
}

export interface BlockedTime {
  id: string
  owner_id: string
  start_at: string
  end_at: string
  reason: string | null
  is_vacation: boolean
}

export interface AvailabilitySettings {
  id: string
  owner_id: string
  min_booking_hours: number
  max_appointments_per_day: number | null
  slot_interval_minutes: number
}

export interface Appointment {
  id: string
  owner_id: string
  client_id: string | null
  treatment_id: string | null
  guest_name: string | null
  guest_phone: string | null
  guest_email: string | null
  start_at: string
  end_at: string
  price: number | null
  notes: string | null
  status: AppointmentStatus
  cancelled_reason: string | null
  cancelled_at: string | null
  confirmed_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface Visit {
  id: string
  owner_id: string
  client_id: string
  appointment_id: string | null
  treatment_id: string | null
  treatment_name: string
  visited_at: string
  price: number
  notes: string | null
  payment_status: PaymentStatus
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  owner_id: string
  client_id: string
  visit_id: string | null
  amount: number
  method: PaymentMethod
  reference: string | null
  notes: string | null
  paid_at: string
  created_at: string
}

export interface Debt {
  id: string
  owner_id: string
  client_id: string
  visit_id: string | null
  original_amount: number
  paid_amount: number
  status: DebtStatus
  notes: string | null
  reminder_at: string | null
  created_at: string
  updated_at: string
}

export interface Receipt {
  id: string
  owner_id: string
  client_id: string
  visit_id: string | null
  payment_id: string | null
  receipt_number: number
  amount: number
  method: PaymentMethod
  service_description: string
  client_name: string
  status: ReceiptStatus
  cancelled_at: string | null
  cancellation_reason: string | null
  issued_at: string
  created_at: string
}

// Supabase-compatible Database type
export type Database = {
  public: {
    Tables: {
      business_settings: {
        Row: BusinessSettings
        Insert: Omit<BusinessSettings, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<BusinessSettings, 'id'>>
      }
      treatments: {
        Row: Treatment
        Insert: Omit<Treatment, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<Treatment, 'id'>>
      }
      clients: {
        Row: Client
        Insert: Omit<Client, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string; card_opened_at?: string }
        Update: Partial<Omit<Client, 'id'>>
      }
      work_hours: {
        Row: WorkHours
        Insert: Omit<WorkHours, 'id'> & { id?: string }
        Update: Partial<Omit<WorkHours, 'id'>>
      }
      breaks: {
        Row: Break
        Insert: Omit<Break, 'id'> & { id?: string }
        Update: Partial<Omit<Break, 'id'>>
      }
      blocked_times: {
        Row: BlockedTime
        Insert: Omit<BlockedTime, 'id'> & { id?: string }
        Update: Partial<Omit<BlockedTime, 'id'>>
      }
      availability_settings: {
        Row: AvailabilitySettings
        Insert: Omit<AvailabilitySettings, 'id'> & { id?: string }
        Update: Partial<Omit<AvailabilitySettings, 'id'>>
      }
      appointments: {
        Row: Appointment
        Insert: Omit<Appointment, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<Appointment, 'id'>>
      }
      visits: {
        Row: Visit
        Insert: Omit<Visit, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<Visit, 'id'>>
      }
      payments: {
        Row: Payment
        Insert: Omit<Payment, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<Payment, 'id'>>
      }
      debts: {
        Row: Debt
        Insert: Omit<Debt, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
        Update: Partial<Omit<Debt, 'id'>>
      }
      receipts: {
        Row: Receipt
        Insert: Omit<Receipt, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<Receipt, 'id'>>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
