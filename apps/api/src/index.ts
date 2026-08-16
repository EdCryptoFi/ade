import { generateArchitecture } from "@ade/core/ade"
import { validate } from "@ade/core/validation"
import { runSecurityAudit } from "@ade/core/security-audit"
import { generateReportHtml, type ReportMeta } from "@ade/core/templates/report-html"
import { OPENAPI_DOCUMENT, LLMS_DOCUMENT } from "./docs.ts"
import { createRateLimiter, corsHeaders, securityHeaders, logError, resolveRateLimitKey } from "./security.ts"
import { createCheckoutSession, verifyStripeSignature } from "./stripe.ts"

interface Env {
  ENVIRONMENT?: string
  // 🔒 SECURITY [LAW-3]: point this at a Cloudflare Rate Limiting binding for
  // cross-isolate limits. Falls back to in-memory when absent.
  RATE_LIMITER?: {
    limit: (opts: { key: string }) => Promise<{ success: boolean }>
  }
  ALLOWED_ORIGINS?: string
  // 🔒 SECURITY [LAW-5]: comma-separated allowlist of API keys. A client's
  // `x-api-key` is only honoured (higher per-key quota) when it matches an
  // entry server-side; unlisted/absent keys always key on IP. Without this,
  // a forged `x-api-key` would mint a fresh rate-limit bucket per request.
  ADE_API_KEYS?: string
  // KV namespace backing `/deliver` + `/report/:token`. Keyed by a random
  // token generated server-side (crypto.randomUUID()) — never by a caller-
  // supplied jobRef, which may be a public on-chain id (LAW-5: identity/
  // access from a server-issued token, never from client input).
  REPORTS?: {
    get: (key: string) => Promise<string | null>
    put: (key: string, value: string, opts?: { expirationTtl?: number }) => Promise<void>
  }
  // KV namespace holding project input between "checkout started" and
  // "payment confirmed by webhook". Short-lived (24h) — never the source of
  // truth for whether a report should be generated; only the verified
  // Stripe webhook is (LAW-1: never trust the client-side redirect alone).
  CHECKOUTS?: {
    get: (key: string) => Promise<string | null>
    put: (key: string, value: string, opts?: { expirationTtl?: number }) => Promise<void>
    delete: (key: string) => Promise<void>
  }
  STRIPE_SECRET_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  STRIPE_PRICE_ID?: string
  // Trusted origin used to build Stripe success/cancel URLs server-side.
  // Deliberately NOT taken from client input — an attacker-controlled
  // success_url would be an open-redirect-via-Stripe vector.
  SITE_URL?: string
}

// Sensible defaults (LAW-3): 30 req / 60s per IP, 300 req / 60s per key.
const PUBLIC_LIMIT = 30
const WINDOW_MS = 60_000
const ENGINE_VERSION = "0.1.0"
const rateLimiter = createRateLimiter({ limit: PUBLIC_LIMIT, windowMs: WINDOW_MS })

// Delivery reports (LAW-3: bounded lifetime for data that may echo a buyer's
// product description back at them). 90 days is enough for an escrow review
// cycle without the report outliving its purpose.
const REPORT_TTL_SECONDS = 60 * 60 * 24 * 90
const REPORT_TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_META_FIELD_LEN = 200

// Pending checkouts outlive Stripe's own 24h Checkout Session expiry by a
// small margin so a slightly delayed webhook can still find its input.
const PENDING_TTL_SECONDS = 60 * 60 * 25
const DEFAULT_SITE_URL = "https://ade-vibe.vercel.app"

function generateReportForInput(input: Parameters<typeof generateArchitecture>[0], meta: ReportMeta) {
  const result = generateArchitecture(input)
  return generateReportHtml(result, result.securityAudit, meta)
}

function json(body: unknown, status = 200, extra?: Record<string, string>) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...securityHeaders(), ...extra },
  })
}

function envelope(result: unknown) {
  return { engine: "ade", version: ENGINE_VERSION, generatedAt: new Date().toISOString(), language: "en-US", result }
}

async function rateLimit(request: Request, env: Env): Promise<Response | null> {
  // key = user-based when a server-issued API key is presented, else IP-based
  // (LAW-3). The key MUST be validated against a server-side allowlist — a
  // client-supplied header alone is never a trusted identity (LAW-5/LAW-2).
  const ip = request.headers.get("CF-Connecting-IP") ?? request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ?? "unknown"
  const presented = request.headers.get("x-api-key")
  const allowlist = (env.ADE_API_KEYS ?? "").split(",").map((s) => s.trim()).filter(Boolean)
  const apiKey = resolveRateLimitKey(presented, allowlist)

  const key = apiKey ?? `ip:${ip}`

  if (env.RATE_LIMITER) {
    const { success } = await env.RATE_LIMITER.limit({ key })
    if (!success) {
      return json({ error: "Too many requests. Try again in a moment." }, 429, { "Retry-After": String(WINDOW_MS / 1000) })
    }
    return null
  }

  const { ok, retryAfterMs } = rateLimiter.check(key)
  if (!ok) {
    return json({ error: "Too many requests. Try again in a moment." }, 429, {
      "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
    })
  }
  return null
}

