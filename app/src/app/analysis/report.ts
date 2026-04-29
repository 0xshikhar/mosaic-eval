import { countAuditLogs, listRunRows, listTaskRows } from "@/app/db/store"
import { ensureSeedTasks } from "@/app/tasks/service"

export async function getDashboardSnapshot() {
  await ensureSeedTasks()
  const [tasks, runs, auditEvents] = await Promise.all([
    listTaskRows(),
    listRunRows(8),
    countAuditLogs(),
  ])

  return {
    tasks,
    runs,
    metrics: {
      totalTasks: tasks.length,
      totalRuns: runs.length,
      auditEvents,
    },
  }
}
