import { describe, it, expect } from "vitest"
import { runSecurityAudit } from "./security-audit.ts"

function input(overrides: Record<string, any> = {}) {
  return {
    description: "test",
    domain: "saas",
    features: ["auth"],
    auth: false,
    payments: false,
    upload: false,
    multiTenant: false,
    teams: false,
    apiAccess: false,
    webhooks: false,
    sso: false,
    auditLog: false,
    ai: false,
    ...overrides,
  }
}

describe("runSecurityAudit", () => {
  it("returns all 15 laws", () => {
    const result = runSecurityAudit(input())
    expect(result.laws).toHaveLength(15)
  })

  it("returns all 12 attack vectors", () => {
    const result = runSecurityAudit(input())
    expect(result.attackVectors).toHaveLength(12)
  })

  it("returns all 10 anti-patterns", () => {
    const result = runSecurityAudit(input())
    expect(result.antiPatterns).toHaveLength(10)
  })

  it("marks IDOR/BOLA as applicable when auth is enabled", () => {
    const result = runSecurityAudit(input({ auth: true }))
    const idor = result.attackVectors.find((v) => v.id === "VECTOR-1")
    expect(idor?.applicable).toBe(true)
  })

  it("marks IDOR/BOLA as not applicable without auth", () => {
    const result = runSecurityAudit(input())
    const idor = result.attackVectors.find((v) => v.id === "VECTOR-1")
    expect(idor?.applicable).toBe(false)
  })

  it("marks race condition as applicable with payments", () => {
    const result = runSecurityAudit(input({ payments: true }))
    const race = result.attackVectors.find((v) => v.id === "VECTOR-3")
    expect(race?.applicable).toBe(true)
  })

  it("marks RLS/tenant leak applicable for multi-tenant", () => {
    const result = runSecurityAudit(input({ multiTenant: true }))
    const rls = result.attackVectors.find((v) => v.id === "VECTOR-11")
    expect(rls?.applicable).toBe(true)
  })

  it("always applies the never-trust-the-client law", () => {
    const result = runSecurityAudit(input())
    const law1 = result.laws.find((l) => l.id === "LAW-1")
    expect(law1?.applicable).toBe(true)
  })

  it("does not claim vulnerabilities without inspecting code", () => {
    const result = runSecurityAudit(input())
    expect(result.scorecard.grade).toBe("N/A")
    expect(result.scorecard.assessment).toBe("design-checklist")
    expect(result.scorecard.critical).toBe(0)
    expect(result.scorecard.vibeAntiPatterns).toEqual([])
    expect(result.scorecard.applicable).toBeGreaterThan(0)
    expect(result.scorecard.summary).toContain("no code vulnerabilities")
  })

  it("produces top actions, red team and blue team", () => {
    const result = runSecurityAudit(input({ auth: true, payments: true }))
    expect(result.topActions.length).toBeGreaterThan(0)
    expect(result.redTeam.length).toBeGreaterThan(0)
    expect(result.blueTeam.length).toBeGreaterThan(0)
    expect(result.securityTests.length).toBeGreaterThan(0)
  })

  it("includes security-audit file in the architecture plan", async () => {
    const { generateArchitecture } = await import("./ade.ts")
    const plan = generateArchitecture(input({ auth: true, payments: true }) as any)
    expect(plan.files["security-audit.md"]).toContain("Scorecard")
    expect(plan.securityAudit.laws).toHaveLength(15)
  })
})
