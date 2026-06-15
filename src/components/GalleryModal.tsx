'use client'

import { useState, useRef } from 'react'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'

const SWIPE_THRESHOLD = 40

export function GalleryModal({ imageIds, onClose, initialIndex = 0 }: { imageIds: string[]; onClose: () => void; initialIndex?: number }) {
  const [index, setIndex] = useState(initialIndex)
  const touchStartX = useRef<number | null>(null)

  function goTo(delta: number) {
    setIndex(prev => (prev + delta + imageIds.length) % imageIds.length)
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      // Swipe right (dx > 0) -> previous image, swipe left -> next image
      goTo(dx > 0 ? -1 : 1)
    }
    touchStartX.current = null
  }

  if (imageIds.length === 0) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 left-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
      >
        <X size={22} />
      </button>

      <img
        src={`/api/gallery/${imageIds[index]}`}
        alt=""
        className="max-h-[85vh] max-w-[90vw] object-contain"
        onClick={e => e.stopPropagation()}
      />

      {imageIds.length > 1 && (
        <>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); goTo(-1) }}
            className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
          >
            <ChevronRight size={26} />
          </button>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); goTo(1) }}
            className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
          >
            <ChevronLeft size={26} />
          </button>

          <div className="absolute bottom-5 inset-x-0 flex justify-center gap-2">
            {imageIds.map((id, i) => (
              <span
                key={id}
                className={`w-2 h-2 rounded-full transition ${i === index ? 'bg-white' : 'bg-white/30'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
