import Link from "next/link"
import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/runs", label: "Runs" },
  { href: "/runs/new", label: "New Run" },
  { href: "/tasks", label: "Tasks" },
]

export function SiteShell({
  title,
  eyebrow = "Mosaic",
  description,
  actions,
  children,
}: {
  title: string
  eyebrow?: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.16),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),_transparent_28%),linear-gradient(180deg,_#070b12_0%,_#0b1220_48%,_#0f172a_100%)] text-zinc-50">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:44px_44px] opacity-20" />
      <header className="relative z-10 border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 text-sm font-semibold text-emerald-200">
                M
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.35em] text-emerald-200/80">
                  {eyebrow}
                </div>
                <h1 className="text-xl font-semibold tracking-tight text-white">
                  {title}
                </h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {navItems.map((item) => (
                <Button
                  key={item.href}
                  asChild
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "border border-transparent bg-white/0 text-zinc-200 hover:border-white/10 hover:bg-white/5",
                  )}
                >
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              {description ? (
                <p className="max-w-3xl text-sm leading-6 text-zinc-300">
                  {description}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-white/10 text-zinc-100">
                  Drizzle + SQLite
                </Badge>
                <Badge variant="secondary" className="bg-white/10 text-zinc-100">
                  Bun workflow
                </Badge>
                <Badge variant="secondary" className="bg-white/10 text-zinc-100">
                  Proxy-task MVP
                </Badge>
              </div>
            </div>
            {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
          </div>
        </div>
      </header>
      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  )
}
