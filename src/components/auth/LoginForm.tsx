'use client';

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/app/(auth)/login/actions";
import { TextField } from "@/components/forms/TextField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Callout } from "@/components/ui/Callout";

interface LoginFormProps {
  defaultEmail?: string;
  redirectTo?: string;
  registerHref?: string;
  successMessage?: string;
}

const initialState = {
  error: undefined as string | undefined,
};

export const LoginForm = ({
  defaultEmail,
  redirectTo,
  registerHref = "/register",
  successMessage,
}: LoginFormProps) => {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-6 text-slate-900"
    >
      <input type="hidden" name="redirectTo" value={redirectTo ?? "/dashboard"} />

      {successMessage ? (
        <Callout
          tone="success"
          title="Cadastro concluído!"
          description={successMessage}
          dismissible
        />
      ) : null}

      <header className="space-y-4 text-center">
        <div className="inline-flex items-center justify-center gap-2 self-center rounded-full bg-indigo-100 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-indigo-600">
          Bem-vindo de volta
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold leading-tight">
            Acesse o painel financeiro da sua família
          </h1>
          <p className="text-sm text-slate-500">
            Visualize saldos, acompanhe metas e gerencie convites em tempo real.
          </p>
        </div>
      </header>

      <div className="space-y-4">
        <TextField
          id="email"
          name="email"
          type="email"
          label="E-mail"
          placeholder="seuemail@dominio.com"
          autoComplete="email"
          defaultValue={defaultEmail}
          required
        />

        <TextField
          id="password"
          name="password"
          type="password"
          label="Senha"
          placeholder="Sua senha"
          autoComplete="current-password"
          required
        />
      </div>

      {state.error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <SubmitButton pendingLabel="Entrando..." className="mt-2 h-12 text-base">
        Entrar
      </SubmitButton>

      <div className="space-y-4 text-center text-xs text-slate-500">
        <p>
          Ainda não tem conta?{" "}
          <Link
            href={registerHref}
            className="font-medium text-indigo-600 transition hover:text-indigo-500"
          >
            Cadastre-se
          </Link>
        </p>
        <p>Proteção de dados com criptografia avançada e políticas de acesso por família.</p>
      </div>
    </form>
  );
};
