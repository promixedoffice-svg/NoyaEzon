'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ChevronRight, ChevronLeft } from 'lucide-react'

interface GalleryImg { id: string; order: number }

const MAX_IMAGES = 9
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_FILE_BYTES = 8 * 1024 * 1024
const TARGET_SIZE = 1000

function cropToSquare(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const size = Math.min(img.width, img.height)
      const sx = (img.width - size) / 2
      const sy = (img.height - size) / 2
      const canvas = document.createElement('canvas')
      canvas.width = TARGET_SIZE
      canvas.height = TARGET_SIZE
      const ctx = canvas.getContext('2d')
      URL.revokeObjectURL(url)
      if (!ctx) { reject(new Error('canvas not supported')); return }
      ctx.drawImage(img, sx, sy, size, size, 0, 0, TARGET_SIZE, TARGET_SIZE)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => reject(new Error('image load failed'))
    img.src = url
  })
}

export function GallerySettings({ images }: { images: GalleryImg[] }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const sorted = [...images].sort((a, b) => a.order - b.order)
  const slots = Array.from({ length: MAX_IMAGES }, (_, i) => sorted[i] ?? null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('יש להעלות קובץ תמונה בפורמט PNG, JPG או WEBP')
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setError('גודל הקובץ חייב להיות עד 8MB')
      return
    }
    setLoading(true)
    try {
      const dataUrl = await cropToSquare(file)
      const res = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'שגיאה בהעלאת התמונה')
      } else {
        router.refresh()
      }
    } catch {
      setError('שגיאה בעיבוד התמונה')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    setLoading(true)
    await fetch(`/api/gallery/${id}`, { method: 'DELETE' })
    setLoading(false)
    router.refresh()
  }

  async function handleMove(id: string, direction: 'up' | 'down') {
    setLoading(true)
    await fetch(`/api/gallery/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {slots.map((img, i) => (
          <div key={img?.id ?? `empty-${i}`} className="relative aspect-square rounded-xl overflow-hidden border border-brand-200 bg-brand-50">
            {img ? (
              <>
                <img src={`/api/gallery/${img.id}`} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleDelete(img.id)}
                  disabled={loading}
                  className="absolute top-1 left-1 p-1.5 rounded-lg bg-black/50 text-white hover:bg-red-500/80 transition"
                >
                  <Trash2 size={13} />
                </button>
                <div className="absolute bottom-1 inset-x-1 flex justify-between">
                  <button
                    type="button"
                    onClick={() => handleMove(img.id, 'down')}
                    disabled={loading || i === sorted.length - 1}
                    className="p-1.5 rounded-lg bg-black/50 text-white disabled:opacity-30 hover:bg-black/70 transition"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(img.id, 'up')}
                    disabled={loading || i === 0}
                    className="p-1.5 rounded-lg bg-black/50 text-white disabled:opacity-30 hover:bg-black/70 transition"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              </>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer text-brand-400 hover:bg-brand-100 transition">
                <Plus size={20} />
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileChange} className="hidden" disabled={loading || sorted.length >= MAX_IMAGES} />
              </label>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted">JPG / PNG / WEBP · עד {MAX_IMAGES} תמונות · התמונות יחתכו אוטומטית לריבוע</p>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
