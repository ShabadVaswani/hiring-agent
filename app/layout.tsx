import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Hiring Agent — Resume Scoring",
  description:
    "Web UI for HackerRank's open-source Hiring Agent resume evaluation pipeline. Upload a resume, use your own OpenRouter key, and get explainable category-based scores.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
