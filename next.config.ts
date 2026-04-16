import withPWAInit from "@ducanh2912/next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Biarkan kosong jika tidak ada konfigurasi Next.js tambahan
};

// PWA HANYA diaktifkan saat proses Build (untuk Vercel/Production)
// Ini mencegah bentrok dengan Turbopack saat 'npm run dev' di lokal
export default process.env.NODE_ENV === "production"
  ? withPWAInit({
      dest: "public",
      register: true,
      // skipWaiting sudah otomatis di versi terbaru, jadi tidak perlu ditulis
    })(nextConfig)
  : nextConfig;
