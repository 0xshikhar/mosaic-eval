import Link from "next/link"
import { Bolt, ArrowLeftRight, CheckCircle2, FileKey, MonitorPlay } from "lucide-react"

import { SiteShell } from "@/app/components/site-shell"
import { ModelTester } from "@/app/components/model-tester"
import { listAdapters } from "@/app/orchestrator/adapters"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function ModelsPage() {
  const models = listAdapters()
  const readyCount = models.filter((model) => model.available).length
  const pendingCount = models.length - readyCount
  const bedrockReadyCount = models.filter((model) => model.available && model.endpoint.includes("bedrock-mantle")).length
  const directReadyCount = models.filter((model) => model.available && !model.endpoint.includes("bedrock-mantle")).length

  return (
    <SiteShell
      title="Model setup"
      description="This page reflects what is already loaded from `.env` and the running local services. Change the env file, restart, and the available models will update here."
      actions={
        <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
          <Link href="/runs/new">
            <ArrowLeftRight className="size-4" />
            Back to runs
          </Link>
        </Button>
      }
    >
      <div className="grid gap-6">
        <section className="grid gap-4 md:grid-cols-3">
          <Card className="border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(2,6,23,0.28)] backdrop-blur-xl">
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-white">
                <FileKey className="size-4 text-emerald-300" />
                Auto-detected stack
              </CardTitle>
              <CardDescription className="text-zinc-400">
                One Bedrock key unlocks four demo agents, while direct provider keys stay available as separate options.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-zinc-300">
              {bedrockReadyCount > 0 ? (
                <span>
                  {bedrockReadyCount} Bedrock-backed models are ready, and {directReadyCount} direct models are ready.
                </span>
              ) : (
                <span>
                  Configure `BEDROCK_API_KEY` to unlock the Bedrock-backed bundle, or use direct OpenAI and Anthropic keys instead.
                </span>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(2,6,23,0.28)] backdrop-blur-xl">
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-white">
                <MonitorPlay className="size-4 text-cyan-300" />
                LM Studio
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Point `LM_STUDIO_BASE_URL` at a running local server and set `LM_STUDIO_MODEL_ID`.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-zinc-300">
              The adapter uses an OpenAI-compatible chat completions endpoint, so local models work with the same run flow.
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(2,6,23,0.28)] backdrop-blur-xl">
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-white">
                <Bolt className="size-4 text-amber-300" />
                Readiness
              </CardTitle>
              <CardDescription className="text-zinc-400">
                {readyCount} ready, {pendingCount} need setup.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {models.map((model) => (
                <Badge
                  key={model.id}
                  variant="outline"
                  className={
                    model.available
                      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                      : "border-white/10 bg-white/5 text-zinc-300"
                  }
                >
                  {model.displayName}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-emerald-200/80">
            <CheckCircle2 className="size-4" />
            Model test bench
          </div>
          <ModelTester models={models} />
        </section>
      </div>
    </SiteShell>
  )
}
