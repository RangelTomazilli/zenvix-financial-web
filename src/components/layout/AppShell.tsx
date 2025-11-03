import Link from "next/link";
import { Navigation } from "@/components/layout/Navigation";
import { SessionProvider, type SessionData } from "@/context/session-context";
import { signOut } from "@/app/(protected)/actions";

interface AppShellProps {
  session: SessionData;
  children: React.ReactNode;
}

export const AppShell = ({ session, children }: AppShellProps) => (
  <SessionProvider value={session}>
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="text-xl font-semibold text-slate-900"
            >
              Zenvix Finanças Familiares
            </Link>
            <p className="text-sm text-slate-500">
              {session.family.name} • {session.family.currency_code}
            </p>
          </div>
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-center">
            <Navigation />
            <div className="flex items-center gap-3">
              <div className="text-right text-sm">
                <p className="font-medium text-slate-700">
                  {session.profile.full_name ?? "Conta"}
                </p>
                <p className="text-xs text-slate-500">
                  {session.user.email ?? "Sem e-mail"}
                </p>
              </div>
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600"
                >
                  Sair
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8">
        {children}
      </main>
    </div>
  </SessionProvider>
);
