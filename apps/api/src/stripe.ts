// Minimal Stripe integration: plain fetch for the REST API, Web Crypto for
// webhook signatures. No `stripe` SDK dependency — keeps the Worker bundle
// small and avoids trusting an SDK's edge-runtime compatibility for a
// security-critical verification path.

export interface CheckoutSessionParams {
  secretKey: string
  priceId: string
  successUrl: string
  cancelUrl: string
  clientReferenceId: string
  customerEmail?: string
}

export interface CheckoutSession {
  id: string
  url: string
}

export async function createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSession> {
  const body = new URLSearchParams()
  body.set("mode", "payment")
  body.set("line_items[0][price]", params.priceId)
  body.set("line_items[0][quantity]", "1")
  body.set("success_url", params.successUrl)
  body.set("cancel_url", params.cancelUrl)
  // 🔒 [LAW-5]: this id is how the webhook finds the pending input later —
  // it identifies a KV record, never a price or a permission by itself.
  body.set("client_reference_id", params.clientReferenceId)
  body.set("metadata[pendingId]", params.clientReferenceId)
  if (params.customerEmail) body.set("customer_email", params.customerEmail)

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`Stripe checkout session creation failed (${res.status}): ${detail.slice(0, 300)}`)
  }

  const session = (await res.json()) as { id: string; url: string | null }
  if (!session.url) throw new Error("Stripe did not return a checkout URL")
  return { id: session.id, url: session.url }
}

// 🔒 SECURITY: verifies Stripe's webhook signature per their documented
// scheme — HMAC-SHA256 over `${timestamp}.${rawBody}`, compared in constant
// time, with a tolerance window against replay. This is the ONLY thing that
// tells "checkout.session.completed" apart from an attacker POSTing that
// event shape by hand — without it, anyone could mint themselves a free
// report (exactly the LAW-1/LAW-8 failure mode: trusting a client-asserted
// "payment succeeded" instead of verifying it server-side).
export async function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSeconds = 300,
): Promise<boolean> {
  if (!signatureHeader) return false

  const parts: Record<string, string> = {}
  for (const kv of signatureHeader.split(",")) {
    const [k, v] = kv.split("=")
    if (k && v) parts[k] = v
  }
  const timestamp = parts.t
  const signature = parts.v1
  if (!timestamp || !signature) return false

  const age = Math.abs(Date.now() / 1000 - Number(timestamp))
  if (!Number.isFinite(age) || age > toleranceSeconds) return false

  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${rawBody}`))
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("")

  return timingSafeEqual(expected, signature)
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
