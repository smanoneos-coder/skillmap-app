import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Skillmap MVP",
  description: "Generate a learning skill map from a topic and study it immediately.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
