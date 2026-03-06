import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProEstimate AI",
  description: "AI-powered estimation platform for MS Home Pros",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
