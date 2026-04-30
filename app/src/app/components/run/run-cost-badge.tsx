import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/app/lib/format"

export function RunCostBadge({ estimatedCostUsd }: { estimatedCostUsd: number | null | undefined }) {
  return (
    <Badge variant="secondary" className="bg-white/10 text-zinc-100">
      Cost {estimatedCostUsd == null ? "pending" : formatCurrency(estimatedCostUsd)}
    </Badge>
  )
}
