import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
// PHASE 8 START: AuthProvider wraps the entire application
import { AuthProvider } from "@/components/AuthProvider";
// PHASE 8 END: AuthProvider import

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-plex",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700", "900"],
  display: "swap",
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: "Obsidian - Inventory Management System",
  description: "A premium, full-stack product inventory management platform built with Next.js and PostgreSQL.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full ${plex.variable} ${fraunces.variable}`}>
      <body className={`min-h-screen flex flex-col overflow-x-hidden bg-background text-foreground antialiased ${plex.className}`}>
        {/* PHASE 8 START: global auth context */}
        <AuthProvider>
          {children}
        </AuthProvider>
        {/* PHASE 8 END: global auth context */}
      </body>
    </html>
  );
}
