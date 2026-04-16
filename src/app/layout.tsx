import type { Metadata, Viewport } from "next";
import { Poppins, Open_Sans } from "next/font/google";
import "./globals.css";

// Konfigurasi font Poppins untuk Heading
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
});

// Konfigurasi font Open Sans untuk Isi (Body)
const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-open-sans",
});

export const metadata: Metadata = {
  title: "POS Pecel Ayam",
  description: "Aplikasi Point of Sales Modern",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "POS Pecel",
  },
};

// Setup Warna Tema HP
export const viewport: Viewport = {
  themeColor: "#F15A2B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Mencegah zoom tidak sengaja saat kasir mencet-mencet tombol
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      {/* Mengaktifkan kedua font variable dan menjadikan Open Sans sebagai font default bawaan (font-sans) */}
      <body
        className={`${openSans.variable} ${poppins.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