const READ_PATHS = new Set(["/health", "/schema"])

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const allowed = (env.ALLOWED_ORIGINS ?? "https://ade-vibe.vercel.app,http://localhost:3000")
      .split(",").map((s) => s.trim()).filter(Boolean)
    const cors = corsHeaders(request, allowed)

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { ...securityHeaders(), ...cors } })
    }

    const url = new URL(request.url)
    const path = url.pathname.replace(/\/$/, "")

    // 🔒 SECURITY [LAW-3]: rate limit all public endpoints (write paths).
    // /webhook/stripe is exempt: it's gated by signature verification, not
    // by caller identity, and IP-bucketing Stripe's own delivery servers
    // would only risk dropping legitimate payment confirmations.
    if (path !== "/webhook/stripe") {
      const limited = await rateLimit(request, env)
      if (limited) return limited
    }

    if (request.method === "GET" && path === "/health") {
      return json({ status: "ok", engine: "ade", version: ENGINE_VERSION, language: "en-US" }, 200, cors)
    }

    if (request.method === "POST" && path === "/analyze") {
      try {
        const body = await request.json()
        const input = validate(body)
        const result = generateArchitecture(input)
        return json(envelope({ ...result.structured, artifacts: result.files }), 200, cors)
      } catch (err) {
        if (err instanceof Error && err.name === "ValidationError") {
          return json({ error: err.message, details: (err as any).errors }, 400, cors)
        }
        // 🔒 SECURITY [LAW-14]: log full detail, respond generically.
        logError("analyze", { path }, err)
        return json({ error: "Internal error processing the request." }, 500, cors)
      }
    }

    if (request.method === "POST" && path === "/audit") {
      try {
        const body = await request.json()
        const input = validate(body)
        const audit = runSecurityAudit(input)
        const architecture = generateArchitecture({ ...input, mode: "audit" })
        return json(envelope({ ...architecture.structured, summary: "Prioritized security audit for the supplied project.", securityRisks: audit, scope: { ...architecture.structured.scope, mode: "audit" }, artifacts: { "security-audit.md": architecture.files["security-audit.md"] } }), 200, cors)
      } catch (err) {
        if (err instanceof Error && err.name === "ValidationError") {
          return json({ error: err.message, details: (err as any).errors }, 400, cors)
        }
        logError("audit", { path }, err)
        return json({ error: "Internal error processing the request." }, 500, cors)
      }
    }

    if (request.method === "POST" && path === "/deliver") {
      // 🔒 SECURITY [LAW-6]: operator-only. The public flow for paying
      // customers is /checkout → Stripe → webhook; this endpoint is for
      // manual/off-platform fulfillment (e.g. a marketplace job) and
      // requires a server-issued key, same allowlist as the rate limiter.
      const presented = request.headers.get("x-api-key")
      const allowlist = (env.ADE_API_KEYS ?? "").split(",").map((s) => s.trim()).filter(Boolean)
      if (!resolveRateLimitKey(presented, allowlist)) {
        return json({ error: "Not found" }, 404, cors)
      }

      try {
        const body = (await request.json()) as Record<string, unknown>
        // jobRef/tier are delivery metadata, not architecture input — strip
        // them before validate() (LAW-2: strict schema, unknown keys rejected).
        const { jobRef, tier, ...projectInput } = body
        const input = validate(projectInput)

        if (!env.REPORTS) {
          // Local/dev fallback: no KV bound, nothing to serve a stable URL
          // from. Fail loudly rather than pretend delivery succeeded.
          return json({ error: "Report storage is not configured on this environment." }, 501, cors)
        }

        const meta: ReportMeta = {
          jobRef: typeof jobRef === "string" ? jobRef.slice(0, MAX_META_FIELD_LEN) : undefined,
          tier: typeof tier === "string" ? tier.slice(0, MAX_META_FIELD_LEN) : undefined,
          generatedAt: new Date().toISOString(),
        }

        const html = generateReportForInput(input, meta)

        // 🔒 SECURITY [LAW-5]: token is server-generated and random — never
        // derived from jobRef, which may be a public on-chain identifier.
        const token = crypto.randomUUID()
        await env.REPORTS.put(token, html, { expirationTtl: REPORT_TTL_SECONDS })

        const reportUrl = `${new URL(request.url).origin}/report/${token}`
        return json(envelope({ url: reportUrl, token, expiresInDays: 90 }), 200, cors)
      } catch (err) {
        if (err instanceof Error && err.name === "ValidationError") {
          return json({ error: err.message, details: (err as any).errors }, 400, cors)
        }
        logError("deliver", { path }, err)
        return json({ error: "Internal error processing the request." }, 500, cors)
      }
    }

    if (request.method === "POST" && path === "/checkout") {
      try {
        if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID) {
          return json({ error: "Checkout is not configured on this environment." }, 501, cors)
        }
        if (!env.CHECKOUTS) {
          return json({ error: "Checkout storage is not configured on this environment." }, 501, cors)
        }

        const body = (await request.json()) as Record<string, unknown>
        const { email, ...projectInput } = body
        // Validates the SAME way /analyze does — a paying customer gets no
        // less scrutiny on their input than a free caller (LAW-1).
        const input = validate(projectInput)

        const pendingId = crypto.randomUUID()
        await env.CHECKOUTS.put(`pending:${pendingId}`, JSON.stringify(input), { expirationTtl: PENDING_TTL_SECONDS })

        const siteUrl = env.SITE_URL ?? DEFAULT_SITE_URL
        const session = await createCheckoutSession({
          secretKey: env.STRIPE_SECRET_KEY,
          priceId: env.STRIPE_PRICE_ID,
          successUrl: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${siteUrl}/playground?checkout=cancelled`,
          clientReferenceId: pendingId,
          customerEmail: typeof email === "string" && email.includes("@") ? email.slice(0, MAX_META_FIELD_LEN) : undefined,
        })

        return json(envelope({ url: session.url, id: session.id }), 200, cors)
      } catch (err) {
        if (err instanceof Error && err.name === "ValidationError") {
          return json({ error: err.message, details: (err as any).errors }, 400, cors)
        }
        logError("checkout", { path }, err)
        return json({ error: "Could not start checkout." }, 502, cors)
      }
    }

    // 🔒 SECURITY [LAW-1/LAW-8]: this is the ONLY place a report gets
    // generated for a paying customer. Nothing about the browser's redirect
    // back to /success is trusted — fulfillment happens here, gated on a
    // verified Stripe signature, never on the client saying "I paid".
    if (request.method === "POST" && path === "/webhook/stripe") {
      if (!env.STRIPE_WEBHOOK_SECRET || !env.CHECKOUTS || !env.REPORTS) {
        return json({ error: "Webhook is not configured on this environment." }, 501, cors)
      }

      const rawBody = await request.text()
      const signature = request.headers.get("Stripe-Signature")
      const valid = await verifyStripeSignature(rawBody, signature, env.STRIPE_WEBHOOK_SECRET)
      if (!valid) {
        logError("webhook/stripe", { path }, new Error("Invalid or missing Stripe-Signature"))
        return json({ error: "Invalid signature." }, 400, cors)
      }

      try {
        const event = JSON.parse(rawBody) as { type: string; data: { object: Record<string, unknown> } }
        if (event.type !== "checkout.session.completed") {
          return json({ received: true }, 200, cors)
        }

        const session = event.data.object as { id: string; client_reference_id?: string; metadata?: { pendingId?: string }; payment_status?: string; customer_details?: { email?: string } }
        if (session.payment_status !== "paid") {
          return json({ received: true }, 200, cors)
        }

        // Idempotent: Stripe retries deliveries. If this session already
        // produced a report, don't regenerate or double-charge compute.
        const already = await env.REPORTS.get(`session:${session.id}`)
        if (already) {
          return json({ received: true }, 200, cors)
        }

        const pendingId = session.client_reference_id ?? session.metadata?.pendingId
        if (!pendingId) {
          logError("webhook/stripe", { path }, new Error("checkout.session.completed with no pendingId"))
          return json({ received: true }, 200, cors)
        }

        const storedInput = await env.CHECKOUTS.get(`pending:${pendingId}`)
        if (!storedInput) {
          // Expired or already consumed — nothing to fulfill.
          logError("webhook/stripe", { path, pendingId }, new Error("No pending input found for session"))
          return json({ received: true }, 200, cors)
        }

        const input = JSON.parse(storedInput)
        const meta: ReportMeta = { generatedAt: new Date().toISOString(), tier: "Architecture + Security Blueprint" }
        const html = generateReportForInput(input, meta)

        const token = crypto.randomUUID()
        await env.REPORTS.put(token, html, { expirationTtl: REPORT_TTL_SECONDS })
        await env.REPORTS.put(`session:${session.id}`, token, { expirationTtl: REPORT_TTL_SECONDS })
        await env.CHECKOUTS.delete(`pending:${pendingId}`)

        return json({ received: true }, 200, cors)
      } catch (err) {
        logError("webhook/stripe", { path }, err)
        // 200 even on internal failure: Stripe would otherwise retry a
        // payload it already delivered correctly. The failure is logged
        // server-side for follow-up instead.
        return json({ received: true }, 200, cors)
      }
    }

    if (request.method === "GET" && path.startsWith("/checkout/") && path.endsWith("/status")) {
      const sessionId = path.slice("/checkout/".length, -"/status".length)
      if (!env.REPORTS || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
        return json({ status: "pending" }, 200, cors)
      }
      const token = await env.REPORTS.get(`session:${sessionId}`)
      if (!token) {
        return json({ status: "pending" }, 200, cors)
      }
      return json({ status: "ready", url: `${new URL(request.url).origin}/report/${token}` }, 200, cors)
    }

    if (request.method === "GET" && path.startsWith("/report/")) {
      const token = path.slice("/report/".length)
      // Generic 404 for both "malformed token" and "not found" — a distinct
      // response would let an attacker use the endpoint as a token-format
      // oracle (LAW-14: safe, non-revealing errors).
      if (!REPORT_TOKEN_RE.test(token) || !env.REPORTS) {
        return json({ error: "Not found" }, 404, cors)
      }
      const html = await env.REPORTS.get(token)
      if (!html) {
        return json({ error: "Not found" }, 404, cors)
      }
      return new Response(html, {
        status: 200,
        headers: {
          ...securityHeaders(),
          "Content-Type": "text/html; charset=utf-8",
          // Never index a buyer's report — it may echo their product description.
          "X-Robots-Tag": "noindex, nofollow",
        },
      })
    }

    if (request.method === "GET" && path === "/schema") {
      return json({
        endpoints: [
          { method: "POST", path: "/analyze", description: "Generates full architecture (plan + settings + security audit)" },
          { method: "POST", path: "/audit", description: "Zero-Trust security audit (15 laws, vectors, anti-patterns, scorecard)" },
          { method: "POST", path: "/deliver", description: "Operator-only (requires x-api-key). Renders a shareable HTML blueprint and stores it behind a random token; returns { url, token, expiresInDays }" },
          { method: "GET", path: "/report/:token", description: "Serves a previously delivered HTML blueprint (noindex, 90-day TTL)" },
          { method: "POST", path: "/checkout", description: "Starts a $5 Stripe Checkout session for the supplied project; returns { url, id } to redirect the browser to" },
          { method: "POST", path: "/webhook/stripe", description: "Stripe webhook receiver. Verifies the signature, then generates and stores the report on checkout.session.completed" },
          { method: "GET", path: "/checkout/:sessionId/status", description: "Polled by the success page; returns { status: 'pending' } or { status: 'ready', url }" },
          { method: "GET", path: "/health", description: "Health check" },
          { method: "GET", path: "/schema", description: "This document" },
        ],
        input: {
          description: "string (min 3, max 2000 chars)",
          domain: "string (min 2, max 100 chars)",
          mode: "analysis | audit | blueprint (optional, default blueprint)",
          features: "string[] (min 1, max 50 items)",
          users: "number (optional, positive int)",
          blockchain: "boolean (optional)",
          auth: "boolean (optional)",
          upload: "boolean (optional)",
          realtime: "boolean (optional)",
          payments: "boolean (optional)",
          ai: "boolean (optional)",
          aiMemory: "boolean (optional)",
          teams: "boolean (optional)",
          multiTenant: "boolean (optional)",
          apiAccess: "boolean (optional)",
          webhooks: "boolean (optional)",
          sso: "boolean (optional)",
          auditLog: "boolean (optional)",
          featureFlags: "boolean (optional)",
          onboarding: "boolean (optional)",
          notifications: "boolean (optional)",
          dataExport: "boolean (optional)",
          search: "boolean (optional)",
          backgroundJobs: "boolean (optional)",
          cms: "boolean (optional)",
        },
        output: { language: "en-US", envelope: { engine: "ade", version: ENGINE_VERSION, generatedAt: "ISO timestamp", result: "structured English result" } },
      }, 200, cors)
    }

    if (request.method === "GET" && path === "/openapi.json") return json(OPENAPI_DOCUMENT, 200, cors)
    if (request.method === "GET" && path === "/llms.txt") return new Response(LLMS_DOCUMENT, { status: 200, headers: { ...securityHeaders(), ...cors, "Content-Type": "text/plain; charset=utf-8" } })

    return json({ error: "Not found" }, 404, cors)
  },
}
