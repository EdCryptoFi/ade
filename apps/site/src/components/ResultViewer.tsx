"use client"

interface Props {
  result: Record<string, string>
  files: Record<string, string>
  activeTab: string
  onTab: (tab: string) => void
}

export function ResultViewer({ result, files, activeTab, onTab }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 border-b border-zinc-800 pb-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Analysis complete</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Your architecture brief</h1></div><a href="/playground" className="hidden text-sm text-zinc-500 hover:text-zinc-200 sm:block">Start over</a></div>
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
