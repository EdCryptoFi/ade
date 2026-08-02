"use client"

import { useState } from "react"

interface Feature {
  id: string
  label: string
  key: string
  type: "boolean" | "number"
}

const features: Feature[] = [
  { id: "blockchain", label: "Blockchain", key: "blockchain", type: "boolean" },
  { id: "auth", label: "Authentication", key: "auth", type: "boolean" },
  { id: "upload", label: "Upload", key: "upload", type: "boolean" },
  { id: "realtime", label: "Real-time", key: "realtime", type: "boolean" },
  { id: "payments", label: "Payments", key: "payments", type: "boolean" },
  { id: "ai", label: "AI", key: "ai", type: "boolean" },
  { id: "aiMemory", label: "AI Memory", key: "aiMemory", type: "boolean" },
]

function flattenResult(obj: unknown, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (key === "files" || key === "reasoning" || key === "_meta") continue
    if (typeof value === "string" || typeof value === "number" || value === null) {
      result[prefix + key] = String(value)
    } else if (Array.isArray(value)) {
      result[prefix + key] = value.join(", ")
    } else if (typeof value === "object" && value !== null) {
      Object.assign(result, flattenResult(value, prefix + key + "."))
    }
  }
  return result
}

export default function Playground() {
  const [description, setDescription] = useState("")
  const [domain, setDomain] = useState("")
  const [toggles, setToggles] = useState<Record<string, boolean>>({})
  const [result, setResult] = useState<Record<string, string> | null>(null)
  const [files, setFiles] = useState<Record<string, string> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [tab, setTab] = useState<"summary" | string>("summary")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setResult(null)
    setFiles(null)

    const featuresList = description
      .split(/[,;\n]/)
      .map((f) => f.trim())
      .filter(Boolean)

    const payload: Record<string, unknown> = {
      description,
      domain: domain || "general",
      features: featuresList,
      ...Object.fromEntries(
        Object.entries(toggles).filter(([, v]) => v),
      ),
    }

    try {
      const res = await fetch("https://ade-api.cryptolairbr.workers.dev/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Request failed")
      }

      const data = await res.json()
      const { files: f, ...rest } = data
      setResult(flattenResult(rest))
      setFiles(f)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  function toggleFeature(id: string) {
    setToggles((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a href="/" className="text-xl font-bold tracking-tight hover:text-zinc-300 transition-colors">
            ADE
          </a>
          <span className="text-sm text-zinc-500">Playground</span>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-6 py-12 w-full">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-4">
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2">
                Project description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: NFT marketplace with dashboard, wallet auth, real-time feed..."
                rows={4}
                className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 focus:border-zinc-600 focus:outline-none resize-none text-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="domain" className="block text-sm font-medium mb-2">
                Domain (optional)
              </label>
              <input
                id="domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="Ex: marketplace, dashboard, saas, ai-agent..."
                className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 focus:border-zinc-600 focus:outline-none text-sm"
              />
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-sm font-medium">Additional features</span>
            <div className="flex flex-wrap gap-2">
              {features.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggleFeature(f.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    toggles[f.id]
                      ? "bg-emerald-900/50 text-emerald-300 border border-emerald-700"
                      : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-600"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-lg bg-zinc-100 text-zinc-900 font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            {loading ? "Analyzing..." : "Run ADE"}
          </button>
        </form>

        {error && (
          <div className="mt-8 p-4 rounded-lg bg-red-900/20 border border-red-800 text-red-300 text-sm">
            {error}
          </div>
        )}

        {result && files && (
          <div className="mt-8 space-y-6">
            <div className="flex gap-2 border-b border-zinc-800 pb-2">
              {["summary", ...Object.keys(files)].map((key) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    tab === key
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {key === "summary" ? "Summary" : key.replace(".md", "")}
                </button>
              ))}
            </div>

            <div className="rounded-lg border border-zinc-800 p-6 bg-zinc-900/50">
              {tab === "summary" ? (
                <div className="space-y-2 text-sm">
                  {Object.entries(result).map(([key, value]) => (
                    <div key={key} className="flex gap-4">
                      <span className="text-zinc-500 w-48 shrink-0">{key}</span>
                      <span className="text-zinc-100">{value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono">
                  {files[tab]}
                </pre>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
