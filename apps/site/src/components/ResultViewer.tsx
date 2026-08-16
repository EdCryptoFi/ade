"use client"

import { useState } from "react"

interface Props {
  result: Record<string, string>
  files: Record<string, string>
  rawResult: Record<string, unknown>
  activeTab: string
  onTab: (tab: string) => void
}

export function ResultViewer({ result, files, rawResult, activeTab, onTab }: Props) {
  const [copied, setCopied] = useState("")
  const structured = (rawResult.result ?? rawResult) as Record<string, unknown>
  const scope = (structured.scope ?? {}) as Record<string, unknown>
  const securityRisks = (structured.securityRisks ?? {}) as Record<string, unknown>
  const scorecard = (securityRisks.scorecard ?? {}) as Record<string, unknown>
  const productLabels: Record<string, string> = { analysis: "Architecture Analysis", audit: "Security Audit", blueprint: "Full Blueprint" }
  const copy = async (label: string, value: string) => { await navigator.clipboard.writeText(value); setCopied(label); window.setTimeout(() => setCopied(""), 1500) }
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 border-b border-zinc-800 pb-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Analysis complete</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Your architecture brief</h1><p className="mt-2 text-sm text-zinc-500">All recommendations and artifacts below are generated in English.</p></div><a href="/playground" className="hidden text-sm text-zinc-500 hover:text-zinc-200 sm:block">Start over</a></div>
      <div className="grid gap-2 sm:grid-cols-4"><div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3"><span className="text-xs text-zinc-500">Product</span><p className="mt-1 text-sm text-zinc-200">{productLabels[String(scope.mode ?? "blueprint")] ?? "Full Blueprint"}</p></div><div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3"><span className="text-xs text-zinc-500">Estimated time</span><p className="mt-1 text-sm text-zinc-200">{String(scope.estimatedWeeks ?? 0)} weeks</p></div><div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3"><span className="text-xs text-zinc-500">Sprints</span><p className="mt-1 text-sm text-zinc-200">{String(scope.sprintCount ?? 0)}</p></div><div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3"><span className="text-xs text-zinc-500">Tasks</span><p className="mt-1 text-sm text-zinc-200">{String(scope.taskCount ?? 0)}</p></div></div>
      {Object.keys(scorecard).length > 0 && <div className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-amber-300">Security posture</p><p className="mt-1 text-sm text-zinc-300">Design-level assessment, not a production security guarantee.</p></div><span className="text-2xl font-bold text-amber-200">{String(scorecard.grade ?? "N/A")}</span></div><div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-400"><span>Critical: {String(scorecard.critical ?? 0)}</span><span>High: {String(scorecard.high ?? 0)}</span><span>Medium: {String(scorecard.medium ?? 0)}</span><span>Applicable checks: {String(scorecard.applicable ?? 0)}</span></div></div>}
      <div className="flex gap-2 overflow-x-auto border-b border-zinc-800 pb-2">
        {["summary", ...Object.keys(files)].map((key) => (
            <button
              type="button"
              key={key}
            onClick={() => onTab(key)}
              aria-pressed={activeTab === key}
              className={`px-3 py-2 rounded text-xs font-medium transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
              activeTab === key
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {key === "summary" ? "Summary" : key.replace(".md", "")}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => copy("JSON", JSON.stringify(rawResult, null, 2))} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-500">{copied === "JSON" ? "Copied JSON" : "Copy JSON"}</button><button type="button" onClick={() => copy("Markdown", activeTab === "summary" ? Object.entries(files).map(([name, content]) => `# ${name}\n\n${content}`).join("\n\n") : files[activeTab] ?? "")} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-500">{copied === "Markdown" ? "Copied Markdown" : "Copy Markdown"}</button></div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 text-xs leading-6 text-zinc-500"><strong className="font-medium text-zinc-300">Important limitations:</strong> recommendations require human review; results depend on requirement quality; a security audit is not a guarantee of security.</div>

      <div className="min-h-96 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 md:p-8">
        {activeTab === "summary" ? (
          <div className="space-y-2 text-sm">
            {Object.entries(result).map(([key, value]) => (
              <div key={key} className="grid gap-2 border-b border-zinc-800/70 py-4 first:pt-0 last:border-0 sm:grid-cols-[12rem_1fr]">
                <span className="text-xs uppercase tracking-wider text-zinc-500">{key}</span>
                <span className="text-zinc-100">{value}</span>
              </div>
            ))}
          </div>
        ) : (
          <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono">
            {files[activeTab]}
          </pre>
        )}
      </div>
    </div>
  )
}
