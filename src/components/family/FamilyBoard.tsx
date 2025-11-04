'use client';

import { useState } from "react";
import { TextField } from "@/components/forms/TextField";
import type { Family, Profile } from "@/types/database";
import type { FamilyInvite } from "@/data/invites";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const INVITE_TTL_DAYS = Number(
  process.env.NEXT_PUBLIC_FAMILY_INVITE_TTL_DAYS ?? "7",
);

interface FamilyBoardProps {
  family: Family;
  members: Profile[];
  currentProfileId: string;
  currentProfileRole: Profile["role"];
  invites: FamilyInvite[];
}

interface MessageState {
  type: "success" | "error";
  text: string;
}

export const FamilyBoard = ({
  family,
  members: initialMembers,
  currentProfileId,
  currentProfileRole,
  invites: initialInvites,
}: FamilyBoardProps) => {
  const [name, setName] = useState(family.name);
  const [currencyCode, setCurrencyCode] = useState(family.currency_code);
  const [members, setMembers] = useState(initialMembers);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invites, setInvites] = useState(initialInvites);
  const [message, setMessage] = useState<MessageState | null>(null);
  const [updatingFamily, setUpdatingFamily] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const isOwner = currentProfileRole === "owner";

  const showMessage = (next: MessageState) => {
    setMessage(next);
    setTimeout(() => setMessage(null), 3500);
  };

  const integrateInvite = (
    nextInvite: FamilyInvite,
    previousInviteId?: string,
  ) => {
    setInvites((prev) => {
      const withStatusUpdates = prev.map((item) => {
        if (
          previousInviteId &&
          item.id === previousInviteId &&
          previousInviteId !== nextInvite.id &&
          item.status !== "expired"
        ) {
          return { ...item, status: "expired" };
        }
        return item;
      });

      const existingIndex = withStatusUpdates.findIndex(
        (item) => item.id === nextInvite.id,
      );
      if (existingIndex >= 0) {
        const updated = [...withStatusUpdates];
        updated[existingIndex] = nextInvite;
        return updated;
      }

      return [nextInvite, ...withStatusUpdates];
    });
  };

  const submitInvite = async (targetEmail: string) => {
    const normalizedEmail = targetEmail.trim();
    const response = await fetch("/api/families/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: normalizedEmail,
        familyId: family.id,
        familyName: name,
      }),
    });

    const payload = (await response.json()) as {
      invite?: FamilyInvite;
      reused?: boolean;
      error?: string;
    };

    if (!response.ok || !payload?.invite) {
      throw new Error(payload?.error ?? "Erro ao enviar convite");
    }

    return payload;
  };

  const handleSaveFamily = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUpdatingFamily(true);

    try {
      const response = await fetch("/api/families", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, currencyCode }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Erro ao atualizar a família");
      }

      showMessage({ type: "success", text: "Dados atualizados com sucesso." });
    } catch (error) {
      console.error(error);
      showMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro inesperado.",
      });
    } finally {
      setUpdatingFamily(false);
    }
  };

  const handleInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = inviteEmail.trim();
    if (!normalizedEmail) {
      return;
    }

    if (!isOwner) {
      showMessage({
        type: "error",
        text: "Apenas administradores podem enviar convites.",
      });
      return;
    }

    setInviting(true);

    try {
      const { invite: savedInvite, reused } = await submitInvite(
        normalizedEmail,
      );

      integrateInvite(savedInvite);
      setInviteEmail("");
      showMessage({
        type: "success",
        text: reused
          ? "Convite reenviado com sucesso."
          : "Convite enviado com sucesso.",
      });
    } catch (error) {
      console.error(error);
      showMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro inesperado.",
      });
    } finally {
      setInviting(false);
    }
  };

  const handleResendInvite = async (invite: FamilyInvite) => {
    if (!isOwner) {
      showMessage({
        type: "error",
        text: "Apenas administradores podem reenviar convites.",
      });
      return;
    }

    setResendingId(invite.id);

    try {
      const { invite: refreshedInvite } = await submitInvite(
        invite.invitee_email,
      );

      integrateInvite(refreshedInvite, invite.id);
      showMessage({
        type: "success",
        text: "Convite reenviado com sucesso.",
      });
    } catch (error) {
      console.error(error);
      showMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro inesperado.",
      });
    } finally {
      setResendingId(null);
    }
  };

  const pendingInvites = invites.filter(
    (invite) => invite.status === "pending",
  );

  const confirmRemoval = async () => {
    if (!pendingRemoval) {
      return;
    }

    const profileId = pendingRemoval.id;
    setRemovingId(profileId);

    try {
      const response = await fetch(`/api/families/members/${profileId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Erro ao remover membro");
      }

      const payload = await response.json();
      setMembers(payload.members as Profile[]);
      showMessage({ type: "success", text: "Membro removido." });
    } catch (error) {
      console.error(error);
      showMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro inesperado.",
      });
    } finally {
      setRemovingId(null);
      setPendingRemoval(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="mb-4">
          <h1 className="text-xl font-semibold text-slate-900">
            Configurações da família
          </h1>
          <p className="text-sm text-slate-500">
            Defina o nome e a moeda padrão utilizada no dashboard.
          </p>
        </header>
        <form onSubmit={handleSaveFamily} className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="family-name"
            name="name"
            label="Nome da família"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={updatingFamily}
            required
          />
          <TextField
            id="family-currency"
            name="currencyCode"
            label="Moeda (código ISO)"
            value={currencyCode}
            onChange={(event) => setCurrencyCode(event.target.value.toUpperCase())}
            maxLength={3}
            disabled={updatingFamily}
            required
          />
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60"
              disabled={updatingFamily}
            >
              {updatingFamily ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Membros</h2>
          <p className="text-sm text-slate-500">
            Convide pessoas para compartilhar o mesmo painel financeiro.
          </p>
        </header>
        {isOwner ? (
          <form
            onSubmit={handleInvite}
            className="mb-4 grid gap-4 sm:grid-cols-3"
          >
            <TextField
              id="invite-email"
              name="email"
              type="email"
              label="E-mail do convidado"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="usuario@dominio.com"
              disabled={inviting}
              required
              className="sm:col-span-2"
            />
            <div className="flex items-end">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60"
                disabled={inviting}
              >
                {inviting ? "Enviando..." : "Convidar"}
              </button>
            </div>
          </form>
        ) : null}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-600">Nome</th>
                <th className="px-4 py-3 font-medium text-slate-600">E-mail</th>
                <th className="px-4 py-3 font-medium text-slate-600">Função</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    Nenhum membro cadastrado.
                  </td>
                </tr>
              ) : null}
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="px-4 py-3 font-medium text-slate-700">
                    {member.full_name ?? "(Sem nome)"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{member.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${member.role === "owner" ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-600"}`}
                    >
                      {member.role === "owner" ? "Administrador" : "Membro"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {member.id === currentProfileId ? (
                      <span className="text-xs text-slate-400">Você</span>
                    ) : isOwner ? (
                      <button
                        type="button"
                        className="rounded-md border border-rose-200 px-3 py-1 text-xs text-rose-600"
                        onClick={() =>
                          setPendingRemoval({
                            id: member.id,
                            name:
                              member.full_name ??
                              member.email ??
                              "Este membro",
                          })
                        }
                        disabled={removingId === member.id}
                      >
                        {removingId === member.id ? "Removendo..." : "Remover"}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Convites pendentes
            </h2>
            <p className="text-sm text-slate-500">
              Convites aguardando aceite. Enviamos um e-mail com link de
              confirmação.
            </p>
          </div>
          <span className="text-xs uppercase tracking-wide text-slate-400">
            Expiram em {INVITE_TTL_DAYS} dias
          </span>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-600">
                  E-mail
                </th>
                <th className="px-4 py-3 font-medium text-slate-600">
                  Status
                </th>
                <th className="px-4 py-3 font-medium text-slate-600">
                  Expira em
                </th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingInvites.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    Nenhum convite pendente.
                  </td>
                </tr>
              ) : null}
              {pendingInvites.map((invite) => (
                <tr key={invite.id}>
                  <td className="px-4 py-3 font-medium text-slate-700">
                    {invite.invitee_email}
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-500">
                    {invite.status}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {invite.expires_at
                      ? new Date(invite.expires_at).toLocaleDateString("pt-BR")
                      : "Sem validade"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isOwner ? (
                      <button
                        type="button"
                        className="rounded-md border border-indigo-200 px-3 py-1 text-xs text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-60"
                        onClick={() => {
                          void handleResendInvite(invite);
                        }}
                        disabled={resendingId === invite.id}
                      >
                        {resendingId === invite.id
                          ? "Reenviando..."
                          : "Reenviar"}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {message ? (
        <p
          className={`rounded-md px-4 py-2 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
        >
          {message.text}
        </p>
      ) : null}

      <ConfirmDialog
        open={pendingRemoval !== null}
        title="Remover membro da família"
        description={
          pendingRemoval
            ? `Tem certeza de que deseja remover ${
                pendingRemoval.name
              } da família ${family.name}?`
            : undefined
        }
        confirmLabel="Remover"
        confirmTone="danger"
        loading={removingId === pendingRemoval?.id}
        onCancel={() => {
          if (removingId) return;
          setPendingRemoval(null);
        }}
        onConfirm={() => {
          void confirmRemoval();
        }}
      />
    </div>
  );
};
