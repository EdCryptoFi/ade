"use client"

interface Props {
  result: Record<string, string>
  files: Record<string, string>
  activeTab: string
  onTab: (tab: string) => void
}

export function ResultViewer({ result, files, activeTab, onTab }: Props) {
  return (
    <div className="mt-8 space-y-6">
      <div className="flex gap-2 border-b border-zinc-800 pb-2">
        {["summary", ...Object.keys(files)].map((key) => (
          <button
            key={key}
            onClick={() => onTab(key)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              activeTab === key
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {key === "summary" ? "Summary" : key.replace(".md", "")}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-zinc-800 p-6 bg-zinc-900/50">
        {activeTab === "summary" ? (
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
            {files[activeTab]}
          </pre>
        )}
      </div>
    </div>
  )
}
