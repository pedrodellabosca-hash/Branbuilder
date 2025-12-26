import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { esES } from "@clerk/localizations";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "BrandForge - Enterprise Brand Creation Platform",
  description: "Plataforma B2B para crear y evolucionar marcas mediante procesos guiados y asistidos por IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <html lang="es">
        <body className={`${inter.variable} font-sans antialiased`}>
          {children}
        </body>
      </html>
    </AuthProvider>
  );
}
