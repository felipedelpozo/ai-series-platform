import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@ai-series/ui";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-interface" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-utility" });

export const metadata: Metadata = {
  title: { default: "AI Series Studio", template: "%s · AI Series Studio" },
  description: "Production desk for AI-native interactive series",
};

const themeScript = `(function(){try{var t=localStorage.getItem('ai-series-theme');var m=window.matchMedia('(prefers-color-scheme: light)').matches;var d=t?t==='dark':!m;document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${geist.variable} ${geistMono.variable}`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
