import type { Metadata } from "next";
import { figtree, fraunces } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "IFAG Formation - Administration",
  description: "Espace d'administration de la plateforme IFAG Formation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${figtree.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
