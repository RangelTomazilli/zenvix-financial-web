import { LoginForm } from "@/components/auth/LoginForm";

interface LoginPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolved = (await searchParams) ?? {};

  const redirectParam = resolved.redirect;
  const redirectTo = Array.isArray(redirectParam)
    ? redirectParam[0]
    : redirectParam;

  const emailParam = resolved.email;
  const defaultEmail = Array.isArray(emailParam) ? emailParam[0] : emailParam;

  const statusParam = resolved.status;
  const status = Array.isArray(statusParam) ? statusParam[0] : statusParam;
  const successMessage =
    status === "registered"
      ? "Seu cadastro foi enviado com sucesso. Verifique sua caixa de entrada e confirme o e-mail antes de acessar o painel."
      : status === "confirmed"
        ? "E-mail confirmado com sucesso. Agora você pode entrar usando suas credenciais."
        : undefined;

  const registerParams = new URLSearchParams();
  if (redirectTo) {
    registerParams.set("redirect", redirectTo);
  }
  if (defaultEmail) {
    registerParams.set("email", defaultEmail);
  }

  const registerHref = `/register${
    registerParams.toString() ? `?${registerParams.toString()}` : ""
  }`;

  return (
    <LoginForm
      defaultEmail={defaultEmail ?? undefined}
      redirectTo={redirectTo ?? undefined}
      registerHref={registerHref}
      successMessage={successMessage}
    />
  );
}
