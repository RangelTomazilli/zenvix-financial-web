import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Acesse sua conta",
    template: "%s • Zenvix Controle Financeiro",
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[15%] top-[-15%] h-[28rem] w-[28rem] rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="absolute right-[-10%] bottom-[-20%] h-[32rem] w-[32rem] rounded-full bg-sky-500/25 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.6),rgba(15,23,42,0.2))]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-between px-6 py-12 lg:flex-row lg:items-center lg:gap-14">
        <header className="max-w-xl space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium uppercase tracking-[0.3em] text-slate-200 shadow-lg shadow-indigo-500/20">
            Zenvix Finanças
          </span>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
              Organize sua família com um painel financeiro brilhante.
            </h1>
            <p className="text-base text-slate-200/85 md:text-lg">
              Controle de despesas, metas compartilhadas, convites inteligentes e
              dashboards visuais em um ambiente seguro, com alertas proativos e
              automações que trabalham por você.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-slate-200/75">
            <li className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/80 text-xs font-semibold text-white">
                1
              </span>
              Convide pessoas da sua família com um clique e controle o acesso.
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/70 text-xs font-semibold text-white">
                2
              </span>
              Dashboards em tempo real com saldo, categorias e tendências.
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/70 text-xs font-semibold text-white">
                3
              </span>
              Multiusuário de ponta a ponta com perfis e níveis de acesso inteligentes.
            </li>
          </ul>
        </header>

        <main className="mt-12 w-full max-w-md lg:mt-0">
          <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-white/85 p-10 shadow-2xl shadow-indigo-500/30 backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute right-[-35%] top-[-40%] h-64 w-64 rounded-full bg-indigo-100/40 blur-2xl" />
              <div className="absolute left-[-30%] bottom-[-45%] h-64 w-64 rounded-full bg-sky-200/30 blur-2xl" />
            </div>
            <div className="relative">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
