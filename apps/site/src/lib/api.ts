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
  return request("/analyze", payload)
}

export async function auditProject(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  return request("/audit", payload)
}

// Starts a paid delivery: the Worker validates the project, stores it
// pending payment, and returns a Stripe Checkout URL to redirect to. The
// report is only generated after Stripe confirms payment via webhook —
// this call never returns architecture content itself.
export async function startCheckout(payload: Record<string, unknown>): Promise<{ url: string; id: string }> {
  const data = await request("/checkout", payload)
  const envelope = (data.result ?? data) as { url?: string; id?: string }
  if (!envelope.url) throw new ApiError("Checkout did not return a redirect URL", 502)
  return { url: envelope.url, id: envelope.id ?? "" }
}

export interface CheckoutStatus {
  status: "pending" | "ready"
  url?: string
}

export async function getCheckoutStatus(sessionId: string): Promise<CheckoutStatus> {
  const res = await fetch(`${ADE_API_URL}/checkout/${encodeURIComponent(sessionId)}/status`)
  if (!res.ok) return { status: "pending" }
  return (await res.json()) as CheckoutStatus
}

async function request(path: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(`${ADE_API_URL}${path}`, {
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
