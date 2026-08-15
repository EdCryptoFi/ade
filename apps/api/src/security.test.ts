import { test } from "node:test"
import assert from "node:assert/strict"
import { createRateLimiter, isAllowedOrigin, securityHeaders, resolveRateLimitKey } from "./security.ts"

test("rate limiter allows requests under the limit", () => {
  const rl = createRateLimiter({ limit: 3, windowMs: 60_000 })
  assert.equal(rl.check("ip:1").ok, true)
  assert.equal(rl.check("ip:1").ok, true)
  assert.equal(rl.check("ip:1").ok, true)
})

test("rate limiter blocks above the limit and reports retryAfter", () => {
  const rl = createRateLimiter({ limit: 2, windowMs: 60_000 })
  rl.check("ip:1")
  rl.check("ip:1")
  const blocked = rl.check("ip:1")
  assert.equal(blocked.ok, false)
  assert.ok(blocked.retryAfterMs > 0 && blocked.retryAfterMs <= 60_000)
})

test("rate limiter keys are isolated per IP/key", () => {
  const rl = createRateLimiter({ limit: 1, windowMs: 60_000 })
  assert.equal(rl.check("ip:a").ok, true)
  assert.equal(rl.check("ip:a").ok, false)
  assert.equal(rl.check("ip:b").ok, true)
  assert.equal(rl.check("key:alice").ok, true)
})

test("rate limiter window resets (burst protection, not a permanent ban)", () => {
  const rl = createRateLimiter({ limit: 1, windowMs: 1_000 })
  assert.equal(rl.check("ip:1", 0).ok, true)
  assert.equal(rl.check("ip:1", 500).ok, false)
  assert.equal(rl.check("ip:1", 1_001).ok, true)
})

test("resolveRateLimitKey only honours server-issued keys (no forged-header bypass)", () => {
  const allowlist = ["ak-live-abc123"]
  assert.equal(resolveRateLimitKey("ak-live-abc123", allowlist), "ak-live-abc123")
  assert.equal(resolveRateLimitKey(null, allowlist), null)
  assert.equal(resolveRateLimitKey("", allowlist), null)
  // a forged/random header must NOT mint a new bucket -> falls back to IP
  assert.equal(resolveRateLimitKey("ak-evil", allowlist), null)
})

test("isAllowedOrigin rejects null, unknown and wildcard origins", () => {
  const allowed = ["https://ade-vibe.vercel.app", "http://localhost:3000"]
  assert.equal(isAllowedOrigin(null, allowed), false)
  assert.equal(isAllowedOrigin("https://evil.example.com", allowed), false)
  assert.equal(isAllowedOrigin("https://ade-vibe.vercel.app", allowed), true)
  assert.equal(isAllowedOrigin("http://localhost:3000", allowed), true)
})

test("isAllowedOrigin allows only real subdomains, never localhost/IP suffix tricks", () => {
  const allowed = ["https://ade-vibe.vercel.app", "http://localhost:3000", "http://10.0.0.5:8080"]
  assert.equal(isAllowedOrigin("https://evil.ade-vibe.vercel.app", allowed), true)
  assert.equal(isAllowedOrigin("https://ade-vibe.vercel.app.evil.com", allowed), false)
  assert.equal(isAllowedOrigin("http://evil.localhost:3000", allowed), false)
  assert.equal(isAllowedOrigin("http://localhost:3000.evil.com", allowed), false)
  assert.equal(isAllowedOrigin("http://10.0.0.5:8080", allowed), true)
  assert.equal(isAllowedOrigin("http://evil.10.0.0.5:8080", allowed), false)
  assert.equal(isAllowedOrigin("https://evil.com/ignored/path?q=ade-vibe.vercel.app", allowed), false)
})

test("security headers include the mandatory set (LAW-15)", () => {
  const h = securityHeaders()
  assert.equal(h["X-Content-Type-Options"], "nosniff")
  assert.equal(h["X-Frame-Options"], "DENY")
  assert.match(h["Strict-Transport-Security"], /max-age=63072000/)
  assert.ok(h["Referrer-Policy"])
  assert.ok(h["Permissions-Policy"])
})
