'use client'

import { useState, useEffect } from 'react'
import { isToday, isPast, format } from 'date-fns'
import { he } from 'date-fns/locale'
import { X, Clock, AlertTriangle, Bell, ListTodo } from 'lucide-react'
import Link from 'next/link'

interface Task { id: string; title: string; dueAt: string | null; completedAt: string | null }

const STORAGE_KEY = 'tasks_banner_snoozed_until'

export function TodayTasksBanner() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Check snooze
    const snoozedUntil = localStorage.getItem(STORAGE_KEY)
    if (snoozedUntil && new Date(snoozedUntil) > new Date()) return

    fetch('/api/tasks')
      .then(r => r.json())
      .then((all: Task[]) => {
        const relevant = all.filter(t => {
          if (t.completedAt || !t.dueAt) return false
          const due = new Date(t.dueAt)
          return isToday(due) || isPast(due)
        })
        if (relevant.length > 0) {
          setTasks(relevant)
          setVisible(true)
        }
      })
      .catch(() => {})
  }, [])

  function dismiss() {
    // Snooze until midnight tonight
    const midnight = new Date()
    midnight.setHours(23, 59, 59, 999)
    localStorage.setItem(STORAGE_KEY, midnight.toISOString())
    setVisible(false)
  }

  function snooze24() {
    localStorage.setItem(STORAGE_KEY, new Date(Date.now() + 24 * 3600_000).toISOString())
    setVisible(false)
  }

  if (!visible || tasks.length === 0) return null

  const overdue  = tasks.filter(t => t.dueAt && isPast(new Date(t.dueAt)) && !isToday(new Date(t.dueAt)))
  const todayDue = tasks.filter(t => t.dueAt && isToday(new Date(t.dueAt)))

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/40"
      onClick={dismiss}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-50">
          <div className="flex items-center gap-2">
            <Bell size={17} className="text-brand-500" />
            <div>
              <h3 className="font-bold text-brand-900 leading-tight">
                {overdue.length > 0
                  ? `${overdue.length} משימות פגו המועד`
                  : `${tasks.length} משימות להיום`}
              </h3>
              <p className="text-xs text-muted mt-0.5">{format(new Date(), 'EEEE, d MMMM', { locale: he })}</p>
            </div>
          </div>
          <button onClick={dismiss} className="p-1.5 rounded-xl hover:bg-brand-50 text-muted touch-manipulation">
            <X size={18} />
          </button>
        </div>

        {/* Task list */}
        <div className="max-h-60 overflow-y-auto">
          {overdue.length > 0 && (
            <div className="px-5 pt-3 pb-1">
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">פגו המועד</p>
            </div>
          )}
          {overdue.map(task => (
            <TaskRow key={task.id} task={task} type="overdue" />
          ))}

          {todayDue.length > 0 && overdue.length > 0 && (
            <div className="px-5 pt-3 pb-1">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">להיום</p>
            </div>
          )}
          {todayDue.map(task => (
            <TaskRow key={task.id} task={task} type="today" />
          ))}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-brand-50 space-y-2.5">
          <Link
            href="/admin/tasks"
            onClick={dismiss}
            className="flex items-center justify-center gap-2 w-full py-3 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold rounded-xl transition touch-manipulation text-sm"
          >
            <ListTodo size={15} /> לדף המשימות
          </Link>
          <div className="flex gap-2">
            <button
              onClick={dismiss}
              className="flex-1 py-2.5 border border-brand-200 text-brand-700 hover:bg-brand-50 active:bg-brand-100 text-sm font-medium rounded-xl transition touch-manipulation"
            >
              סגור
            </button>
            <button
              onClick={snooze24}
              className="flex-1 py-2.5 border border-gray-200 text-gray-500 hover:bg-gray-50 active:bg-gray-100 text-sm font-medium rounded-xl transition touch-manipulation"
            >
              סגור ל-24 שעות
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TaskRow({ task, type }: { task: Task; type: 'overdue' | 'today' }) {
  const due = task.dueAt ? new Date(task.dueAt) : null
  return (
    <div className="flex items-start gap-3 px-5 py-3 border-b border-brand-50 last:border-0">
      <div className={`mt-1.5 shrink-0 w-2 h-2 rounded-full ${type === 'overdue' ? 'bg-red-500' : 'bg-amber-400'}`} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-brand-900 text-sm leading-snug">{task.title}</p>
        {due && (
          <p className={`text-xs mt-0.5 flex items-center gap-1 ${type === 'overdue' ? 'text-red-500' : 'text-amber-600'}`}>
            {type === 'overdue' ? <AlertTriangle size={10} /> : <Clock size={10} />}
            {type === 'overdue'
              ? `פג ${format(due, 'EEEE d/M HH:mm', { locale: he })}`
              : `היום ${format(due, 'HH:mm')}`}
          </p>
        )}
      </div>
    </div>
  )
}
