'use client'

import { useState, useRef, useEffect } from 'react'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'

const SWIPE_THRESHOLD = 40

interface GalleryImg { id: string; caption: string | null }

export function GalleryModal({ images, onClose, initialIndex = 0 }: { images: GalleryImg[]; onClose: () => void; initialIndex?: number }) {
  const [index, setIndex] = useState(initialIndex)
  const touchStartX = useRef<number | null>(null)
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([])

  function goTo(delta: number) {
    setIndex(prev => (prev + delta + images.length) % images.length)
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

  useEffect(() => {
    thumbRefs.current[index]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [index])

  if (images.length === 0) return null

  const current = images[index]

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onClick={onClose}>
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 left-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
      >
        <X size={22} />
      </button>

      <div
        className="flex-1 min-h-0 flex flex-col items-center justify-center relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={`/api/gallery/${current.id}`}
          alt=""
          className="max-h-full max-w-[90vw] object-contain"
          onClick={e => e.stopPropagation()}
        />

        {current.caption && (
          <p className="text-white/90 text-sm text-center mt-3 px-6 max-w-md" onClick={e => e.stopPropagation()}>
            {current.caption}
          </p>
        )}

        {images.length > 1 && (
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
          </>
        )}
      </div>

      {images.length > 1 && (
        <div
          className="flex gap-2 overflow-x-auto px-4 py-3 shrink-0"
          onClick={e => e.stopPropagation()}
        >
          {images.map((img, i) => (
            <button
              key={img.id}
              ref={el => { thumbRefs.current[i] = el }}
              type="button"
              onClick={() => setIndex(i)}
              className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition ${i === index ? 'border-white' : 'border-transparent opacity-50'}`}
            >
              <img src={`/api/gallery/${img.id}`} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
