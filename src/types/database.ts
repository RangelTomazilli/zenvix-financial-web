export type TransactionType = "income" | "expense";

export interface Database {
  public: {
    Tables: {
      families: {
        Row: {
          id: string;
          name: string;
          currency_code: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          currency_code?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["families"]["Row"], "id">>;
      };
      profiles: {
        Row: {
          id: string;
          user_id: string | null;
          family_id: string | null;
          full_name: string | null;
          email: string | null;
          phone: string | null;
          role: "owner" | "member";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          family_id?: string | null;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          role?: "owner" | "member";
          created_at?: string;
        };
        Update: Partial<
          Omit<Database["public"]["Tables"]["profiles"]["Row"], "id" | "user_id">
        >;
      };
      categories: {
        Row: {
          id: string;
          family_id: string;
          name: string;
          type: TransactionType;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          name: string;
          type: TransactionType;
          created_at?: string;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["categories"]["Row"], "id" | "family_id">>;
      };
      transactions: {
        Row: {
          id: string;
          family_id: string;
          user_id: string | null;
          category_id: string | null;
          type: TransactionType;
          amount: number;
          occurred_on: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          user_id?: string | null;
          category_id?: string | null;
          type: TransactionType;
          amount: number;
          occurred_on: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["transactions"]["Row"], "id" | "family_id">>;
      };
      family_invites: {
        Row: {
          id: string;
          family_id: string;
          inviter_id: string;
          invitee_email: string;
          token: string;
          status: "pending" | "accepted" | "expired" | "revoked";
          expires_at: string | null;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          inviter_id: string;
          invitee_email: string;
          token: string;
          status?: "pending" | "accepted" | "expired" | "revoked";
          expires_at?: string | null;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Omit<
            Database["public"]["Tables"]["family_invites"]["Row"],
            "id" | "family_id" | "inviter_id" | "token" | "created_at"
          >
        >;
      };
      credit_cards: {
        Row: {
          id: string;
          family_id: string;
          owner_profile_id: string | null;
          name: string;
          nickname: string | null;
          brand: string | null;
          credit_limit: number | null;
          billing_day: number | null;
          due_day: number;
          closing_offset_days: number;
          notify_threshold: number | null;
          notify_days_before: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          owner_profile_id?: string | null;
          name: string;
          nickname?: string | null;
          brand?: string | null;
          credit_limit?: number | null;
          billing_day?: number | null;
          due_day: number;
          closing_offset_days?: number;
          notify_threshold?: number | null;
          notify_days_before?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<Database["public"]["Tables"]["credit_cards"]["Row"], "id" | "family_id">
        >;
      };
      credit_card_statements: {
        Row: {
          id: string;
          card_id: string;
          reference_month: string;
          period_start: string;
          period_end: string;
          due_date: string;
          status: "open" | "closed" | "paid" | "overdue";
          total_amount: number;
          paid_amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          reference_month: string;
          period_start: string;
          period_end: string;
          due_date: string;
          status?: "open" | "closed" | "paid" | "overdue";
          total_amount?: number;
          paid_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<
            Database["public"]["Tables"]["credit_card_statements"]["Row"],
            "id" | "card_id" | "reference_month"
          >
        >;
      };
      credit_card_purchases: {
        Row: {
          id: string;
          card_id: string;
          statement_id: string | null;
          profile_id: string | null;
          category_id: string | null;
          description: string | null;
          merchant: string | null;
          amount: number;
          installments: number;
          purchase_date: string;
          first_installment_month: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          statement_id?: string | null;
          profile_id?: string | null;
          category_id?: string | null;
          description?: string | null;
          merchant?: string | null;
          amount: number;
          installments?: number;
          purchase_date: string;
          first_installment_month: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<Database["public"]["Tables"]["credit_card_purchases"]["Row"], "id" | "card_id">
        >;
      };
      credit_card_installments: {
        Row: {
          id: string;
          purchase_id: string;
          statement_id: string | null;
          installment_number: number;
          amount: number;
          competence_month: string;
          due_date: string;
          status: "pending" | "billed" | "paid" | "cancelled";
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          purchase_id: string;
          statement_id?: string | null;
          installment_number: number;
          amount: number;
          competence_month: string;
          due_date: string;
          status?: "pending" | "billed" | "paid" | "cancelled";
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<
            Database["public"]["Tables"]["credit_card_installments"]["Row"],
            "id" | "purchase_id" | "installment_number"
          >
        >;
      };
    };
    Views: Record<string, unknown>;
    Functions: Record<string, unknown>;
  };
}

export type Family = Database["public"]["Tables"]["families"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type FamilyInvite = Database["public"]["Tables"]["family_invites"]["Row"];
export type CreditCard = Database["public"]["Tables"]["credit_cards"]["Row"];
export type CreditCardStatement =
  Database["public"]["Tables"]["credit_card_statements"]["Row"];
export type CreditCardPurchase =
  Database["public"]["Tables"]["credit_card_purchases"]["Row"];
export type CreditCardInstallment =
  Database["public"]["Tables"]["credit_card_installments"]["Row"];
