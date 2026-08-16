// 🔒 SECURITY [LAW-3/LAW-4/LAW-15]: perimeter hardening for the public Worker API.
// Sliding-window in-memory rate limiter (per IP + per API key), strict CORS
// allowlist and mandatory security headers. In production you can point
// `env.RATE_LIMITER` at the Cloudflare Rate Limiting binding instead of the
// in-memory fallback (see wrangler.toml). The in-memory Map is per-isolate —
// correct default for burst protection; the binding scales across isolates.

export interface RateLimitConfig {
  limit: number
  windowMs: number
}

export interface RateLimitDecision {
  ok: boolean
  retryAfterMs: number
}

interface Bucket {
  count: number
  windowStart: number
}

// 🔒 SECURITY [LAW-5/LAW-2]: decide the rate-limit key. A client-supplied
// `x-api-key` is ONLY honoured when it appears in the server-side allowlist;
// returns null otherwise, so the caller falls back to the IP-derived key.
export function resolveRateLimitKey(presented: string | null, allowlist: string[]): string | null {
  const key = (presented ?? "").trim()
  if (key && allowlist.includes(key)) return key
  return null
}

// key = `${ip}` or `${apiKey}` (user-based when an API key is presented)
export function createRateLimiter(config: RateLimitConfig) {
  const buckets = new Map<string, Bucket>()

  function sweep(now: number) {
    for (const [k, b] of buckets) {
      if (now - b.windowStart >= config.windowMs) buckets.delete(k)
    }
  }

  function check(key: string, now = Date.now()): RateLimitDecision {
    const bucket = buckets.get(key)
    if (!bucket || now - bucket.windowStart >= config.windowMs) {
      buckets.set(key, { count: 1, windowStart: now })
      if (buckets.size > 10_000) sweep(now)
      return { ok: true, retryAfterMs: 0 }
    }
    if (bucket.count >= config.limit) {
      return { ok: false, retryAfterMs: config.windowMs - (now - bucket.windowStart) }
    }
    bucket.count += 1
    return { ok: true, retryAfterMs: 0 }
  }

  return { check }
}

// 🔒 SECURITY [LAW-4]: CORS allowlist. The playground (Vercel) and localhost
// are allowed; anything else is refused instead of the permissive `*`.
// Hostname-suffix matching only applies to registered domains (an entry with
// a dot in the host), so `evil.localhost:3000` / suffix-crafted origins on
// localhost entries are never auto-allowed.
export function isAllowedOrigin(origin: string | null, allowed: string[]): boolean {
  if (!origin) return false
  try {
    const hostname = new URL(origin).hostname.toLowerCase()
    return allowed.some((a) => {
      const entry = a.trim()
      if (origin === entry) return true
      // subdomain allow (e.g. `app.example.com` for entry `example.com`) only
      // when the entry host has a dot (a real domain, not `localhost` or IPS).
      const entryHost = safeHostname(entry)
      if (!entryHost || !entryHost.includes(".")) return false
      if (hostname === entryHost) return true
      return hostname.endsWith(`.${entryHost}`)
    })
  } catch {
    return false
  }
}

export function corsHeaders(request: Request, allowed: string[]): Record<string, string> {
  const origin = request.headers.get("Origin")
  if (!isAllowedOrigin(origin, allowed) || !origin) return {}
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  }
}

function safeHostname(entry: string): string | null {
  try {
    return new URL(entry.startsWith("/") ? `https://${entry}` : entry).hostname.toLowerCase().replace(/^\./, "")
  } catch {
    return null
  }
}

export function securityHeaders(): Record<string, string> {
  return {
    // 🔒 SECURITY [LAW-15]: clickjacking, MIME sniffing, referrer leakage, feature abuse
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "Cache-Control": "no-store",
  }
}

// 🔒 SECURITY [LAW-14]: never leak internal error details to the client.
// Log the full context server-side; return a generic message to the caller.
export function logError(scope: string, context: Record<string, unknown>, err: unknown) {
  const detail = err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : { raw: String(err) }
  console.error(JSON.stringify({ scope, level: "error", ...context, error: detail }))
}
