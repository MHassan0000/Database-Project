import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

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
  title: "ProductVault - Product Management System",
  description: "A modern, full-stack product management dashboard built with Next.js and PostgreSQL.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full ${plex.variable} ${fraunces.variable}`}>
      <body className={`min-h-full flex flex-col bg-background text-foreground antialiased ${plex.className}`}>
        {children}
      </body>
    </html>
  );
}
