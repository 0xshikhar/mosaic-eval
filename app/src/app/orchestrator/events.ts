import type { RunEvent } from "@/app/orchestrator/types"

type RunStreamState = {
  events: RunEvent[]
  waiters: Set<() => void>
  completed: boolean
}

const runStreams = new Map<string, RunStreamState>()

function ensureState(runId: string) {
  let state = runStreams.get(runId)
  if (!state) {
    state = { events: [], waiters: new Set(), completed: false }
    runStreams.set(runId, state)
  }

  return state
}

export function publishRunEvent(runId: string, event: RunEvent) {
  const state = ensureState(runId)
  state.events.push(event)

  if (event.type === "run_complete" || event.type === "run_error") {
    state.completed = true
  }

  for (const waiter of state.waiters) waiter()
  state.waiters.clear()
}

export function getRunEvents(runId: string) {
  return ensureState(runId).events
}

export async function* streamRunEvents(runId: string, fromIndex = 0) {
  const state = ensureState(runId)
  let index = fromIndex

  while (true) {
    while (index < state.events.length) {
      yield state.events[index++]
    }

    if (state.completed) return

    await new Promise<void>((resolve) => {
      state.waiters.add(resolve)
    })
  }
}

export function clearRunStream(runId: string) {
  runStreams.delete(runId)
}

