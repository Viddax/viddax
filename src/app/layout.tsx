import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "../styles/globals.scss";

const inter = Inter({
  variable: "--font-main",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-logo",
  weight: ["700", "800", "900"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Viddax",
  description: "Cross-platform media downloader",
  icons: {
    icon: "/icon.png",
  },
};

import ThemeSync from "@/components/ThemeSync";
import { TitleBar } from "@/components/TitleBar/TitleBar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`} suppressHydrationWarning>
      <head>
        <script
          id="theme-hydration"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const stored = localStorage.getItem('viddax-settings');
                if (stored) {
                  const parsed = JSON.parse(stored);
                  const theme = parsed.state?.themeMode || 'auto';
                  if (theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.setAttribute('data-theme', 'dark');
                  } else {
                    document.documentElement.setAttribute('data-theme', 'light');
                  }
                } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>
        <ThemeSync />
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
          <TitleBar />
          <div style={{ flex: 1, overflow: 'auto' }}>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
