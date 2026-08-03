import { describe, it, expect } from "vitest"
import { validate, validatePartial } from "./validation"

describe("VULN: mass assignment protection (LAW-2)", () => {
  it("rejects unexpected fields in a full payload", () => {
    const body = {
      description: "NFT marketplace with wallet auth",
      domain: "marketplace",
      features: ["wallet"],
      isAdmin: true,
      credits: 999,
    }
    expect(() => validate(body)).toThrow(/Unrecognized key/)
  })

  it("rejects unexpected fields in a partial payload", () => {
    expect(() => validatePartial({ description: "abc", role: "admin" })).toThrow(/Unrecognized key/)
  })
})

describe("VULN: size limits (LAW-3)", () => {
  it("rejects more than 50 features", () => {
    const body = {
      description: "scalable platform",
      domain: "saas",
      features: Array.from({ length: 51 }, (_, i) => `feature-${i}`),
    }
    expect(() => validate(body)).toThrow(/50 features/)
  })

  it("rejects an over-long feature string", () => {
    const body = {
      description: "scalable platform",
      domain: "saas",
      features: ["x".repeat(201)],
    }
    expect(() => validate(body)).toThrow()
  })

  it("rejects a negative or absurd users count", () => {
    expect(() => validate({ description: "app", domain: "saas", features: ["a"], users: -1 })).toThrow()
    expect(() =>
      validate({ description: "app", domain: "saas", features: ["a"], users: 1_000_000_001 }),
    ).toThrow()
  })
})

describe("valid payloads still pass (regression)", () => {
  it("accepts a canonical project input", () => {
    const input = validate({
      description: "NFT marketplace with wallet auth",
      domain: "marketplace",
      features: ["wallet", "payments"],
      users: 1000,
      auth: true,
    })
    expect(input.features).toHaveLength(2)
    expect(input.auth).toBe(true)
  })

  it("applies boolean defaults", () => {
    const input = validate({ description: "app", domain: "saas", features: ["a"] })
    expect(input.blockchain).toBe(false)
  })
})
