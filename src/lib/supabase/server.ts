"use server";

import { cookies } from "next/headers";
import {
  createServerClient,
  type CookieOptions,
} from "@supabase/ssr";
import type { Database } from "@/types/database";
import { logger } from "@/lib/logger";

const getSupabaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not defined");
  }
  return url;
};

const getSupabaseKey = () => {
  const serviceKey = process.env.SUPABASE_KEY;
  if (serviceKey) {
    return serviceKey;
  }

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error("SUPABASE_KEY is not defined");
  }

  return anonKey;
};

export const createSupabaseServerClient = async () => {
  const cookieStore = await cookies();

  return createServerClient<Database, "public">(
    getSupabaseUrl(),
    getSupabaseKey(),
    {
      cookies: {
      get(name: string) {
        try {
          return cookieStore.get(name)?.value;
        } catch (error) {
          logger.warn("Unable to read Supabase cookie", { name, error });
          return undefined;
        }
      },
      async set(name: string, value: string, options: CookieOptions) {
        const mutableStore = cookieStore as unknown as {
          set?: (opts: { name: string; value: string } & CookieOptions) => void;
        };

        if (typeof mutableStore.set === "function") {
          try {
            mutableStore.set({ name, value, ...options });
          } catch (error) {
            logger.debug?.("Supabase cookie ignored outside route handler", {
              name,
              error,
            });
          }
        }
      },
      async remove(name: string, options: CookieOptions) {
        const mutableStore = cookieStore as unknown as {
          set?: (opts: { name: string; value: string } & CookieOptions) => void;
        };

        if (typeof mutableStore.set === "function") {
          try {
            mutableStore.set({ name, value: "", ...options, maxAge: 0 });
          } catch (error) {
            logger.debug?.("Supabase cookie removal ignored", {
              name,
              error,
            });
          }
        }
      },
    },
    },
  );
};
