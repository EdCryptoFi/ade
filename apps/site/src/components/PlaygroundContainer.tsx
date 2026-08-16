"use client"

import { useState } from "react"
import { ProjectForm } from "./ProjectForm"
import { ResultViewer } from "./ResultViewer"
import { FEATURES, PRODUCT_MODES, DOMAIN_OPTIONS, EXAMPLE_PROJECT, buildPayload, type ProductMode } from "../lib/features"
import { flattenResult } from "../lib/format"
import { analyzeProject, auditProject } from "../lib/api"

// Container: owns state + data fetching + business transformations.
// Presentation (form, tabs) is delegated to presentational components.
export default function PlaygroundContainer() {
  const [description, setDescription] = useState("")
  const [domain, setDomain] = useState("")
  const [users, setUsers] = useState("")
  const [toggles, setToggles] = useState<Record<string, boolean>>({})
  const [result, setResult] = useState<Record<string, string> | null>(null)
  const [files, setFiles] = useState<Record<string, string> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [tab, setTab] = useState<"summary" | string>("summary")
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [mode, setMode] = useState<ProductMode>("blueprint")
  const [rawResult, setRawResult] = useState<Record<string, unknown> | null>(null)

  async function handleSubmit() {
    setLoading(true)
    setError("")
    setResult(null)
    setFiles(null)
    setTab("summary")
    setRawResult(null)

    const payload = buildPayload(description, domain, toggles, Number(users), mode)

    try {
      const data = mode === "audit" ? await auditProject(payload) : await analyzeProject(payload)
      const envelope = (data.result ?? data) as Record<string, unknown>
      const artifacts = (envelope.artifacts ?? data.files) as Record<string, string> | undefined
      setRawResult(data)
      setResult(flattenResult(envelope))
      setFiles(artifacts ?? {})
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
      setStep(3)
    }
  }

  function nextStep() {
    if (step === 3) {
      void handleSubmit()
      return
    }
    setStep((step + 1) as 1 | 2 | 3)
  }

  function toggleFeature(id: string) {
    setToggles((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function loadExample() {
    setDescription(EXAMPLE_PROJECT.description)
    setDomain(EXAMPLE_PROJECT.domain)
    setUsers(EXAMPLE_PROJECT.users)
    setMode(EXAMPLE_PROJECT.mode)
    setToggles(EXAMPLE_PROJECT.toggles)
    setStep(1)
    setError("")
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800/80 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <a href="/" className="text-xl font-bold tracking-tight hover:text-zinc-300 transition-colors">
            ADE
          </a>
          <div className="flex items-center gap-3 text-sm"><span className="size-2 rounded-full bg-emerald-400" /><span className="text-zinc-500">Architecture playground</span></div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-6 py-12 w-full">
        {!result && <div className="mb-10 max-w-2xl space-y-3"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">New architecture brief</p><h1 className="text-4xl font-bold tracking-tight md:text-5xl">Shape the system<br /><span className="text-zinc-500">before building it.</span></h1><p className="text-zinc-400">Answer a few focused questions. ADE will turn your product idea into a technical direction you can act on.</p></div>}
        {!result && <ProjectForm
          step={step}
          description={description}
          domain={domain}
          features={FEATURES}
          toggles={toggles}
          users={users}
          loading={loading}
          onDescription={setDescription}
          onDomain={setDomain}
          onToggle={toggleFeature}
          onUsers={setUsers}
          onNext={nextStep}
          onBack={() => setStep((step - 1) as 1 | 2 | 3)}
          mode={mode}
          modes={PRODUCT_MODES}
          domainOptions={DOMAIN_OPTIONS}
          onMode={setMode}
          onExample={loadExample}
        />
        }

        {error && (
          <div className="mt-8 p-4 rounded-lg bg-red-900/20 border border-red-800 text-red-300 text-sm">
            {error}
          </div>
        )}

        {result && rawResult && files && (
          <ResultViewer result={result} rawResult={rawResult} files={files} activeTab={tab} onTab={setTab} />
        )}
      </main>
    </div>
  )
}
