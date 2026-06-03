import { ClientForm } from '@/components/admin/ClientForm'

export default function NewClientPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-brand-900 mb-6">לקוחה חדשה</h1>
      <ClientForm />
    </div>
  )
}
