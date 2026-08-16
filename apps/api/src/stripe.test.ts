import assert from "node:assert/strict"
import { test } from "node:test"
import { verifyStripeSignature, createCheckoutSession } from "./stripe.ts"

const SECRET = "whsec_test_secret"

async function signPayload(payload: string, secret: string, timestamp = Math.floor(Date.now() / 1000)) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${payload}`))
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("")
  return `t=${timestamp},v1=${hex}`
}

test("verifyStripeSignature accepts a correctly signed payload", async () => {
  const payload = JSON.stringify({ type: "checkout.session.completed" })
  const header = await signPayload(payload, SECRET)
  assert.equal(await verifyStripeSignature(payload, header, SECRET), true)
})

test("verifyStripeSignature rejects a tampered payload (signature no longer matches)", async () => {
  const payload = JSON.stringify({ type: "checkout.session.completed" })
  const header = await signPayload(payload, SECRET)
  const tampered = JSON.stringify({ type: "checkout.session.completed", amount: 0 })
  assert.equal(await verifyStripeSignature(tampered, header, SECRET), false)
})

test("verifyStripeSignature rejects a signature made with the wrong secret", async () => {
  const payload = JSON.stringify({ type: "checkout.session.completed" })
  const header = await signPayload(payload, "whsec_wrong")
  assert.equal(await verifyStripeSignature(payload, header, SECRET), false)
})

test("verifyStripeSignature rejects a stale timestamp (replay protection)", async () => {
  const payload = JSON.stringify({ type: "checkout.session.completed" })
  const staleTimestamp = Math.floor(Date.now() / 1000) - 10_000
  const header = await signPayload(payload, SECRET, staleTimestamp)
  assert.equal(await verifyStripeSignature(payload, header, SECRET), false)
})

test("verifyStripeSignature rejects a missing or malformed header", async () => {
  const payload = "{}"
  assert.equal(await verifyStripeSignature(payload, null, SECRET), false)
  assert.equal(await verifyStripeSignature(payload, "garbage", SECRET), false)
  assert.equal(await verifyStripeSignature(payload, "t=123", SECRET), false)
})

test("createCheckoutSession posts the expected params and returns { id, url }", async () => {
  const originalFetch = globalThis.fetch
  let capturedUrl = ""
  let capturedBody = ""
  globalThis.fetch = (async (input: any, init: any) => {
    capturedUrl = String(input)
    capturedBody = String(init.body)
    return new Response(JSON.stringify({ id: "cs_test_123", url: "https://checkout.stripe.com/pay/cs_test_123" }), { status: 200 })
  }) as typeof fetch

  try {
    const session = await createCheckoutSession({
      secretKey: "sk_test_x",
      priceId: "price_123",
      successUrl: "https://ade-vibe.vercel.app/success",
      cancelUrl: "https://ade-vibe.vercel.app/playground",
      clientReferenceId: "pending-abc",
      customerEmail: "buyer@example.com",
    })

    assert.equal(capturedUrl, "https://api.stripe.com/v1/checkout/sessions")
    assert.match(capturedBody, /mode=payment/)
    assert.match(capturedBody, /client_reference_id=pending-abc/)
    assert.match(capturedBody, /customer_email=buyer%40example\.com/)
    assert.deepEqual(session, { id: "cs_test_123", url: "https://checkout.stripe.com/pay/cs_test_123" })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("createCheckoutSession throws on a Stripe error response", async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response("bad request", { status: 400 })) as typeof fetch
  try {
    await assert.rejects(() =>
      createCheckoutSession({
        secretKey: "sk_test_x",
        priceId: "price_123",
        successUrl: "https://x/success",
        cancelUrl: "https://x/cancel",
        clientReferenceId: "pending-abc",
      }),
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})
