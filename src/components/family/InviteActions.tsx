'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface InviteActionsProps {
  token: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  canAccept: boolean;
  alreadyAccepted: boolean;
  invitationEmail: string;
  loggedEmail?: string | null;
  emailMismatch?: boolean;
  isExpired?: boolean;
  autoAccept?: boolean;
}

type ActionState = "idle" | "accepting" | "declining" | "success" | "error";

export const InviteActions = ({
  token,
  status,
  canAccept,
  alreadyAccepted,
  invitationEmail,
  loggedEmail,
  emailMismatch = false,
  isExpired = false,
  autoAccept = false,
}: InviteActionsProps) => {
  const router = useRouter();
  const [state, setState] = useState<ActionState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAction = async (action: "accept" | "decline") => {
    setState(action === "accept" ? "accepting" : "declining");
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/invites/${token}/${action}`, {
        method: "POST",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Operação não pôde ser concluída.");
      }

      const payload = await response.json().catch(() => ({}));
      setState("success");

      const redirectTo = payload.redirectTo ?? "/dashboard";
      router.replace(redirectTo);
      router.refresh();
    } catch (error) {
      setState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Erro inesperado. Tente novamente.",
      );
    }
  };

  useEffect(() => {
    if (autoAccept && canAccept && !alreadyAccepted && state === "idle") {
      handleAction("accept");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAccept, canAccept, alreadyAccepted]);

  if (status === "accepted" || alreadyAccepted) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
        <p className="font-medium text-emerald-800">
          Convite já aceito com sucesso!
        </p>
        <p className="mt-1 text-xs text-emerald-700/80">
          Você será redirecionado automaticamente para o painel da família em
          instantes.
        </p>
      </div>
    );
  }

  if (status === "expired" || isExpired) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
        <p className="font-medium text-rose-800">Este convite expirou.</p>
        <p className="mt-1 text-xs text-rose-700/80">
          Solicite que um administrador da família envie um novo convite para
          prosseguir.
        </p>
      </div>
    );
  }

  if (status === "revoked") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
        <p className="font-medium text-amber-800">
          Este convite foi cancelado pelo administrador.
        </p>
        <p className="mt-1 text-xs text-amber-700/80">
          Entre em contato com a família para solicitar um novo acesso.
        </p>
      </div>
    );
  }

  if (emailMismatch) {
    return (
      <div className="rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-slate-600">
        <p className="font-medium text-slate-800">Convite destinado a:</p>
        <p className="text-slate-800">{invitationEmail}</p>
        <p className="mt-1 text-xs text-slate-500">
          Você está autenticado como {loggedEmail ?? "outro e-mail"}. Acesse com o
          endereço convidado para aceitar ou encerre a sessão atual para trocar
          de conta.
        </p>
      </div>
    );
  }

  if (!canAccept) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-100 px-5 py-4 text-sm text-slate-600">
        <p className="font-medium text-slate-800">
          Convite disponível somente para {invitationEmail}.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Entre com o e-mail convidado para aceitar este convite.
        </p>
      </div>
    );
  }

  const isProcessing = state === "accepting" || state === "declining";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row">
        <button
          type="button"
          className="inline-flex flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:from-indigo-500 hover:to-sky-500 disabled:opacity-60"
          onClick={() => handleAction("accept")}
          disabled={isProcessing}
        >
          {state === "accepting" ? "Aceitando..." : "Aceitar convite"}
        </button>
        <button
          type="button"
          className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-60"
          onClick={() => handleAction("decline")}
          disabled={isProcessing}
        >
          {state === "declining" ? "Recusando..." : "Recusar"}
        </button>
      </div>
      {state === "error" && errorMessage ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
};
