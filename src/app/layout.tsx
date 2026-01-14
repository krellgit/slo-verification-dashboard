import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SLO Verification Dashboard",
  description: "Listing optimization verification and testing dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
