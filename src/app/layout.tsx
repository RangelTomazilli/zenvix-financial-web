import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

const metadataBaseUrl =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(metadataBaseUrl),
  title: {
    default: "Zenvix Controle Financeiro",
    template: "%s • Zenvix Controle Financeiro",
  },
  description:
    "Dashboard financeiro familiar com autenticação Supabase, categorias e controle de receitas e despesas.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${poppins.variable} min-h-screen bg-slate-50 antialiased`}>
        {children}
      </body>
    </html>
  );
}
