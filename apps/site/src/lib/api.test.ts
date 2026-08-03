import { test } from "node:test"
import assert from "node:assert/strict"
import { ApiError, analyzeProject } from "./api.ts"

test("analyzeProject posts JSON and returns parsed data", async () => {
  const orig = globalThis.fetch
  globalThis.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = String(url)
    assert.ok(u.endsWith("/analyze"))
    assert.equal(init?.method, "POST")
    const body = JSON.parse(String(init?.body))
    assert.equal(body.description, "nft")
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }
  try {
    const data = await analyzeProject({ description: "nft" })
    assert.deepEqual(data, { ok: true })
  } finally {
    globalThis.fetch = orig
  }
})

test("analyzeProject surfaces the API error message (LAW-14 safe message)", async () => {
  const orig = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify({ error: "Too many requests." }), { status: 429 })
  try {
    await assert.rejects(() => analyzeProject({}), (err: Error) => {
      assert.ok(err instanceof ApiError)
      assert.equal(err.message, "Too many requests.")
      assert.equal((err as ApiError).status, 429)
      return true
    })
  } finally {
    globalThis.fetch = orig
  }
})

test("analyzeProject throws on invalid JSON response", async () => {
  const orig = globalThis.fetch
  globalThis.fetch = async () => new Response("not json", { status: 500 })
  try {
    await assert.rejects(() => analyzeProject({}), (err: Error) => {
      assert.ok(err instanceof ApiError)
      assert.match(err.message, /invalid response/)
      return true
    })
  } finally {
    globalThis.fetch = orig
  }
})
