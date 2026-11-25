import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { Geist, Geist_Mono, Figtree } from "next/font/google";
import "../globals.css";
import { TooltipProvider } from "@dafne/frontend-ui/components/tooltip";
import { ThemeScript } from "@dafne/frontend-ui/components/theme-script";
import { cn } from "@dafne/frontend-ui/lib/utils";
import { routing } from "@/i18n/routing";
import { Toaster } from "@dafne/frontend-ui/components/toast";
import { Telemetry } from "@dafne/frontend-logger/telemetry";

const figtree = Figtree({ subsets: ['latin'], variable: '--font-sans' });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** One prerendered shell per language. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app");
  return { title: t("title"), description: t("description") };
}

export default async function RootLayout({
  children,
}: LayoutProps<"/[locale]">) {
  return (
    <html
      lang={await rootLocale()}
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        figtree.variable,
      )}
      // The theme script sets the `dark` class before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        {/* Grafana Faro in the browser, when FARO_URL is set (next.config.ts proxies /telemetry). */}
        {process.env.FARO_URL && (
          <Telemetry
            app="sales-web"
            environment={process.env.NODE_ENV}
            sampleRate={Number(process.env.FARO_SAMPLE_RATE ?? 1)}
            level={process.env.NEXT_PUBLIC_LOG_LEVEL}
          />
        )}
        <NextIntlClientProvider>
          <Toaster />
          <TooltipProvider>{children}</TooltipProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
