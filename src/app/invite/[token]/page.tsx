import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { InviteActions } from "@/components/family/InviteActions";
import { currentAppUrl } from "@/utils/url";

type InviteStatus = "pending" | "accepted" | "expired" | "revoked";

type InviteRecord = {
  id: string;
  family_id: string;
  invitee_email: string;
  status: string;
  expires_at: string | null;
  created_at: string;
  token: string;
  family_name?: string | null;
  inviter_name?: string | null;
  inviter_email?: string | null;
};

interface InvitePageProps {
  params: Promise<{ token: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function InvitePage({
  params,
  searchParams,
}: InvitePageProps) {
  const { token } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};

  if (!token) {
    notFound();
  }

  let invite: InviteRecord | null = null;

  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from("family_invites")
      .select(
        `
          id,
          family_id,
          invitee_email,
          status,
          expires_at,
          created_at,
          token,
          families ( name ),
          inviter:profiles!family_invites_inviter_id_fkey ( full_name, email )
        `,
      )
      .eq("token", token)
      .single();

    if (!error && data) {
      invite = {
        id: data.id,
        family_id: data.family_id,
        invitee_email: data.invitee_email,
        status: data.status,
        expires_at: data.expires_at,
        created_at: data.created_at,
        token: data.token,
        family_name: (data.families as { name?: string | null } | null)?.name,
        inviter_name: (
          data.inviter as { full_name?: string | null } | null
        )?.full_name,
        inviter_email: (
          data.inviter as { email?: string | null } | null
        )?.email,
      };
    }
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const autoAcceptParam = resolvedSearchParams.autoAccept;
  const autoAccept = Array.isArray(autoAcceptParam)
    ? autoAcceptParam.includes("1")
    : autoAcceptParam === "1";

  if (!invite) {
    const { data, error } = await supabase.rpc("fetch_invite_by_token", {
      p_token: token,
    });

    if (!error && data) {
      const rows = Array.isArray(data) ? data : [data];
      if (rows.length > 0) {
        invite = rows[0] as InviteRecord;
      }
    }
  }

  if (!invite) {
    notFound();
  }

  const inviteRecord = invite;
  const inviteeEmailDisplay = inviteRecord.invitee_email ?? "";
  const normalizedInviteeEmail = (inviteRecord.invitee_email ?? "").toLowerCase();
  const expiresAt = inviteRecord.expires_at
    ? new Date(inviteRecord.expires_at)
    : null;
  const isExpired = !!expiresAt && expiresAt < new Date();
  const status = (inviteRecord.status ?? "pending") as InviteStatus;

  const loggedEmailDisplay = user?.email ?? null;
  const loggedEmailNormalized = user?.email?.toLowerCase() ?? null;

  const alreadyAccepted = status === "accepted";
  const emailMismatch =
    !!user &&
    !!loggedEmailNormalized &&
    loggedEmailNormalized !== normalizedInviteeEmail;
  const canAccept =
    !!user &&
    !!loggedEmailNormalized &&
    status === "pending" &&
    !isExpired &&
    !emailMismatch;

  const familyName = inviteRecord.family_name ?? "Família";
  const inviterDisplay =
    inviteRecord.inviter_name ??
    inviteRecord.inviter_email ??
    "Um membro da família";

  const statusStyles: Record<
    InviteStatus,
    {
      chipLabel: string;
      chipClass: string;
      badgeLabel: string;
      badgeClass: string;
    }
  > = {
    pending: {
      chipLabel: "Convite pendente",
      chipClass:
        "inline-flex items-center gap-2 rounded-full bg-amber-200/90 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-amber-900 shadow-sm ring-1 ring-amber-300/70",
      badgeLabel: "Pendente",
      badgeClass:
        "inline-flex items-center justify-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 shadow-sm",
    },
    accepted: {
      chipLabel: "Convite aceito",
      chipClass:
        "inline-flex items-center gap-2 rounded-full bg-emerald-200/90 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-900 shadow-sm ring-1 ring-emerald-300/70",
      badgeLabel: "Aceito",
      badgeClass:
        "inline-flex items-center justify-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm",
    },
    expired: {
      chipLabel: "Convite expirado",
      chipClass:
        "inline-flex items-center gap-2 rounded-full bg-rose-200/90 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-rose-900 shadow-sm ring-1 ring-rose-300/70",
      badgeLabel: "Expirado",
      badgeClass:
        "inline-flex items-center justify-center rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700 shadow-sm",
    },
    revoked: {
      chipLabel: "Convite revogado",
      chipClass:
        "inline-flex items-center gap-2 rounded-full bg-slate-200/90 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-slate-800 shadow-sm ring-1 ring-slate-300/70",
      badgeLabel: "Revogado",
      badgeClass:
        "inline-flex items-center justify-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm",
    },
  };

  const statusConfig = statusStyles[status];

  const appUrl = currentAppUrl();
  const redirectTarget = `/invite/${token}?autoAccept=1`;

  const baseAuthParams = new URLSearchParams();
  baseAuthParams.set("redirect", redirectTarget);
  baseAuthParams.set("email", inviteeEmailDisplay);

  const loginUrl = `/login?${new URLSearchParams(baseAuthParams).toString()}`;
  const registerUrl = `/register?${new URLSearchParams(baseAuthParams).toString()}`;

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-18%] top-[-12%] h-[34rem] w-[34rem] rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="absolute right-[-14%] top-[28%] h-[36rem] w-[36rem] rounded-full bg-sky-500/25 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.65),rgba(15,23,42,0.35))]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 pb-20 pt-16">
        <header className="mb-12 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.35em] text-slate-200 shadow-md shadow-indigo-500/20">
              Zenvix Convites
            </span>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold leading-tight text-white md:text-4xl">
                Você foi convidado para {familyName}
              </h1>
              <p className="max-w-2xl text-sm text-slate-300 md:text-base">
                Conecte-se à família, compartilhe dashboards financeiros e mantenha
                todos alinhados com objetivos em comum. O Zenvix garante convites
                monitorados, expiração automática e camadas adicionais de segurança
                ativa.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <Link
              href={loginUrl}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-indigo-400 hover:text-indigo-200"
            >
              Entrar com outro e-mail
            </Link>
            <p className="text-xs text-slate-400">
              A aceitação só é concluída quando o e-mail convidado acessa o painel.
            </p>
          </div>
        </header>

