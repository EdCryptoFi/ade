import { test } from "node:test"
import assert from "node:assert/strict"
import { flattenResult } from "./format.ts"

test("flattens nested objects with dotted keys", () => {
  const flat = flattenResult({ a: { b: { c: "x" } }, d: [1, 2] })
  assert.equal(flat["a.b.c"], "x")
  assert.equal(flat.d, "1, 2")
})

test("skips files, reasoning and _meta branches", () => {
  const flat = flattenResult({ files: { "a.md": "x" }, reasoning: "r", _meta: { z: 1 }, keep: "v" })
  assert.deepEqual(Object.keys(flat), ["keep"])
})

test("keeps primitives and nulls", () => {
  const flat = flattenResult({ s: "str", n: 5, nil: null })
  assert.equal(flat.s, "str")
  assert.equal(flat.n, "5")
  assert.equal(flat.nil, "null")
})
