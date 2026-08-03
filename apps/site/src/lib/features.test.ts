import { test } from "node:test"
import assert from "node:assert/strict"
import { extractFeatureList, buildPayload } from "./features.ts"

test("extractFeatureList splits on commas, semicolons and newlines", () => {
  assert.deepEqual(extractFeatureList("wallet,payments\n ai; chat"), ["wallet", "payments", "ai", "chat"])
})

test("extractFeatureList trims and drops empties", () => {
  assert.deepEqual(extractFeatureList("  a , , b "), ["a", "b"])
})

test("extractFeatureList caps at 50 features (LAW-3)", () => {
  const many = Array.from({ length: 80 }, (_, i) => `f${i}`).join(",")
  assert.equal(extractFeatureList(many).length, 50)
})

test("buildPayload uses fallback domain and merges active toggles", () => {
  const payload = buildPayload("nft, marketplace", "", { auth: true, payments: false })
  assert.equal(payload.domain, "general")
  assert.deepEqual(payload.features, ["nft", "marketplace"])
  assert.equal(payload.auth, true)
  assert.equal(payload.payments, undefined)
})
