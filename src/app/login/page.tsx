"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowRight,
  Lock,
  User,
  Eye,
  AlertCircle,
  Loader2,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true); // Default True karena kita mau ngecek sesi dulu
  const [showPassword, setShowPassword] = useState(false);

  // 1. CEK SESI LOGIN (ANTI-LOGOUT)
  useEffect(() => {
    // Memaksa Firebase untuk menggunakan Local Persistence (Permanen)
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          if (user) {
            // Kalau ternyata sudah pernah login, langsung usir dari halaman Login
            if (user.email === "owner@pecelayam.com") {
              router.replace("/dashboard"); // Pakai replace agar tidak bisa di-back
            } else {
              router.replace("/pos");
            }
          } else {
            // Kalau belum login, barulah form-nya dimunculkan
            setIsLoading(false);
          }
        });
        return () => unsubscribe();
      })
      .catch((error) => {
        console.error("Error setting persistence:", error);
        setIsLoading(false);
      });
  }, [router]);

  // 2. PROSES LOGIN MANUAL
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      if (user.email === "owner@pecelayam.com") {
        router.push("/dashboard");
      } else {
        router.push("/pos");
      }
    } catch (err: any) {
      console.error(err);
      setError("Email atau kata sandi salah. Silakan coba lagi.");
      setIsLoading(false); // Matikan loading jika gagal agar form bisa diklik lagi
    }
  };

  // Tampilkan layar putih bersih (loading) jika Firebase masih mengecek sesi
  if (isLoading && !error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#FEF2EA] via-[#FEF2EA] to-[#F7D3BC]">
        <Loader2 className="h-10 w-10 text-[#F15A2B] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#FEF2EA] via-[#FEF2EA] to-[#F7D3BC] font-sans">
      <Card className="w-full max-w-[420px] p-12 rounded-[52px] shadow-2xl bg-white border-none flex flex-col items-center">
        <h1 className="text-[36px] font-extrabold font-heading text-[#9A2D0D] mb-8 tracking-tight">
          Aplikasi Kasir
        </h1>

        {error && (
          <div className="w-full bg-red-50 text-red-500 p-3 rounded-2xl mb-6 flex items-center gap-2 text-sm font-bold border border-red-100 animate-in fade-in zoom-in duration-300">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="w-full space-y-6">
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-[#8C8C8C] tracking-wide block uppercase">
              Email Pengguna
            </label>
            <div className="w-full flex items-center bg-[#F1F3E1] rounded-[20px] px-5 py-3 border border-[#E0E0E0] focus-within:border-[#F15A2B] focus-within:ring-1 focus-within:ring-[#F15A2B] transition-all">
              <User className="h-5 w-5 text-[#8C8C8C] mr-3" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Masukkan Email"
                className="flex-1 bg-transparent border-none text-slate-800 focus-visible:ring-0 p-0 text-base placeholder:text-[#A9A9A9]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-[#8C8C8C] tracking-wide block uppercase">
              Kata Sandi
            </label>
            <div className="w-full flex items-center bg-[#F1F3E1] rounded-[20px] px-5 py-3 border border-[#E0E0E0] focus-within:border-[#F15A2B] focus-within:ring-1 focus-within:ring-[#F15A2B] transition-all">
              <Lock className="h-5 w-5 text-[#8C8C8C] mr-3" />
              <Input
                type={showPassword ? "text" : "password"} // Fitur Show/Hide Password
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="flex-1 bg-transparent border-none text-slate-800 focus-visible:ring-0 p-0 text-base placeholder:text-[#A9A9A9]"
              />
              <Eye
                className={`h-5 w-5 ml-3 cursor-pointer transition-colors ${showPassword ? "text-[#F15A2B]" : "text-[#8C8C8C] hover:text-[#2D2D2D]"}`}
                onClick={() => setShowPassword(!showPassword)}
              />
            </div>
          </div>

          <div className="w-full flex items-center justify-between mt-2 mb-4">
            <label className="flex items-center space-x-2 text-sm text-[#8C8C8C] cursor-pointer">
              <Checkbox className="rounded-full h-5 w-5 border-[#C0C0C0] data-[state=checked]:bg-[#9A2D0D] data-[state=checked]:border-[#9A2D0D]" />
              <span>Ingat Saya</span>
            </label>
            <a
              href="#"
              className="text-sm font-semibold text-[#9A2D0D] hover:underline"
            >
              Lupa Sandi?
            </a>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-16 bg-gradient-to-r from-[#F15A2B] to-[#EC6340] hover:from-[#EC6340] hover:to-[#F15A2B] text-white rounded-full text-xl font-bold flex items-center justify-center gap-3 transition shadow-lg active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                Masuk <ArrowRight className="h-6 w-6" />
              </>
            )}
          </Button>
        </form>

        <div className="w-full h-px bg-[#EAEAEA] mt-16"></div>
      </Card>
    </div>
  );
}
