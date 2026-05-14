import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Profile — KOBIL",
  description: "Manage your profile, privacy preferences, and data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
