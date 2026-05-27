"use client"

import { useState, useRef } from "react"
import { Loader2, ZoomIn, ZoomOut } from "lucide-react"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

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
      y: e.clientY - dragStart.y,
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
    <Dialog open onClose={onCancel} title="Crop Photo">
      <div className="flex flex-col items-center gap-4">

        {/* Viewport */}
        <div
          ref={containerRef}
          className="relative w-64 h-64 overflow-hidden bg-neutral-900 rounded-xl border border-border flex items-center justify-center"
        >
          {circular ? (
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/60 pointer-events-none z-10 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
          ) : (
            <div className="absolute inset-0 rounded-md border-2 border-dashed border-white/60 pointer-events-none z-10 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
          )}

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

        {/* Zoom Controls */}
        <div className="w-full px-1 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Zoom</Label>
            <span className="text-xs tabular-nums text-muted-foreground">
              {zoom.toFixed(2)}×
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))}
              disabled={zoom <= 1}
            >
              <ZoomOut className="size-3.5" />
            </Button>
            <Slider
              min={1}
              max={3}
              step={0.02}
              value={[zoom]}
              onValueChange={([val]) => setZoom(val)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
              disabled={zoom >= 3}
            >
              <ZoomIn className="size-3.5" />
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground text-center pt-0.5">
            Drag to reposition inside the {circular ? "circle" : "square"}
          </p>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex items-center gap-3 w-full">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={processing}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handlePerformCrop}
            disabled={processing}
            className="flex-1 gap-2"
          >
            {processing && <Loader2 className="size-4 animate-spin" />}
            Crop &amp; Upload
          </Button>
        </div>

      </div>
    </Dialog>
  )
}