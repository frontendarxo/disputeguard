import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DisputeGuard",
  description: "AI agent that protects small businesses' money in PayPal disputes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
