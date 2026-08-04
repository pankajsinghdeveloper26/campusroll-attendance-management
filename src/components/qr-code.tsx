import { useEffect, useState } from "react"
import QRCode from "qrcode"

/**
 * Real, scannable QR code rendered as inline SVG with a proper quiet zone
 * and high error correction so it reads well off phone screens.
 */
export function QrCode({
  value,
  size = 232,
  className = "",
}: {
  value: string
  size?: number
  className?: string
}) {
  const [svg, setSvg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    QRCode.toString(value, {
      type: "svg",
      errorCorrectionLevel: "H",
      margin: 3,
      width: size,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((out) => {
        if (!cancelled) setSvg(out)
      })
      .catch(() => {
        if (!cancelled) setSvg(null)
      })
    return () => {
      cancelled = true
    }
  }, [value, size])

  return (
    <div
      className={`overflow-hidden rounded-2xl bg-white ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label="Session check-in QR code"
      // qrcode emits a self-contained SVG string with no scripts or event handlers.
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    >
      {svg ? undefined : (
        <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
          Generating QR…
        </div>
      )}
    </div>
  )
}
