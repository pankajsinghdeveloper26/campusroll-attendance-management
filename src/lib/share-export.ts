/**
 * Cross-platform file delivery for exports.
 *
 * Mobile (Android/iOS): uses the Web Share API with a real File object so the
 * user can save straight to device storage, Drive, WhatsApp, etc.
 * Desktop: falls back to a dynamically created <a download> link.
 */

export type DeliveryResult = "shared" | "downloaded"

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.rel = "noopener"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

function isMobile() {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent || ""
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua)
}

/** Shares (mobile) or downloads (desktop) the given blob. */
export async function deliverFile(
  blob: Blob,
  filename: string,
  opts: { title?: string; text?: string } = {},
): Promise<DeliveryResult> {
  if (typeof window === "undefined") return "downloaded"

  const file = new File([blob], filename, { type: blob.type || "application/octet-stream" })
  const canShare =
    isMobile() &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })

  if (canShare) {
    try {
      await navigator.share({
        files: [file],
        title: opts.title ?? filename,
        text: opts.text ?? "CampusRoll attendance export",
      })
      return "shared"
    } catch (err) {
      // User cancelled the share sheet — don't force a download on top of it.
      if (err instanceof DOMException && err.name === "AbortError") return "shared"
      // Anything else: fall through to the download fallback.
    }
  }

  downloadBlob(blob, filename)
  return "downloaded"
}
