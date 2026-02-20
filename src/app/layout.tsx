import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cookies } from "next/headers";
import { LanguageProvider } from "@/components/providers/language-provider";
import { Locale } from "@/i18n/get-dictionary";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lyncis — Data Cleaning House",
  description:
    "Staging & orchestration layer untuk Jastiper. Transform data WhatsApp & Excel menjadi batch pengiriman.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lyncis",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("lyncis-locale")?.value as Locale) || "id";

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <LanguageProvider initialLocale={locale}>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </LanguageProvider>
        <Toaster closeButton position="top-right" theme="light" />
      </body>
    </html>
  );
}
