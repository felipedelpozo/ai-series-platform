import type { Metadata } from "next";
import { ThemeProvider } from "@ai-series/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Series Platform",
  description: "Creator studio for AI-native interactive series",
};

const themeScript = `(function(){try{var t=localStorage.getItem('ai-series-theme');var m=window.matchMedia('(prefers-color-scheme: light)').matches;var d=t?t==='dark':!m;document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
