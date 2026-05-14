import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mein Profil — KOBIL",
  description:
    "Verwalten Sie Ihr Profil, Datenschutzeinstellungen und persönliche Daten.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
