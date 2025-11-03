import { RegisterForm } from "@/components/auth/RegisterForm";

interface RegisterPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const resolved = (await searchParams) ?? {};

  const redirectParam = resolved.redirect;
  const redirectTo = Array.isArray(redirectParam)
    ? redirectParam[0]
    : redirectParam;

  const emailParam = resolved.email;
  const defaultEmail = Array.isArray(emailParam) ? emailParam[0] : emailParam;

  const loginParams = new URLSearchParams();
  if (redirectTo) {
    loginParams.set("redirect", redirectTo);
  }
  if (defaultEmail) {
    loginParams.set("email", defaultEmail);
  }

  const loginHref = `/login${
    loginParams.toString() ? `?${loginParams.toString()}` : ""
  }`;

  return (
    <RegisterForm
      defaultEmail={defaultEmail ?? undefined}
      redirectTo={redirectTo ?? undefined}
      loginHref={loginHref}
    />
  );
}
