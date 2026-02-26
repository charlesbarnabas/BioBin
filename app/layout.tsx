import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "BioBin Dashboard - Pengolahan Sampah Menjadi Pupuk",
  description:
    "Dashboard IoT untuk memantau proses pengolahan sampah organik menjadi pupuk di Kelurahan Mekarjaya, Bandung.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}

