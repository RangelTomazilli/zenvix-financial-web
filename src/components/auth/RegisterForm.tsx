'use client';

import Link from "next/link";
import { useActionState } from "react";
import { registerAction } from "@/app/(auth)/register/actions";
import { TextField } from "@/components/forms/TextField";
import { SubmitButton } from "@/components/forms/SubmitButton";

interface RegisterFormProps {
  defaultEmail?: string;
  redirectTo?: string;
  loginHref?: string;
}

const initialState = {
  error: undefined as string | undefined,
};

export const RegisterForm = ({
  defaultEmail,
  redirectTo,
  loginHref = "/login",
}: RegisterFormProps) => {
  const [state, formAction] = useActionState(registerAction, initialState);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-6 text-slate-900"
    >
      <input type="hidden" name="redirectTo" value={redirectTo ?? "/dashboard"} />

      <header className="space-y-4 text-center">
        <div className="inline-flex items-center justify-center gap-2 self-center rounded-full bg-emerald-100 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">
          Nova conta
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold leading-tight">
            Crie sua base financeira compartilhada
          </h1>
          <p className="text-sm text-slate-500">
            Convide familiares, personalize categorias e tenha clareza sobre cada
            centavo em poucos minutos.
          </p>
        </div>
      </header>

      <div className="space-y-4">
        <TextField
          id="fullName"
          name="fullName"
          type="text"
          label="Nome completo"
          placeholder="Maria Silva"
          autoComplete="name"
          required
        />

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
          placeholder="Crie uma senha"
          autoComplete="new-password"
          minLength={6}
          required
        />
      </div>

      {state.error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <SubmitButton pendingLabel="Criando conta..." className="mt-2 h-12 text-base">
        Cadastrar
      </SubmitButton>

      <div className="space-y-4 text-center text-xs text-slate-500">
        <p>
          Já possui uma conta?{" "}
          <Link
            href={loginHref}
            className="font-medium text-indigo-600 transition hover:text-indigo-500"
          >
            Entrar
          </Link>
        </p>
        <p>Convites expiram automaticamente e apenas e-mails autorizados acessam a família.</p>
      </div>
    </form>
  );
};
