import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ProductVault — Product Management System",
  description: "A modern, full-stack product management dashboard built with Next.js and PostgreSQL.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full ${inter.variable}`}>
      <body className={`min-h-full flex flex-col bg-background text-foreground antialiased ${inter.className}`}>
        {children}
      </body>
    </html>
  );
}
