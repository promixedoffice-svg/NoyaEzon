'use client'

import { useState, useEffect, useRef } from 'react'
import { format, isPast, isToday, isTomorrow, differenceInMinutes } from 'date-fns'
import { he } from 'date-fns/locale'
import { Plus, Trash2, RotateCcw, X, Check, CheckSquare, Square, Clock, Pencil, Trash, AlertTriangle, ChevronDown } from 'lucide-react'

export interface Task {
  id: string
  title: string
  description: string | null
  dueAt: string | null
  completedAt: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

interface Props {
  initialTasks: Task[]
  initialDeleted: Task[]
  reminderMinutes: number
}

function formatDue(isoStr: string | null): { label: string; urgent: boolean; past: boolean } {
  if (!isoStr) return { label: '', urgent: false, past: false }
  const d = new Date(isoStr)
  const past = isPast(d)
  const urgent = !past && differenceInMinutes(d, new Date()) <= 60
  let label = ''
  if (isToday(d)) label = `היום ${format(d, 'HH:mm')}`
  else if (isTomorrow(d)) label = `מחר ${format(d, 'HH:mm')}`
  else label = format(d, 'EEEE d MMM HH:mm', { locale: he })
  return { label, urgent, past }
}

export function TasksPageClient({ initialTasks, initialDeleted, reminderMinutes }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [deleted, setDeleted] = useState<Task[]>(initialDeleted)
  const [tab, setTab] = useState<'active' | 'bin'>('active')
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', dueTime: '' })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const notifiedRef = useRef<Set<string>>(new Set())

  // ── Browser notifications ─────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    // Load already-notified ids from localStorage
    try {
      const saved = JSON.parse(localStorage.getItem('task_notified') ?? '[]')
      notifiedRef.current = new Set(saved)
    } catch {}

    function check() {
      const now = new Date()
      tasks.forEach(task => {
        if (!task.dueAt || task.completedAt || notifiedRef.current.has(task.id)) return
        const due = new Date(task.dueAt)
        const minsLeft = differenceInMinutes(due, now)
        if (minsLeft <= reminderMinutes && minsLeft >= -5) {
          notifiedRef.current.add(task.id)
          localStorage.setItem('task_notified', JSON.stringify([...notifiedRef.current]))
          if (localStorage.getItem('notifications_paused') !== '1') {
            new Notification('💅 משימה לביצוע', {
              body: minsLeft <= 0 ? `⏰ "${task.title}" — פג המועד!` : `"${task.title}" — עוד ${minsLeft} דקות`,
              icon: '/favicon.ico',
            })
          }
        }
      })
    }

    check()
    const id = setInterval(check, 60000)
    return () => clearInterval(id)
  }, [tasks, reminderMinutes])

  // ── Form helpers ──────────────────────────────────────
  function openAdd() {
    setEditingTask(null)
    setForm({ title: '', description: '', dueDate: '', dueTime: '' })
    setShowForm(true)
  }

  function openEdit(t: Task) {
    setEditingTask(t)
    const due = t.dueAt ? new Date(t.dueAt) : null
    setForm({
      title: t.title,
      description: t.description ?? '',
      dueDate: due ? format(due, 'yyyy-MM-dd') : '',
      dueTime: due ? format(due, 'HH:mm') : '',
    })
    setShowForm(true)
  }

  function buildDueAt(): string | null {
    if (!form.dueDate) return null
    const time = form.dueTime || '00:00'
    return new Date(`${form.dueDate}T${time}:00`).toISOString()
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    const body = { title: form.title.trim(), description: form.description.trim() || null, dueAt: buildDueAt() }

    if (editingTask) {
      const res = await fetch(`/api/tasks/${editingTask.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const updated: Task = await res.json()
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
    } else {
      const res = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const created: Task = await res.json()
      setTasks(prev => [created, ...prev])
    }
    setSaving(false)
    setShowForm(false)
  }

  async function toggleComplete(task: Task) {
    const completedAt = task.completedAt ? null : new Date().toISOString()
    const res = await fetch(`/api/tasks/${task.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ completedAt }) })
    const updated: Task = await res.json()
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
  }

  async function softDelete(task: Task) {
    setDeletingId(task.id)
    const res = await fetch(`/api/tasks/${task.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deletedAt: new Date().toISOString() }) })
    const updated: Task = await res.json()
    setTasks(prev => prev.filter(t => t.id !== task.id))
    setDeleted(prev => [updated, ...prev])
    setDeletingId(null)
  }

  async function restore(task: Task) {
    setDeletingId(task.id)
    const res = await fetch(`/api/tasks/${task.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deletedAt: null }) })
    const updated: Task = await res.json()
    setDeleted(prev => prev.filter(t => t.id !== task.id))
    setTasks(prev => [updated, ...prev])
    setDeletingId(null)
  }

  async function hardDelete(task: Task) {
    setDeletingId(task.id)
    await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
    setDeleted(prev => prev.filter(t => t.id !== task.id))
    setDeletingId(null)
  }

  // ── Sorted lists ──────────────────────────────────────
  const pending   = tasks.filter(t => !t.completedAt)
  const completed = tasks.filter(t =>  t.completedAt)

  const inputClass = "w-full px-4 py-3 rounded-xl border border-brand-200 bg-brand-50 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition touch-manipulation"
  const labelClass = "block text-sm font-medium text-brand-800 mb-1.5"

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-brand-900">משימות</h1>
        {tab === 'active' && (
          <button onClick={openAdd} className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-medium px-4 py-2.5 rounded-xl transition touch-manipulation text-sm">
            <Plus size={16} /> משימה חדשה
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-brand-50 p-1 rounded-xl">
        <button onClick={() => setTab('active')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition touch-manipulation ${tab === 'active' ? 'bg-white text-brand-900 shadow-sm' : 'text-muted hover:text-brand-700'}`}>
          פעילות {pending.length > 0 && <span className="ml-1 bg-brand-500 text-white text-xs rounded-full px-1.5 py-0.5">{pending.length}</span>}
        </button>
        <button onClick={() => setTab('bin')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition touch-manipulation flex items-center justify-center gap-1.5 ${tab === 'bin' ? 'bg-white text-brand-900 shadow-sm' : 'text-muted hover:text-brand-700'}`}>
          <Trash size={13} /> סל מחזור {deleted.length > 0 && <span className="bg-gray-400 text-white text-xs rounded-full px-1.5 py-0.5">{deleted.length}</span>}
        </button>
      </div>

      {/* ── Active tab ── */}
      {tab === 'active' && (
        <div className="space-y-3">
          {pending.length === 0 && completed.length === 0 && (
            <div className="text-center py-16 text-muted">
              <CheckSquare size={36} className="mx-auto mb-3 opacity-20" />
              <p className="font-medium">אין משימות</p>
              <p className="text-xs mt-1">לחצי על "משימה חדשה" להתחיל</p>
            </div>
          )}

          {/* Pending tasks */}
          {pending.map(task => {
            const due = formatDue(task.dueAt)
            return (
              <div key={task.id} className={`bg-white rounded-2xl border shadow-sm p-4 transition ${due.past ? 'border-red-200 bg-red-50/30' : due.urgent ? 'border-amber-200 bg-amber-50/30' : 'border-brand-100'}`}>
                <div className="flex items-start gap-3">
                  <button onClick={() => toggleComplete(task)} className="mt-0.5 shrink-0 touch-manipulation text-muted hover:text-brand-500 transition">
                    <Square size={20} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-brand-900 leading-snug">{task.title}</p>
                    {task.description && <p className="text-sm text-muted mt-0.5 leading-snug">{task.description}</p>}
                    {due.label && (
                      <p className={`text-xs mt-1.5 flex items-center gap-1 font-medium ${due.past ? 'text-red-500' : due.urgent ? 'text-amber-600' : 'text-brand-500'}`}>
                        {due.past ? <AlertTriangle size={11} /> : <Clock size={11} />}
                        {due.label}{due.past ? ' — פג המועד' : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(task)} className="p-1.5 rounded-lg hover:bg-brand-50 text-muted hover:text-brand-600 transition touch-manipulation"><Pencil size={14} /></button>
                    <button onClick={() => softDelete(task)} disabled={deletingId === task.id} className="p-1.5 rounded-lg hover:bg-red-50 text-muted hover:text-red-500 disabled:opacity-40 transition touch-manipulation"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Completed tasks */}
          {completed.length > 0 && (
            <details className="group">
              <summary className="flex items-center gap-2 text-sm text-muted cursor-pointer select-none py-1 touch-manipulation list-none">
                <ChevronDown size={14} className="group-open:rotate-180 transition-transform" />
                הושלמו ({completed.length})
              </summary>
              <div className="mt-2 space-y-2">
                {completed.map(task => (
                  <div key={task.id} className="bg-white rounded-2xl border border-brand-50 shadow-sm p-4 opacity-60">
                    <div className="flex items-start gap-3">
                      <button onClick={() => toggleComplete(task)} className="mt-0.5 shrink-0 touch-manipulation text-brand-400 hover:text-muted transition">
                        <CheckSquare size={20} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-brand-700 line-through leading-snug">{task.title}</p>
                        {task.description && <p className="text-xs text-muted mt-0.5">{task.description}</p>}
                      </div>
                      <button onClick={() => softDelete(task)} disabled={deletingId === task.id} className="p-1.5 rounded-lg hover:bg-red-50 text-muted hover:text-red-500 disabled:opacity-40 transition touch-manipulation"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* ── Recycle bin tab ── */}
      {tab === 'bin' && (
        <div className="space-y-3">
          {deleted.length === 0 ? (
            <div className="text-center py-16 text-muted">
              <Trash size={36} className="mx-auto mb-3 opacity-20" />
              <p className="font-medium">סל המחזור ריק</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted">פריטים בסל המחזור ניתנים לשחזור או למחיקה סופית</p>
              {deleted.map(task => (
                <div key={task.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-600 leading-snug">{task.title}</p>
                      {task.description && <p className="text-xs text-muted mt-0.5">{task.description}</p>}
                      <p className="text-xs text-muted mt-1">נמחק {format(new Date(task.deletedAt!), 'd MMM HH:mm', { locale: he })}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => restore(task)} disabled={deletingId === task.id} className="flex items-center gap-1 text-xs bg-brand-50 hover:bg-brand-100 text-brand-700 px-3 py-2 rounded-xl transition disabled:opacity-40 touch-manipulation font-medium">
                        <RotateCcw size={12} /> שחזור
                      </button>
                      <button onClick={() => hardDelete(task)} disabled={deletingId === task.id} className="p-2 rounded-xl hover:bg-red-50 text-muted hover:text-red-500 disabled:opacity-40 transition touch-manipulation">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Add/Edit modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="sm:hidden flex justify-center -mt-2 mb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-brand-900 text-lg">{editingTask ? 'עריכת משימה' : 'משימה חדשה'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-brand-50 text-muted touch-manipulation"><X size={18} /></button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className={labelClass}>כותרת *</label>
                <input autoFocus required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputClass} placeholder="למה צריך לטפל?" />
              </div>
              <div>
                <label className={labelClass}>פירוט (אופציונלי)</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className={inputClass} placeholder="הערות נוספות..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>תאריך יעד</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} className={inputClass} dir="ltr" />
                </div>
                <div>
                  <label className={labelClass}>שעה</label>
                  <input type="time" value={form.dueTime} onChange={e => setForm(p => ({ ...p, dueTime: e.target.value }))} className={inputClass} dir="ltr" disabled={!form.dueDate} />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={saving} className="flex-1 py-3.5 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 disabled:bg-brand-300 text-white font-semibold rounded-xl transition touch-manipulation text-base">
                  {saving ? 'שומרת...' : editingTask ? 'שמרי שינויים' : 'הוספת משימה'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-3.5 border border-brand-200 text-brand-700 hover:bg-brand-50 rounded-xl transition touch-manipulation font-medium">
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
