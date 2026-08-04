import { Mail, Linkedin } from "lucide-react"
import { DEVELOPER } from "@/components/developer-profile"

/**
 * Subtle developer credit shown at the bottom of app screens,
 * with clickable contact links.
 */
export function AppFooterTag({ className = "" }: { className?: string }) {
  return (
    <div className={`text-center ${className}`}>
      <p className="text-[11px] font-medium tracking-wide text-slate-300">
        Developed by {DEVELOPER.name}
      </p>
      <div className="mt-1 flex items-center justify-center gap-3">
        <a
          href={`mailto:${DEVELOPER.email}`}
          aria-label={`Email ${DEVELOPER.name}`}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 transition-colors hover:text-blue-600"
        >
          <Mail className="h-3 w-3" />
          Email
        </a>
        <a
          href={DEVELOPER.linkedin}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={`${DEVELOPER.name} on LinkedIn`}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 transition-colors hover:text-blue-600"
        >
          <Linkedin className="h-3 w-3" />
          LinkedIn
        </a>
      </div>
    </div>
  )
}
