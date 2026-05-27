"use client"

import { useState, useRef } from "react"
import { X, Loader2 } from "lucide-react"

export type ImageCropperProps = {
  src: string
  fileName: string
  onCrop: (croppedBlob: Blob) => void
  onCancel: () => void
  circular?: boolean
}

export function ImageCropper({ src, onCrop, onCancel, circular = true }: ImageCropperProps) {
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [processing, setProcessing] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    const target = e.target as HTMLElement
    target.setPointerCapture(e.pointerId)
    setIsDragging(true)
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handlePointerUp = () => {
    setIsDragging(false)
  }

  const handlePerformCrop = async () => {
    setProcessing(true)
    try {
      const img = new Image()
      img.src = src
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
      })

      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Could not create canvas context")

      const size = 512
      canvas.width = size
      canvas.height = size

      const boxSize = 256
      const imgAspect = img.width / img.height
      let renderW = boxSize
      let renderH = boxSize

      if (imgAspect > 1) {
        renderH = boxSize / imgAspect
      } else {
        renderW = boxSize * imgAspect
      }

      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, size, size)

      const scaleFactor = size / boxSize
      const dx = (boxSize / 2 + offset.x - (renderW * zoom) / 2) * scaleFactor
      const dy = (boxSize / 2 + offset.y - (renderH * zoom) / 2) * scaleFactor
      const dw = renderW * zoom * scaleFactor
      const dh = renderH * zoom * scaleFactor

      ctx.drawImage(img, dx, dy, dw, dh)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            onCrop(blob)
          } else {
            console.error("Canvas toBlob returned null")
          }
          setProcessing(false)
        },
        "image/jpeg",
        0.9
      )
    } catch (err) {
      console.error("[ImageCropper] Error cropping:", err)
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur- p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-md max-w-sm w-full p-6 shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between w-full mb-5">
          <h3 className="font-display font-extrabold text-lg text-foreground">Crop Photo</h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-muted hover:text-foreground transition-colors p-1 rounded-lg hover:bg-subtle"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Viewport Container */}
        <div
          ref={containerRef}
          className="relative w-64 h-64 overflow-hidden bg-neutral-900 border border-default rounded-xl flex items-center justify-center"
        >
          {/* Avatar circle guide */}
          {/* Avatar circle/square guide */}
          {circular ? (
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/60 pointer-events-none z-10 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
          ) : (
            <div className="absolute inset-0 rounded-md border-2 border-dashed border-white/60 pointer-events-none z-10 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
          )}

          {/* Scaled/Panned Preview Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="Preview"
            draggable={false}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              transformOrigin: "center center",
            }}
            className="absolute max-w-none w-full h-full object-contain cursor-move select-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        </div>

        {/* Zoom Slider */}
        <div className="flex items-center gap-3 w-full mt-5 px-2">
          <span className="text-xs font-semibold text-secondary shrink-0">Zoom</span>
          <input
            type="range"
            min="1"
            max="3"
            step="0.02"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="flex-1 h-1.5 bg-subtle rounded-lg appearance-none cursor-pointer accent-primary"
          />
        </div>
        <p className="text-[11px] text-muted text-center mt-2">
          Drag image to position it inside the {circular ? "circle" : "square"}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 w-full mt-6 border-t border-default pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="rounded-xl border border-default bg-white px-4 py-2.5 text-sm font-semibold text-secondary hover:bg-subtle transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePerformCrop}
            disabled={processing}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50"
          >
            {processing && <Loader2 className="size-4 animate-spin" />}
            Crop &amp; Upload
          </button>
        </div>
      </div>
    </div>
  )
}
