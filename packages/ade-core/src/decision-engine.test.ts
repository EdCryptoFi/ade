import { describe, it, expect } from "vitest"
import { runDecisionEngine } from "./decision-engine.ts"

function input(overrides: Record<string, any> = {}) {
  return {
    description: "test",
    domain: "test",
    features: ["test"],
    users: 0,
    blockchain: false,
    auth: false,
    upload: false,
    realtime: false,
    payments: false,
    ai: false,
    aiMemory: false,
    teams: false,
    multiTenant: false,
    apiAccess: false,
    webhooks: false,
    sso: false,
    auditLog: false,
    featureFlags: false,
    onboarding: false,
    notifications: false,
    dataExport: false,
    ...overrides,
  } as any
}

describe("runDecisionEngine", () => {
  it("returns empty components by default", () => {
    const result = runDecisionEngine(input())
    expect(result.components).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })

  it("adds blockchain components", () => {
    const result = runDecisionEngine(input({ blockchain: true }))
    expect(result.components).toContain("Wallet")
    expect(result.components).toContain("RPC Provider")
  })

  it("adds auth components", () => {
    const result = runDecisionEngine(input({ auth: true }))
    expect(result.components).toContain("Auth Provider")
    expect(result.components).toContain("Login Form")
  })

  it("adds payment components", () => {
    const result = runDecisionEngine(input({ payments: true }))
    expect(result.components).toContain("Payment Gateway (Stripe/Paddle)")
    expect(result.components).toContain("Webhook Handler")
  })

  it("adds teams components", () => {
    const result = runDecisionEngine(input({ teams: true }))
    expect(result.components).toContain("Workspace Switcher")
  })

  it("adds multi-tenant components", () => {
    const result = runDecisionEngine(input({ multiTenant: true }))
    expect(result.components).toContain("Tenant Isolation Layer")
  })

  it("adds apiAccess components", () => {
    const result = runDecisionEngine(input({ apiAccess: true }))
    expect(result.components).toContain("API Key Manager")
    expect(result.components).toContain("Rate Limiter")
  })

  it("adds sso components", () => {
    const result = runDecisionEngine(input({ sso: true }))
    expect(result.components).toContain("SSO Provider Adapter")
  })

  it("generates warning when ai without memory", () => {
    const result = runDecisionEngine(input({ ai: true }))
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings[0]).toContain("IA sem memória")
  })

  it("generates warning for blockchain without auth", () => {
    const result = runDecisionEngine(input({ blockchain: true }))
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings[0]).toContain("Blockchain sem auth")
  })

  it("generates warning for payments without auth", () => {
    const result = runDecisionEngine(input({ payments: true }))
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings.some(w => w.includes("Pagamentos sem auth"))).toBe(true)
  })

  it("adds multi-gateway for payments + large scale", () => {
    const result = runDecisionEngine(input({ payments: true, users: 50000 }))
    expect(result.components).toContain("Multi-gateway Fallback")
  })

  it("scales with 100k+ users", () => {
    const result = runDecisionEngine(input({ users: 200000 }))
    expect(result.components).toContain("Redis Cache")
    expect(result.components).toContain("CDN")
  })
})
