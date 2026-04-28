import { NextResponse } from "next/server"

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status })
}

export async function readJsonBody<T = unknown>(request: Request): Promise<T> {
  return (await request.json()) as T
}

