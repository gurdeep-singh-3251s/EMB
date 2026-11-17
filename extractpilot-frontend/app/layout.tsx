import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AppProvider } from "@/providers/AppProvider";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "ExtractPilot — Automate inbox workflows",
  description:
    "Automate your workflows and save 10+ hours a week in just 10 minutes. Connect multiple mailboxes, extract structured JSON from anyone who emails you, and push clean data into your tools.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="font-sans text-[17px] leading-relaxed text-ink antialiased">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
