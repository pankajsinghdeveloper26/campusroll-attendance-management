import { useEffect, useRef, useState } from "react"
import jsQR from "jsqr"
import { Camera, CameraOff, Loader2 } from "lucide-react"

type ScanState = "starting" | "scanning" | "denied" | "unsupported" | "error"

/**
 * Rear-camera QR scanner. Frames are decoded on-device with jsQR — nothing
 * is uploaded anywhere.
 */
export function QrScanner({
  onResult,
  paused = false,
}: {
  onResult: (value: string) => void
  paused?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<ScanState>("starting")
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  const resultRef = useRef(onResult)
  resultRef.current = onResult

  useEffect(() => {
    let stream: MediaStream | null = null
    let raf = 0
    let stopped = false

    async function start() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setState("unsupported")
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        })
      } catch (err) {
        const name = err instanceof DOMException ? err.name : ""
        setState(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "error")
        return
      }
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      video.setAttribute("playsinline", "true")
      try {
        await video.play()
      } catch {
        // autoplay blocked; the poster/controls-free video still renders frames
      }
      setState("scanning")
      tick()
    }

    function tick() {
      if (stopped) return
      raf = requestAnimationFrame(tick)
      if (pausedRef.current) return
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) return
      const w = Math.min(video.videoWidth, 480)
      if (!w) return
      const h = Math.round((video.videoHeight / video.videoWidth) * w)
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext("2d", { willReadFrequently: true })
      if (!ctx) return
      ctx.drawImage(video, 0, 0, w, h)
      const image = ctx.getImageData(0, 0, w, h)
      const found = jsQR(image.data, w, h, { inversionAttempts: "dontInvert" })
      if (found?.data) resultRef.current(found.data)
    }

    void start()
    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-900 ring-1 ring-slate-800">
      <video ref={videoRef} muted playsInline className="h-56 w-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Framing guide */}
      {state === "scanning" ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-36 w-36 rounded-2xl border-2 border-emerald-400/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.35)]" />
        </div>
      ) : null}

      {state !== "scanning" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/90 px-6 text-center">
          {state === "starting" ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
              <p className="text-sm font-semibold text-slate-200">Starting camera…</p>
            </>
          ) : (
            <>
              {state === "denied" ? (
                <CameraOff className="h-6 w-6 text-amber-400" />
              ) : (
                <Camera className="h-6 w-6 text-slate-400" />
              )}
              <p className="text-sm font-semibold text-slate-200">
                {state === "denied"
                  ? "Camera permission blocked"
                  : state === "unsupported"
                    ? "Camera not available on this device"
                    : "Camera couldn't start"}
              </p>
              <p className="text-xs leading-relaxed text-slate-400">
                Allow camera access in your browser settings, or type the session code manually below.
              </p>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
