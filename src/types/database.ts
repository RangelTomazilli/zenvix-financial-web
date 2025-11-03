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
    };
    Views: Record<string, unknown>;
    Functions: Record<string, unknown>;
  };
}

export type Family = Database["public"]["Tables"]["families"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
