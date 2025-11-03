import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProfileSettings } from "@/components/profile/ProfileSettings";

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, email")
    .eq("user_id", user.id)
    .single<{ full_name: string | null; phone: string | null; email: string | null }>();

  const fullName = profile?.full_name ?? user.user_metadata?.full_name ?? user.email ?? "";
  const storedPhone = profile?.phone ?? "";
  let dialCode = "+55";
  let phoneNumber = "";

  if (storedPhone) {
    const match = storedPhone.match(/^(\+\d{1,4})\s*(.*)$/);
    if (match) {
      dialCode = match[1];
      phoneNumber = match[2];
    } else {
      phoneNumber = storedPhone;
    }
  }

  const email = user.email ?? profile?.email ?? "";

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-indigo-600">
          Perfil
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Gerencie suas credenciais e formas de contato
        </h1>
        <p className="text-sm text-slate-500">
          Atualize seus dados pessoais, telefone para notificações e mantenha sua senha sempre segura.
        </p>
      </div>

      <ProfileSettings
        initialProfile={{
          fullName,
          dialCode,
          phoneNumber,
          email,
        }}
      />
    </div>
  );
}
