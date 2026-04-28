import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function MetricCard({
  label,
  value,
  note,
  accent = "from-emerald-400/15 to-cyan-400/10",
}: {
  label: string
  value: string
  note?: string
  accent?: string
}) {
  return (
    <Card className="border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(2,6,23,0.25)] backdrop-blur-xl">
      <div className={`h-1 w-full bg-gradient-to-r ${accent}`} />
      <CardHeader className="space-y-1 px-4 pt-4">
        <CardDescription className="text-zinc-400">{label}</CardDescription>
        <CardTitle className="text-2xl text-white">{value}</CardTitle>
      </CardHeader>
      {note ? (
        <CardContent className="pb-4 text-sm text-zinc-400">{note}</CardContent>
      ) : null}
    </Card>
  )
}
