"use client"

import { useState } from "react"
import { ProjectForm } from "./ProjectForm"
import { ResultViewer } from "./ResultViewer"
import { FEATURES, buildPayload } from "../lib/features"
import { flattenResult } from "../lib/format"
import { analyzeProject } from "../lib/api"

// Container: owns state + data fetching + business transformations.
// Presentation (form, tabs) is delegated to presentational components.
export default function PlaygroundContainer() {
  const [description, setDescription] = useState("")
  const [domain, setDomain] = useState("")
  const [toggles, setToggles] = useState<Record<string, boolean>>({})
  const [result, setResult] = useState<Record<string, string> | null>(null)
  const [files, setFiles] = useState<Record<string, string> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [tab, setTab] = useState<"summary" | string>("summary")

  async function handleSubmit() {
    setLoading(true)
    setError("")
    setResult(null)
    setFiles(null)
    setTab("summary")

    const payload = buildPayload(description, domain, toggles)

    try {
      const data = await analyzeProject(payload)
      const { files: f, ...rest } = data
      setResult(flattenResult(rest))
      setFiles(f as Record<string, string>)
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
        <ProjectForm
          description={description}
          domain={domain}
          features={FEATURES}
          toggles={toggles}
          loading={loading}
          onDescription={setDescription}
          onDomain={setDomain}
          onToggle={toggleFeature}
          onSubmit={handleSubmit}
        />

        {error && (
          <div className="mt-8 p-4 rounded-lg bg-red-900/20 border border-red-800 text-red-300 text-sm">
            {error}
          </div>
        )}

        {result && files && (
          <ResultViewer result={result} files={files} activeTab={tab} onTab={setTab} />
        )}
      </main>
    </div>
  )
}
