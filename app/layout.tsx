import { Inter } from "next/font/google";
import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
const iconUrl = `${basePath}/icon`;

export const metadata: Metadata = {
  title: "Hiring Agent — Resume Scoring",
  description:
    "Web UI for HackerRank's open-source Hiring Agent resume evaluation pipeline. Upload a resume, use your own OpenRouter key, and get explainable category-based scores.",
  icons: {
    icon: [{ url: iconUrl, type: "image/png" }],
    shortcut: iconUrl,
    apple: iconUrl,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.setAttribute("data-theme","dark");}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
