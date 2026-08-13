import { describe, expect, it } from "vitest"
import { generateSettings, inputFromSettings, recommendFeatures } from "./settings.ts"

function input(overrides: Record<string, unknown> = {}) {
  return {
    description: "app de teste",
    domain: "saas",
    features: ["test"],
    ...overrides,
  }
}

describe("recommendFeatures", () => {
  it("detects features from description text", () => {
    const features = recommendFeatures(input({ description: "pagamentos via PIX" }))
    const payments = features.find((f) => f.key === "payments")
    expect(payments?.recommended).toBe(true)
  })

  it("keeps ai false for fiscal words (regression)", () => {
    const features = recommendFeatures(
      input({ description: "controle de pagamentos e emissão de notas fiscais" }),
    )
    const ai = features.find((f) => f.key === "ai")
    expect(ai?.recommended).toBe(false)
  })

  it("explicit input flags win over text-only heuristics", () => {
    const features = recommendFeatures(input({ auth: true, sso: true }))
    expect(features.find((f) => f.key === "auth")?.recommended).toBe(true)
    expect(features.find((f) => f.key === "sso")?.recommended).toBe(true)
  })

  it("does not force flags that are explicitly false", () => {
    const features = recommendFeatures(input({ blockchain: false }))
    expect(features.find((f) => f.key === "blockchain")?.recommended).toBe(false)
  })
})

describe("inputFromSettings round-trip", () => {
  it("preserves explicitly requested flags", () => {
    const settings = generateSettings(input({ auth: true, payments: true }))
    const roundTrip = inputFromSettings(settings.features)
    expect(roundTrip.auth).toBe(true)
    expect(roundTrip.payments).toBe(true)
  })

  it("does not invent flags that were never requested", () => {
    const settings = generateSettings(input({}))
    const roundTrip = inputFromSettings(settings.features)
    expect(roundTrip.blockchain).toBeUndefined()
  })
})
