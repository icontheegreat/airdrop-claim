import type { Metadata } from "next";
import "./globals.css";
import { SolanaProviders } from "@/components/solana-providers";

export const metadata: Metadata = {
  title: "Solana Sweep Dashboard",
  description: "Non-custodial Solana transfer dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SolanaProviders>{children}</SolanaProviders>
      </body>
    </html>
  );
}
