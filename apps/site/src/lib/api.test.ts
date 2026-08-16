import { test } from "node:test"
import assert from "node:assert/strict"
import { ApiError, analyzeProject, startCheckout, getCheckoutStatus } from "./api.ts"

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

test("startCheckout posts to /checkout and returns the redirect URL", async () => {
  const orig = globalThis.fetch
  globalThis.fetch = async (url: RequestInfo | URL) => {
    assert.ok(String(url).endsWith("/checkout"))
    return new Response(JSON.stringify({ result: { url: "https://checkout.stripe.com/pay/cs_test_1", id: "cs_test_1" } }), { status: 200 })
  }
  try {
    const session = await startCheckout({ description: "nft" })
    assert.deepEqual(session, { url: "https://checkout.stripe.com/pay/cs_test_1", id: "cs_test_1" })
  } finally {
    globalThis.fetch = orig
  }
})

test("startCheckout throws when the server omits the redirect URL", async () => {
  const orig = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify({ result: {} }), { status: 200 })
  try {
    await assert.rejects(() => startCheckout({}), /redirect URL/)
  } finally {
    globalThis.fetch = orig
  }
})

test("getCheckoutStatus reports pending until the webhook has fulfilled the session", async () => {
  const orig = globalThis.fetch
  globalThis.fetch = async (url: RequestInfo | URL) => {
    assert.ok(String(url).endsWith("/checkout/cs_test_1/status"))
    return new Response(JSON.stringify({ status: "pending" }), { status: 200 })
  }
  try {
    assert.deepEqual(await getCheckoutStatus("cs_test_1"), { status: "pending" })
  } finally {
    globalThis.fetch = orig
  }
})

test("getCheckoutStatus falls back to pending on a non-OK response instead of throwing", async () => {
  const orig = globalThis.fetch
  globalThis.fetch = async () => new Response("error", { status: 500 })
  try {
    assert.deepEqual(await getCheckoutStatus("cs_test_1"), { status: "pending" })
  } finally {
    globalThis.fetch = orig
  }
})
