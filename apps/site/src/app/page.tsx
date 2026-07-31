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
            Arquitetura antes
            <br />
            <span className="text-zinc-500">do código.</span>
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl">
            ADE é uma camada de arquitetura para Vibe Coding. Em vez de ir direto da ideia para o prompt,
            você passa por um motor de decisões que define domínio, dados, infraestrutura, componentes e plano.
          </p>
          <div className="flex gap-4 pt-4">
            <a
              href="/playground"
              className="inline-flex items-center px-6 py-3 rounded-lg bg-zinc-100 text-zinc-900 font-medium hover:bg-zinc-200 transition-colors"
            >
              Testar ADE
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
            { title: "Domain Analysis", desc: "Classifica o projeto em categorias como marketplace, dashboard, SaaS, AI Agent." },
            { title: "Data Decision", desc: "Escolhe estruturas de dados: Arrays, Hash Maps, Grafos." },
            { title: "Infrastructure", desc: "Recomenda frontend, backend, banco, storage, auth, deploy." },
            { title: "Component Tree", desc: "Gera árvore de componentes baseada no domínio." },
            { title: "Development Plan", desc: "Divide o projeto em sprints com tarefas claras." },
            { title: "Decision Engine", desc: "Motor de regras que identifica riscos e recomenda componentes." },
          ].map((item) => (
            <div key={item.title} className="p-6 rounded-xl border border-zinc-800 space-y-2">
              <h3 className="font-semibold text-lg">{item.title}</h3>
              <p className="text-sm text-zinc-500">{item.desc}</p>
            </div>
          ))}
        </section>

        <section className="space-y-6">
          <h2 className="text-3xl font-bold">Como funciona</h2>
          <div className="flex flex-col md:flex-row items-center gap-4 text-sm text-zinc-400">
            <span className="px-4 py-2 rounded-lg bg-zinc-900">Ideia</span>
            <span className="text-zinc-600">→</span>
            <span className="px-4 py-2 rounded-lg bg-emerald-900/50 text-emerald-300 border border-emerald-800">
              ADE
            </span>
            <span className="text-zinc-600">→</span>
            <span className="px-4 py-2 rounded-lg bg-zinc-900">Implementation Plan</span>
            <span className="text-zinc-600">→</span>
            <span className="px-4 py-2 rounded-lg bg-zinc-900">Tasks</span>
            <span className="text-zinc-600">→</span>
            <span className="px-4 py-2 rounded-lg bg-zinc-900">Código</span>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-800 px-6 py-6 text-center text-sm text-zinc-600">
        ADE — Architecture Decision Engine
      </footer>
    </div>
  )
}
