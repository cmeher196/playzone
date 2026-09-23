import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "CricArena — SMPL Player Registration",
  description:
    "Register for the SMPL cricket league: enter your details, pay the fee via UPI, and lock your spot.",
};

// Runs before paint so the saved theme is applied without a flash of the wrong colors.
const themeInitScript = `(function(){try{var t=localStorage.getItem('cricarena-theme')||'system';var light={light:1,'indigo-light':1};if(t==='system'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'emerald';}var el=document.documentElement;el.setAttribute('data-theme',t);el.setAttribute('data-mode',light[t]?'light':'dark');}catch(e){document.documentElement.setAttribute('data-theme','emerald');document.documentElement.setAttribute('data-mode','dark');}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
