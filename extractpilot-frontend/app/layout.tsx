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
  title: "ExtractPilot — Inbox to structured records",
  description:
    "Connect your mailbox, define the JSON you need, and extract fields from email and attachments with a reviewable pipeline.",
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
