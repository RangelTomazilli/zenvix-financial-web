'use client';

import { useActionState, useEffect, useRef, useCallback } from "react";
import { updateProfileAction, changePasswordAction } from "@/app/(protected)/profile/actions";
import { TextField } from "@/components/forms/TextField";
import { SelectField } from "@/components/forms/SelectField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Callout } from "@/components/ui/Callout";

interface ProfileSettingsProps {
  initialProfile: {
    fullName: string;
    dialCode: string;
    phoneNumber: string;
    email: string;
  };
}

const COUNTRY_CODES: Array<{ label: string; value: string }> = [
  { label: "+55 (Brasil)", value: "+55" },
  { label: "+1 (EUA/Canadá)", value: "+1" },
  { label: "+44 (Reino Unido)", value: "+44" },
  { label: "+34 (Espanha)", value: "+34" },
  { label: "+33 (França)", value: "+33" },
  { label: "+49 (Alemanha)", value: "+49" },
  { label: "+351 (Portugal)", value: "+351" },
  { label: "+39 (Itália)", value: "+39" },
  { label: "+81 (Japão)", value: "+81" },
  { label: "+61 (Austrália)", value: "+61" },
];

export const ProfileSettings = ({ initialProfile }: ProfileSettingsProps) => {
  type ProfileFormState = Awaited<ReturnType<typeof updateProfileAction>>;
  type PasswordFormState = Awaited<ReturnType<typeof changePasswordAction>>;

  const emptyProfileState: ProfileFormState = {
    status: undefined,
    message: undefined,
    errors: undefined,
    profile: undefined,
  };

  const emptyPasswordState: PasswordFormState = {
    status: undefined,
    message: undefined,
    errors: undefined,
  };

  const profileFormRef = useRef<HTMLFormElement | null>(null);
  const passwordFormRef = useRef<HTMLFormElement | null>(null);

  const [profileState, profileAction] = useActionState(
    updateProfileAction,
    emptyProfileState,
  );

  const [passwordState, passwordAction] = useActionState(
    changePasswordAction,
    emptyPasswordState,
  );

  const formatPhoneValue = useCallback((raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 11);

    if (digits.length <= 0) return "";
    if (digits.length <= 2) return digits;

    const area = digits.slice(0, 2);
    const local = digits.slice(2);

    if (local.length === 0) {
      return `(${area})`;
    }

    if (local.length <= 4) {
      return `(${area}) ${local}`;
    }

    if (local.length <= 8) {
      return `(${area}) ${local.slice(0, local.length - 4)}-${local.slice(-4)}`;
    }

    return `(${area}) ${local.slice(0, 5)}-${local.slice(5, 9)}`;
  }, []);

  const handlePhoneInputChange = useCallback(
    (event: React.FormEvent<HTMLInputElement>) => {
      const input = event.currentTarget;
      input.value = formatPhoneValue(input.value);
    },
    [formatPhoneValue],
  );

  useEffect(() => {
    if (profileState.status === "success" && profileState.profile && profileFormRef.current) {
      const form = profileFormRef.current;
      const fullNameInput = form.elements.namedItem("fullName") as HTMLInputElement | null;
      const dialCodeSelect = form.elements.namedItem("dialCode") as HTMLSelectElement | null;
      const phoneInput = form.elements.namedItem("phoneNumber") as HTMLInputElement | null;

      if (fullNameInput) {
        fullNameInput.value = profileState.profile.fullName;
      }

      if (phoneInput) {
        const storedPhone = profileState.profile.phone ?? "";
        const match = storedPhone.match(/^(\+\d{1,4})\s*(.*)$/);
        const dialValueFromServer = match?.[1];
        const phoneDigits = match?.[2] ?? storedPhone;

        if (dialCodeSelect) {
          const availableValues = COUNTRY_CODES.map((option) => option.value);
          const resolvedDial = availableValues.includes(dialValueFromServer ?? "")
            ? (dialValueFromServer as string)
            : COUNTRY_CODES[0]?.value ?? "+55";
          dialCodeSelect.value = resolvedDial;
        }

        phoneInput.value = formatPhoneValue(phoneDigits);
      }
    }
  }, [profileState, formatPhoneValue]);

  useEffect(() => {
    if (passwordState.status === "success" && passwordFormRef.current) {
      passwordFormRef.current.reset();
    }
  }, [passwordState]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="mb-6 space-y-2">
          <h1 className="text-xl font-semibold text-slate-900">
            Informações pessoais
          </h1>
          <p className="text-sm text-slate-500">
            Atualize seu nome e telefone para receber notificações por SMS.
          </p>
        </header>

        {profileState.status && profileState.message ? (
          <Callout
            tone={profileState.status === "success" ? "success" : "error"}
            title={
              profileState.status === "success"
                ? "Perfil atualizado"
                : "Não foi possível atualizar"
            }
            description={profileState.message}
            dismissible
          />
        ) : null}

        <form
          ref={profileFormRef}
          action={profileAction}
          className="mt-6 space-y-4"
        >
          <TextField
            id="profile-fullName"
            name="fullName"
            label="Nome completo"
            defaultValue={initialProfile.fullName}
            error={profileState.errors?.fullName}
            autoComplete="name"
            required
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <SelectField
              id="profile-dialCode"
              name="dialCode"
              label="Código"
              defaultValue={initialProfile.dialCode}
              options={COUNTRY_CODES}
              error={profileState.errors?.phone}
              className="sm:w-28"
            />
            <TextField
              id="profile-phone"
              name="phoneNumber"
              label="Telefone para SMS"
              placeholder="Ex.: 11 98888-7777"
              defaultValue={formatPhoneValue(initialProfile.phoneNumber)}
              error={profileState.errors?.phone}
              autoComplete="tel"
              onInput={handlePhoneInputChange}
              className="sm:flex-1"
            />
          </div>

          <TextField
            id="profile-email"
            label="E-mail"
            value={initialProfile.email}
            disabled
            readOnly
          />

          <SubmitButton pendingLabel="Salvando alterações..." className="w-full">
            Salvar alterações
          </SubmitButton>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="mb-6 space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">
            Atualizar senha
          </h2>
          <p className="text-sm text-slate-500">
            Defina uma senha forte com pelo menos 6 caracteres.
          </p>
        </header>

        {passwordState.status && passwordState.message ? (
          <Callout
            tone={passwordState.status === "success" ? "success" : "error"}
            title={
              passwordState.status === "success"
                ? "Senha atualizada"
                : "Não foi possível atualizar"
            }
            description={passwordState.message}
            dismissible
          />
        ) : null}

        <form
          ref={passwordFormRef}
          action={passwordAction}
          className="mt-6 space-y-4"
        >
          <TextField
            id="current-password"
            name="currentPassword"
            type="password"
            label="Senha atual"
            error={passwordState.errors?.currentPassword}
            autoComplete="current-password"
            required
          />

          <TextField
            id="new-password"
            name="newPassword"
            type="password"
            label="Nova senha"
            error={passwordState.errors?.newPassword}
            autoComplete="new-password"
            required
          />

          <TextField
            id="confirm-password"
            name="confirmPassword"
            type="password"
            label="Confirmar nova senha"
            error={passwordState.errors?.confirmPassword}
            autoComplete="new-password"
            required
          />

          <SubmitButton pendingLabel="Atualizando senha..." className="w-full">
            Atualizar senha
          </SubmitButton>
        </form>
      </section>
    </div>
  );
};
