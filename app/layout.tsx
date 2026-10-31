import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import { Header } from "@/components/header";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  title: "DisputeGuard",
  description: "AI agent that protects small businesses' money in PayPal disputes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${plexMono.variable}`}>
      <body className="min-h-screen bg-ground font-sans text-sm leading-[1.45] text-ink antialiased">
        <div className="bg-ink px-4 py-2 text-center text-[13px] text-white">
          Live demo on the PayPal sandbox — one demo store, test money only. New disputes arrive by PayPal webhook and the agent
          handles them on its own.
        </div>
        <Header />
        {children}
      </body>
    </html>
  );
}
