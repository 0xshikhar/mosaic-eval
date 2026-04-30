export function createLimiter(maxConcurrent = 2) {
  let active = 0
  const queue: Array<() => void> = []

  async function acquire() {
    if (active < maxConcurrent) {
      active += 1
      return
    }

    await new Promise<void>((resolve) => queue.push(resolve))
    active += 1
  }

  function release() {
    active = Math.max(0, active - 1)
    const next = queue.shift()
    if (next) next()
  }

  return { acquire, release }
}