        <div className="grid flex-1 gap-10 lg:grid-cols-[3fr,2fr]">
          <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/90 p-[2px] shadow-[0_40px_80px_-40px_rgba(79,70,229,0.65)]">
            <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 opacity-90" />
            <div className="relative rounded-[30px] bg-white p-10 text-slate-900 shadow-xl">
              <div className={statusConfig.chipClass}>{statusConfig.chipLabel}</div>
              <h2 className="mt-8 text-3xl font-semibold text-slate-900 md:text-4xl">
                {familyName}
              </h2>
              <p className="mt-5 text-sm leading-relaxed text-slate-600 md:text-base">
                {inviterDisplay} convidou você para ingressar na família{" "}
                <span className="font-semibold text-slate-900">{familyName}</span>{" "}
                e acompanhar cada movimento no painel financeiro compartilhado do
                Zenvix.
              </p>

              <div className="mt-8 space-y-5 rounded-[28px] border border-slate-200 bg-slate-50/80 px-5 py-5 text-sm text-slate-600 md:px-6 md:py-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                      Convite enviado para
                    </p>
                    <p className="mt-1 text-base font-medium text-slate-900">
                      {inviteeEmailDisplay}
                    </p>
                  </div>
                  <span className={statusConfig.badgeClass}>{statusConfig.badgeLabel}</span>
                </div>
                {expiresAt ? (
                  <p className="text-xs text-slate-500">
                    Expira em{" "}
                    <span className="font-semibold text-slate-700">
                      {expiresAt.toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">
                    Sem data de expiração configurada pelo administrador.
                  </p>
                )}
              </div>

              <div className="mt-9">
                {user ? (
                  <InviteActions
                    token={token}
                    status={status}
                    canAccept={canAccept}
                    alreadyAccepted={alreadyAccepted}
                    invitationEmail={inviteeEmailDisplay}
                    loggedEmail={loggedEmailDisplay}
                    emailMismatch={emailMismatch}
                    isExpired={isExpired}
                    autoAccept={autoAccept}
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-[26px] border border-indigo-200 bg-indigo-50/90 px-5 py-4 text-sm text-indigo-700 shadow-sm">
                      Entre ou cadastre-se com o e-mail convidado. Após a autenticação,
                      o vínculo com a família é realizado automaticamente.
                    </div>
                    <div className="flex flex-col gap-3 md:flex-row">
                      <Link
                        href={loginUrl}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600"
                      >
                        Entrar com este e-mail
                      </Link>
                      <Link
                        href={registerUrl}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-400/40 transition hover:from-indigo-500 hover:to-sky-400"
                      >
                        Criar conta
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside className="flex flex-col justify-between gap-8 rounded-[32px] border border-white/12 bg-white/10 p-8 shadow-[0_40px_80px_-55px_rgba(59,130,246,0.75)] backdrop-blur-xl">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">
                Três passos para desbloquear o painel
              </h3>
              <div className="space-y-4 text-sm text-slate-200/85">
                <div className="flex gap-3 items-center">
                  <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/70 text-xs font-semibold text-white">
                    1
                  </span>
                  Acesse com o e-mail convidado ou finalize o cadastro recomendado.
                </div>
                <div className="flex gap-3 items-center">
                  <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/70 text-xs font-semibold text-white">
                    2
                  </span>
                  Aceite o convite e você será redirecionado ao dashboard da família.
                </div>
                <div className="flex gap-3 items-center">
                  <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/70 text-xs font-semibold text-white">
                    3
                  </span>
                  Compartilhe categorias, transações e objetivos com todos os membros.
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-[28px] border border-white/20 bg-white/10 px-5 py-5 text-xs leading-relaxed text-slate-200/80">
              <p className="font-semibold text-white">Link direto</p>
              <p>
                Se preferir, copie e cole o link abaixo no navegador da sua
                preferência:
              </p>
              <p className="break-all font-mono text-[11px] text-slate-300">
                {`${appUrl}/invite/${token}`}
              </p>
              <p>Convites expirados ou revogados podem ser renovados pelo administrador.</p>
            </div>

            <div className="rounded-[28px] border border-white/12 bg-white/8 px-5 py-6 text-xs text-slate-300">
              <p className="font-semibold text-white">Por que Zenvix?</p>
              <ul className="mt-3 space-y-2">
                <li>• Segurança multicamada com auditoria e políticas por família.</li>
                <li>• Dashboards em tempo real e multiusuário verdadeiro.</li>
                <li>• Monitoramento de convites com validade configurável.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
