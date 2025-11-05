import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listCreditCards } from "@/data/creditCards";
import { listFamilyMembers } from "@/data/families";
import { listCategories } from "@/data/categories";
import { CreditCardBoard } from "@/components/credit-cards/CreditCardBoard";

export default async function CreditCardsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, family_id")
    .eq("user_id", user.id)
    .single<{ id: string; role: "owner" | "member"; family_id: string | null }>();

  if (!profile?.family_id) {
    redirect("/family");
  }

  const familyId = profile.family_id;
  const [cards, members, categories, familyRow] = await Promise.all([
    listCreditCards(supabase, familyId),
    listFamilyMembers(supabase, familyId),
    listCategories(supabase, familyId),
    supabase
      .from("families")
      .select("currency_code")
      .eq("id", familyId)
      .single<{ currency_code: string | null }>(),
  ]);

  if (familyRow.error) {
    console.error("credit-cards: erro ao buscar moeda da família", {
      familyId,
      error: familyRow.error,
    });
  }

  const currency = familyRow.data?.currency_code ?? "BRL";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-slate-900">Cartões de crédito</h1>
        <p className="text-sm text-slate-500">
          Cadastre seus cartões, registre compras parceladas e acompanhe faturas futuras.
        </p>
      </div>
      <CreditCardBoard
        cards={cards}
        members={members}
        categories={categories}
        currency={currency}
        currentProfileId={profile.id}
        currentProfileRole={profile.role}
      />
    </div>
  );
}
