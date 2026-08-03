// API client for the ADE public worker. The URL comes from an env var so the
// playground is not tied to a hard-coded host (LAW-11/config separation).

const DEFAULT_API_URL = "https://ade-api.cryptolairbr.workers.dev"

export const ADE_API_URL = process.env.NEXT_PUBLIC_ADE_API_URL?.trim() || DEFAULT_API_URL

export class ApiError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

export async function analyzeProject(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(`${ADE_API_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  let data: Record<string, unknown>
  try {
    data = await res.json()
  } catch {
    throw new ApiError(`Server returned an invalid response (${res.status})`, res.status)
  }

  if (!res.ok) {
    const message = typeof data?.error === "string" ? data.error : `Request failed (${res.status})`
    throw new ApiError(message, res.status)
  }

  return data
}
