"use client"

import type { Feature, ProductMode } from "../lib/features"

interface Props {
  step: 1 | 2 | 3
  description: string
  domain: string
  features: Feature[]
  toggles: Record<string, boolean>
  users: string
  loading: boolean
  onDescription: (v: string) => void
  onDomain: (v: string) => void
  onToggle: (id: string) => void
  onUsers: (v: string) => void
  onNext: () => void
  onBack: () => void
  mode: ProductMode
  modes: Array<{ id: ProductMode; label: string; price: string; description: string }>
  domainOptions: readonly string[]
  onMode: (mode: ProductMode) => void
  onExample: () => void
}

export function ProjectForm({
  step,
  description,
  domain,
  features,
  toggles,
  users,
  loading,
  onDescription,
  onDomain,
  onToggle,
  onUsers,
  onNext,
  onBack,
  mode,
  modes,
  domainOptions,
  onMode,
  onExample,
}: Props) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onNext()
      }}
      className="max-w-3xl space-y-8 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 md:p-8"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
        {["Describe", "Features", "Review"].map((label, index) => (
          <span key={label} className={step === index + 1 ? "text-emerald-300" : ""}>
            <span className={`grid size-6 place-items-center rounded-full border text-[10px] ${step === index + 1 ? "border-emerald-400 bg-emerald-400/10" : "border-zinc-700"}`}>{index + 1}</span>{label}{index < 2 ? <span className="mx-1 text-zinc-700">/</span> : ""}
          </span>
        ))}
      </div>
      <p className="-mt-4 text-xs text-zinc-600">All generated architecture artifacts are written in English.</p>

      {step === 1 && <div className="space-y-3"><div className="flex items-center justify-between"><span className="text-sm font-medium">Choose a product</span><button type="button" onClick={onExample} className="text-xs text-emerald-300 hover:text-emerald-200">Use example project</button></div><div className="grid gap-2 md:grid-cols-3">{modes.map((item) => <button type="button" key={item.id} onClick={() => onMode(item.id)} className={`rounded-xl border p-4 text-left transition-colors ${mode === item.id ? "border-emerald-500 bg-emerald-950/30" : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-600"}`}><div className="flex items-start justify-between gap-2"><span className="text-sm font-semibold">{item.label}</span><span className="text-xs text-emerald-300">{item.price}</span></div><p className="mt-2 text-xs leading-5 text-zinc-500">{item.description}</p></button>)}</div></div>}

      {step === 1 && <div className="space-y-4">
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
            Domain or product category (optional)
          </label>
          <input
            id="domain"
            value={domain}
            onChange={(e) => onDomain(e.target.value)}
            placeholder="Ex: marketplace, dashboard, saas, ai-agent..."
            list="domain-options"
            className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 focus:border-zinc-600 focus:outline-none text-sm"
          />
          <datalist id="domain-options">{domainOptions.map((option) => <option key={option} value={option} />)}</datalist>
        </div>
        <div>
          <label htmlFor="users" className="block text-sm font-medium mb-2">
            Expected users (optional)
          </label>
          <input
            id="users"
            type="number"
            min="1"
            value={users}
            onChange={(e) => onUsers(e.target.value)}
            placeholder="e.g. 10000"
            className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 focus:border-emerald-600 focus:outline-none text-sm"
          />
        </div>
      </div>}

      {step === 2 && <div className="space-y-3">
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
      </div>}

      {step === 3 && <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3">
        <h2 className="text-lg font-semibold">Review your architecture brief</h2>
        <p className="text-sm text-zinc-400">ADE will use the description, domain, user estimate and selected features to generate the plan.</p>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div><span className="text-zinc-500">Domain:</span> {domain || "general"}</div>
          <div><span className="text-zinc-500">Users:</span> {users || "not specified"}</div>
          <div className="sm:col-span-2"><span className="text-zinc-500">Active features:</span> {features.filter((f) => toggles[f.id]).map((f) => f.label).join(", ") || "none selected"}</div>
        </div>
      </div>}

      <div className="flex gap-3">
        {step > 1 && <button type="button" onClick={onBack} className="px-5 py-3 rounded-lg border border-zinc-700 text-zinc-300 font-medium hover:border-zinc-500 transition-colors cursor-pointer">Back</button>}
        <button type="submit" disabled={loading} className="px-6 py-3 rounded-lg bg-emerald-400 text-zinc-950 font-semibold hover:bg-emerald-300 transition-colors disabled:opacity-50 cursor-pointer">
          {loading ? "Analyzing..." : step === 3 ? "Generate architecture" : "Continue"}
        </button>
      </div>
    </form>
  )
}
