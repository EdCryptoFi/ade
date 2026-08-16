"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { getCheckoutStatus } from "../../lib/api"

// Polls the Worker instead of trusting anything in the URL: the redirect
// here only means Stripe sent the browser back, not that the webhook has
// confirmed payment yet (LAW-1/LAW-8 — fulfillment lives server-side).
const POLL_INTERVAL_MS = 1500
const MAX_ATTEMPTS = 20 // ~30s

export default function SuccessView() {
  const params = useSearchParams()
  const sessionId = params.get("session_id")
  const [reportUrl, setReportUrl] = useState<string | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (!sessionId) return
    let attempts = 0
    let cancelled = false

    const timer = setInterval(async () => {
      attempts += 1
      const status = await getCheckoutStatus(sessionId)
      if (cancelled) return
      if (status.status === "ready" && status.url) {
        setReportUrl(status.url)
        clearInterval(timer)
      } else if (attempts >= MAX_ATTEMPTS) {
        setTimedOut(true)
        clearInterval(timer)
      }
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [sessionId])

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800/80 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <a href="/" className="text-xl font-bold tracking-tight hover:text-zinc-300 transition-colors">ADE</a>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-6 py-20 w-full text-center space-y-6">
        {!sessionId && (
          <>
            <h1 className="text-2xl font-bold">No checkout session found</h1>
            <p className="text-zinc-400">Start a new blueprint from the playground.</p>
            <a href="/playground" className="inline-block px-6 py-3 rounded-lg bg-emerald-400 text-zinc-950 font-semibold hover:bg-emerald-300 transition-colors">Back to playground</a>
          </>
        )}

        {sessionId && reportUrl && (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Payment confirmed</p>
            <h1 className="text-3xl font-bold tracking-tight">Your blueprint is ready.</h1>
            <p className="text-zinc-400">This link stays live for 90 days — save it, it won't be shown again here.</p>
            <a href={reportUrl} target="_blank" rel="noopener noreferrer" className="inline-block px-6 py-3 rounded-lg bg-emerald-400 text-zinc-950 font-semibold hover:bg-emerald-300 transition-colors">Open your blueprint</a>
          </>
        )}

        {sessionId && !reportUrl && !timedOut && (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Payment confirmed</p>
            <h1 className="text-3xl font-bold tracking-tight">Generating your blueprint...</h1>
            <p className="text-zinc-400">This usually takes a few seconds.</p>
            <div className="mx-auto size-8 rounded-full border-2 border-zinc-700 border-t-emerald-400 animate-spin" />
          </>
        )}

        {sessionId && !reportUrl && timedOut && (
          <>
            <h1 className="text-2xl font-bold">Still working on it</h1>
            <p className="text-zinc-400">Payment went through, but generation is taking longer than expected. Refresh this page in a minute — your session id is saved in the URL.</p>
          </>
        )}
      </main>
    </div>
  )
}
