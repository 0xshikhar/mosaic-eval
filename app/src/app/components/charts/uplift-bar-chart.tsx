"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type ScorePoint = {
  modelId: string
  score: number
}

export function UpliftBarChart({
  data,
  mosaicScore,
}: {
  data: ScorePoint[]
  mosaicScore: number
}) {
  return (
    <Card className="border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(2,6,23,0.22)] backdrop-blur-xl">
      <CardHeader className="space-y-2">
        <CardTitle className="text-white">Model score comparison</CardTitle>
        <CardDescription className="text-zinc-400">
          Per-model scores with the overall mosaic score marked as a reference line.
        </CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/20 text-sm text-zinc-500">
            No model scores available yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="modelId" tick={{ fill: "#d4d4d8", fontSize: 12 }} axisLine={{ stroke: "rgba(255,255,255,0.15)" }} />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "#d4d4d8", fontSize: 12 }}
                axisLine={{ stroke: "rgba(255,255,255,0.15)" }}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
                contentStyle={{
                  background: "rgba(2, 6, 23, 0.95)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "0.75rem",
                  color: "#f8fafc",
                }}
                formatter={(value) => [`${Number(value ?? 0).toFixed(1)} points`, "Score"]}
              />
              <ReferenceLine
                y={mosaicScore}
                stroke="#34d399"
                strokeDasharray="4 4"
                label={{
                  value: `Mosaic ${mosaicScore.toFixed(1)}`,
                  position: "insideTopRight",
                  fill: "#a7f3d0",
                }}
              />
              <Bar dataKey="score" fill="#38bdf8" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
