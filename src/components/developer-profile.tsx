import { Mail, Linkedin, Code2 } from "lucide-react"

export const DEVELOPER = {
  name: "Pankaj Singh",
  email: "pankajsinghdeveloper26@gmail.com",
  linkedin: "https://www.linkedin.com/in/pankaj-singh-053a2a364",
}

/** Developer profile card used in Settings. */
export function DeveloperProfile({ className = "" }: { className?: string }) {
  return (
    <section className={className}>
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-400">Developer</h2>
      <div className="mt-3 rounded-3xl bg-white p-4 ring-1 ring-slate-100">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <Code2 className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-bold text-slate-900">{DEVELOPER.name}</p>
            <p className="text-sm text-slate-400">Developer · CampusRoll</p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <a
            href={`mailto:${DEVELOPER.email}`}
            className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3.5 py-3 transition-transform active:scale-[0.99]"
          >
            <Mail className="h-4 w-4 shrink-0 text-blue-600" />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">{DEVELOPER.email}</span>
          </a>
          <a
            href={DEVELOPER.linkedin}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3.5 py-3 transition-transform active:scale-[0.99]"
          >
            <Linkedin className="h-4 w-4 shrink-0 text-blue-600" />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">
              linkedin.com/in/pankaj-singh-053a2a364
            </span>
          </a>
        </div>
      </div>
    </section>
  )
}
