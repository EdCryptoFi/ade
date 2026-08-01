export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">ADE</h1>
          <span className="text-sm text-zinc-500">Architecture Decision Engine</span>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-6 py-20 space-y-24">
        <section className="space-y-6">
          <h2 className="text-5xl font-bold tracking-tight">
            Architecture before
            <br />
            <span className="text-zinc-500">the code.</span>
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl">
            ADE is an architecture layer for product engineering. Instead of inventing the architecture
            inside a prompt, you run through a decision engine that defines domain, data, infrastructure,
            components, and plan — before any code is written.
          </p>
          <div className="flex gap-4 pt-4">
            <a
              href="/playground"
              className="inline-flex items-center px-6 py-3 rounded-lg bg-zinc-100 text-zinc-900 font-medium hover:bg-zinc-200 transition-colors"
            >
              Try ADE
            </a>
            <a
              href="https://github.com/EdCryptoFi/ade"
              className="inline-flex items-center px-6 py-3 rounded-lg border border-zinc-800 text-zinc-300 font-medium hover:bg-zinc-900 transition-colors"
            >
              GitHub →
            </a>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: "Domain Analysis", desc: "Classifies the project into categories like marketplace, dashboard, SaaS, AI Agent." },
            { title: "Data Decision", desc: "Chooses data structures: Arrays, Hash Maps, Graphs." },
            { title: "Infrastructure", desc: "Recommends frontend, backend, database, storage, auth, deploy." },
            { title: "Component Tree", desc: "Generates a component tree based on the domain." },
            { title: "Development Plan", desc: "Splits the project into sprints with clear tasks." },
            { title: "Decision Engine", desc: "Rules engine that identifies risks and recommends components." },
          ].map((item) => (
            <div key={item.title} className="p-6 rounded-xl border border-zinc-800 space-y-2">
              <h3 className="font-semibold text-lg">{item.title}</h3>
              <p className="text-sm text-zinc-500">{item.desc}</p>
            </div>
          ))}
        </section>

        <section className="space-y-6">
          <h2 className="text-3xl font-bold">How it works</h2>
          <div className="flex flex-col md:flex-row items-center gap-4 text-sm text-zinc-400">
            <span className="px-4 py-2 rounded-lg bg-zinc-900">Idea</span>
            <span className="text-zinc-600">→</span>
            <span className="px-4 py-2 rounded-lg bg-emerald-900/50 text-emerald-300 border border-emerald-800">
              ADE
            </span>
            <span className="text-zinc-600">→</span>
            <span className="px-4 py-2 rounded-lg bg-zinc-900">Implementation Plan</span>
            <span className="text-zinc-600">→</span>
            <span className="px-4 py-2 rounded-lg bg-zinc-900">Tasks</span>
            <span className="text-zinc-600">→</span>
            <span className="px-4 py-2 rounded-lg bg-zinc-900">Code</span>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-800 px-6 py-6 text-center text-sm text-zinc-600">
        ADE — Architecture Decision Engine
      </footer>
    </div>
  )
}
