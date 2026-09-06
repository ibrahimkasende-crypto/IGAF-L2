import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IGAF L2 — Mes examens de rachat",
  description: "Retrouvez vos examens de rachat L2 LMD IGAF, votre horaire personnel et les supports de cours.",
  icons: { icon: "/logo-l2.jpeg", shortcut: "/logo-l2.jpeg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}
