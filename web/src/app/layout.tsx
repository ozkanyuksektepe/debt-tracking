import type { Metadata } from "next";
import { Sidebar } from "@/components/sidebar";
import { THEME_SCRIPT } from "@/lib/theme-script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Borç Takibi",
  description: "Kişisel borç ve ödeme paneli",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-theme, head'deki script tarafından hidrasyondan önce ayarlanır.
    <html lang="tr" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full text-[15px] leading-normal">
        {/* Arka planda hafif renk geçişi */}
        <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_srgb,var(--accent)_10%,transparent),transparent)]" />
        <div className="flex min-h-screen flex-col md:flex-row">
          <Sidebar />
          <main className="mx-auto w-full min-w-0 max-w-[1240px] flex-1 px-4 pb-20 pt-6 md:px-10 md:pt-9">{children}</main>
        </div>
      </body>
    </html>
  );
}
