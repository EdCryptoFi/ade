import { test } from "node:test"
import assert from "node:assert/strict"
import { createRateLimiter, isAllowedOrigin, securityHeaders } from "./security.ts"

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

test("isAllowedOrigin rejects null, unknown and wildcard origins", () => {
  const allowed = ["https://ade-vibe.vercel.app", "http://localhost:3000"]
  assert.equal(isAllowedOrigin(null, allowed), false)
  assert.equal(isAllowedOrigin("https://evil.example.com", allowed), false)
  assert.equal(isAllowedOrigin("https://ade-vibe.vercel.app", allowed), true)
  assert.equal(isAllowedOrigin("http://localhost:3000", allowed), true)
})

test("security headers include the mandatory set (LAW-15)", () => {
  const h = securityHeaders()
  assert.equal(h["X-Content-Type-Options"], "nosniff")
  assert.equal(h["X-Frame-Options"], "DENY")
  assert.match(h["Strict-Transport-Security"], /max-age=63072000/)
  assert.ok(h["Referrer-Policy"])
  assert.ok(h["Permissions-Policy"])
})
