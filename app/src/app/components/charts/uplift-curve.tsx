"use client"

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type DifficultyPoint = {
  difficulty: number
  uplift: number
}

export function UpliftCurve({ data }: { data: DifficultyPoint[] }) {
  return (
    <Card className="border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(2,6,23,0.22)] backdrop-blur-xl">
      <CardHeader className="space-y-2">
        <CardTitle className="text-white">Uplift by difficulty</CardTitle>
        <CardDescription className="text-zinc-400">
          Difficulty buckets sorted from easiest to hardest.
        </CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/20 text-sm text-zinc-500">
            No uplift data available yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis
                dataKey="difficulty"
                tick={{ fill: "#d4d4d8", fontSize: 12 }}
                axisLine={{ stroke: "rgba(255,255,255,0.15)" }}
                tickFormatter={(value) => `D${value}`}
              />
              <YAxis
                tick={{ fill: "#d4d4d8", fontSize: 12 }}
                axisLine={{ stroke: "rgba(255,255,255,0.15)" }}
                tickFormatter={(value) => `${value.toFixed(0)}`}
              />
              <Tooltip
                cursor={{ stroke: "rgba(255,255,255,0.15)" }}
                contentStyle={{
                  background: "rgba(2, 6, 23, 0.95)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "0.75rem",
                  color: "#f8fafc",
                }}
                formatter={(value: number) => [`${value.toFixed(1)} points`, "Uplift"]}
                labelFormatter={(label) => `Difficulty ${label}`}
              />
              <ReferenceLine y={0} stroke="#64748b" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="uplift" stroke="#34d399" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
