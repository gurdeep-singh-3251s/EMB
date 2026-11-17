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
  title: "ExtractPilot — Inbox automation for real estate teams",
  description:
    "Built for brokerages: connect multiple Gmails, run real-estate prompts, pick from 50+ AI models, and review confidence-scored extractions in minutes.",
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
