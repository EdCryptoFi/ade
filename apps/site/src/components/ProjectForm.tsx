"use client"

import type { Feature } from "../lib/features"

interface Props {
  description: string
  domain: string
  features: Feature[]
  toggles: Record<string, boolean>
  loading: boolean
  onDescription: (v: string) => void
  onDomain: (v: string) => void
  onToggle: (id: string) => void
  onSubmit: () => void
}

export function ProjectForm({
  description,
  domain,
  features,
  toggles,
  loading,
  onDescription,
  onDomain,
  onToggle,
  onSubmit,
}: Props) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="space-y-8"
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-2">
            Project description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => onDescription(e.target.value)}
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
            onChange={(e) => onDomain(e.target.value)}
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
              onClick={() => onToggle(f.id)}
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
  )
}
