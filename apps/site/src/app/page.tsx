const capabilities = [
  ["Domain Analysis", "Classifies the project into categories like marketplace, dashboard, SaaS, or AI agent."],
  ["Data Decision", "Chooses data structures and storage patterns for the product."],
  ["Infrastructure", "Recommends frontend, backend, database, auth, and deployment."],
  ["Component Tree", "Generates a component tree based on the domain and features."],
  ["Development Plan", "Splits the project into sprints with clear, executable tasks."],
  ["Decision Engine", "Identifies technical risks and recommends the right components."],
]

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 border-b border-zinc-800/80 bg-zinc-950/85 px-6 py-4 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-lg bg-emerald-400 text-sm font-black text-zinc-950">A</span><span className="font-bold tracking-tight">ADE</span></a>
          <nav className="flex items-center gap-6 text-sm text-zinc-500"><a href="#capabilities" className="hidden hover:text-zinc-100 sm:block">Capabilities</a><a href="#process" className="hidden hover:text-zinc-100 sm:block">Process</a><a href="/playground" className="rounded-full border border-zinc-700 px-4 py-2 text-zinc-200 hover:border-emerald-400 hover:text-emerald-300">Open playground</a></nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-16 md:py-24">
        <section className="grid items-end gap-10 border-b border-zinc-800 pb-20 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-7"><p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">Architecture decision engine</p><h1 className="max-w-3xl text-5xl font-bold leading-[0.98] tracking-[-0.04em] md:text-7xl">Architecture before<br /><span className="text-zinc-500">the code.</span></h1><p className="max-w-2xl text-lg leading-8 text-zinc-400">ADE is an architecture layer for product engineering. Instead of inventing architecture inside a prompt, run through a decision engine that defines domain, data, infrastructure, components, and plan before any code is written.</p><div className="flex flex-wrap gap-3 pt-2"><a href="/playground" className="rounded-lg bg-emerald-400 px-6 py-3 font-semibold text-zinc-950 hover:bg-emerald-300">Try ADE</a><a href="https://github.com/EdCryptoFi/ade" className="rounded-lg border border-zinc-800 px-6 py-3 font-medium text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900">GitHub →</a></div></div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 font-mono text-sm shadow-2xl shadow-emerald-950/20"><div className="mb-6 flex items-center justify-between text-xs text-zinc-600"><span>ade / analysis</span><span className="text-emerald-400">● ready</span></div><div className="space-y-4 text-zinc-400"><p><span className="text-emerald-300">01</span> domain <span className="text-zinc-600">→</span> marketplace</p><p><span className="text-emerald-300">02</span> data <span className="text-zinc-600">→</span> relational + graph</p><p><span className="text-emerald-300">03</span> infrastructure <span className="text-zinc-600">→</span> scalable</p><div className="border-t border-zinc-800 pt-4 text-emerald-300">plan generated in 4.2s</div></div></div>
        </section>

        <section id="capabilities" className="scroll-mt-24 py-20"><div className="mb-10 max-w-xl space-y-3"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">One system, six decisions</p><h2 className="text-3xl font-bold tracking-tight">From vague idea to buildable direction.</h2></div><div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-800 md:grid-cols-2 lg:grid-cols-3">{capabilities.map(([title, desc], index) => <div key={title} className="space-y-3 bg-zinc-950 p-6 hover:bg-zinc-900"><span className="text-xs font-mono text-emerald-400">0{index + 1}</span><h3 className="text-lg font-semibold">{title}</h3><p className="text-sm leading-6 text-zinc-500">{desc}</p></div>)}</div></section>

        <section id="process" className="scroll-mt-24 border-t border-zinc-800 py-20"><div className="mb-10 space-y-3"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">The workflow</p><h2 className="text-3xl font-bold">How it works</h2></div><div className="grid gap-3 text-sm text-zinc-400 sm:grid-cols-5"><span className="rounded-lg bg-zinc-900 px-4 py-3">Idea</span><span className="rounded-lg border border-emerald-800 bg-emerald-900/30 px-4 py-3 text-emerald-300">ADE</span><span className="rounded-lg bg-zinc-900 px-4 py-3">Implementation plan</span><span className="rounded-lg bg-zinc-900 px-4 py-3">Tasks</span><span className="rounded-lg bg-zinc-900 px-4 py-3">Code</span></div></section>
      </main>
      <footer className="border-t border-zinc-800 px-6 py-6 text-center text-sm text-zinc-600">ADE — Architecture Decision Engine</footer>
    </div>
  )
}
