import { describe, expect, it } from "vitest"
import { generateArchitecture } from "./ade.ts"

const input = {
  description: "A SaaS inventory platform with teams and payments",
  domain: "saas",
  features: ["inventory", "teams", "payments"],
  users: 10000,
  auth: true,
  teams: true,
  multiTenant: true,
  payments: true,
  mode: "blueprint" as const,
}

describe("generateArchitecture contract", () => {
  it("returns the stable English result sections", () => {
    const result = generateArchitecture(input)
    expect(result.structured.summary).toMatch(/architecture/i)
    expect(result.structured.architecture.domain).toBeDefined()
    expect(result.structured.technologyStack.frontend).toBeDefined()
    expect(result.structured.dataModel.structures.length).toBeGreaterThan(0)
    expect(result.structured.developmentPlan.sprints.length).toBeGreaterThan(0)
    expect(result.structured.securityRisks.scorecard).toBeDefined()
    expect(result.structured.decisions[0]).toMatchObject({ decision: expect.any(String), reason: expect.any(String), confidence: expect.any(String) })
    expect(result.structured.scope).toMatchObject({ mode: "blueprint", sprintCount: expect.any(Number), taskCount: expect.any(Number) })
  })
})
