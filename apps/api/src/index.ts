import { generateArchitecture } from "@ade/core/ade"
import { validate } from "@ade/core/validation"
import { runSecurityAudit } from "@ade/core/security-audit"
import { createRateLimiter, isAllowedOrigin, securityHeaders, logError, resolveRateLimitKey } from "./security.ts"

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
}

// Sensible defaults (LAW-3): 30 req / 60s per IP, 300 req / 60s per key.
const PUBLIC_LIMIT = 30
const WINDOW_MS = 60_000
const rateLimiter = createRateLimiter({ limit: PUBLIC_LIMIT, windowMs: WINDOW_MS })

function json(body: unknown, status = 200, extra?: Record<string, string>) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...securityHeaders(), ...extra },
  })
}

function corsHeaders(request: Request, allowed: string[]): Record<string, string> {
  const origin = request.headers.get("Origin")
  const ok = isAllowedOrigin(origin, allowed)
  if (ok && origin) {
    return { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
  }
  // 🔒 SECURITY [LAW-4]: disallowed/absent origin → no CORS headers at all.
  return {}
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
    const limited = await rateLimit(request, env)
    if (limited) return limited

    if (request.method === "GET" && path === "/health") {
      return json({ status: "ok", engine: "ade", version: "0.1.0" }, 200, cors)
    }

    if (request.method === "POST" && path === "/analyze") {
      try {
        const body = await request.json()
        const input = validate(body)
        const result = generateArchitecture(input)
        return json(result, 200, cors)
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
        const result = runSecurityAudit(input)
        return json(result, 200, cors)
      } catch (err) {
        if (err instanceof Error && err.name === "ValidationError") {
          return json({ error: err.message, details: (err as any).errors }, 400, cors)
        }
        logError("audit", { path }, err)
        return json({ error: "Internal error processing the request." }, 500, cors)
      }
    }

    if (request.method === "GET" && path === "/schema") {
      return json({
        endpoints: [
          { method: "POST", path: "/analyze", description: "Generates full architecture (plan + settings + security audit)" },
          { method: "POST", path: "/audit", description: "Zero-Trust security audit (15 laws, vectors, anti-patterns, scorecard)" },
          { method: "GET", path: "/health", description: "Health check" },
          { method: "GET", path: "/schema", description: "This document" },
        ],
        input: {
          description: "string (min 3, max 2000 chars)",
          domain: "string (min 2, max 100 chars)",
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
      }, 200, cors)
    }

    return json({ error: "Not found" }, 404, cors)
  },
}
