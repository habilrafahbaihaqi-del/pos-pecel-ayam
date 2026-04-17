"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import {
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  User as FirebaseUser,
} from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Calculator,
  History,
  User,
  Settings,
  Utensils,
  BarChart3,
  Camera,
  Lock,
  Save,
  Loader2,
  CheckCircle2,
} from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState("Kasir");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // State Form
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setUserRole(user.email === "owner@pecelayam.com" ? "Owner" : "Kasir");
        setDisplayName(user.displayName || "");
        setPhotoURL(user.photoURL || "");
        setIsLoading(false);
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  // Fungsi Kompresi Foto (Agar muat di Firebase Auth Profile)
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        // Perkecil jadi 150x150 pixel agar Base64-nya sangat kecil
        canvas.width = 150;
        canvas.height = 150;
        if (ctx) {
          ctx.drawImage(img, 0, 0, 150, 150);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.6);
          setPhotoURL(compressedBase64);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    setIsSaving(true);

    try {
      // 1. Update Nama & Foto
      await updateProfile(currentUser, {
        displayName: displayName,
        photoURL: photoURL,
      });

      // 2. Update Password (jika diisi)
      if (newPassword.length >= 6) {
        await updatePassword(currentUser, newPassword);
        setNewPassword(""); // Kosongkan lagi setelah sukses
      } else if (newPassword.length > 0 && newPassword.length < 6) {
        alert("Kata sandi baru minimal 6 karakter!");
        setIsSaving(false);
        return;
      }

      showToast("Profil berhasil diperbarui!");
    } catch (error: any) {
      console.error(error);
      if (error.code === "auth/requires-recent-login") {
        alert(
          "Untuk alasan keamanan, silakan Logout dan Login kembali sebelum mengubah kata sandi.",
        );
      } else {
        alert("Gagal memperbarui profil: " + error.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex justify-center items-center">
        <Loader2 className="animate-spin text-[#F15A2B] h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E5E5E5] flex justify-center font-sans">
      <div className="w-full max-w-[420px] bg-[#FAF7F2] min-h-screen relative pb-32 shadow-xl overflow-x-hidden">
        {/* NOTIFIKASI TOAST */}
        {toastMsg && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-[#2D2D2D] text-white px-5 py-3 rounded-full text-sm font-bold shadow-2xl z-50 animate-in slide-in-from-top-10 fade-in duration-300 flex items-center gap-2 whitespace-nowrap">
            <CheckCircle2 size={18} className="text-[#A3E635]" /> {toastMsg}
          </div>
        )}

        {/* HEADER */}
        <div className="bg-white rounded-b-[40px] shadow-sm pb-8 pt-10 px-6 relative mb-8 text-center">
          <h2 className="text-2xl font-heading font-black text-[#2D2D2D] mb-6">
            Pengaturan Profil
          </h2>

          <div className="relative inline-block">
            <div className="w-28 h-28 mx-auto bg-[#F8F5F0] rounded-full border-4 border-[#FAF7F2] shadow-lg flex items-center justify-center overflow-hidden">
              {photoURL ? (
                <img
                  src={photoURL}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="text-[#8C8C8C] h-12 w-12" />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-[#F15A2B] text-white p-2.5 rounded-full shadow-md hover:scale-105 active:scale-95 transition"
            >
              <Camera size={18} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoChange}
              className="hidden"
              accept="image/*"
            />
          </div>
          <p className="text-[10px] text-[#8C8C8C] font-bold mt-3 uppercase tracking-widest">
            {currentUser?.email}
          </p>
          <div className="mt-2 inline-block bg-[#F5EDEB] text-[#9A2D0D] px-3 py-1 rounded-full text-[10px] font-black uppercase">
            ROLE: {userRole}
          </div>
        </div>

        {/* FORM PENGATURAN */}
        <div className="px-6 space-y-5">
          <div className="bg-white p-5 rounded-[24px] shadow-sm border border-[#F0EBE1] space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-wide">
                Nama Kasir / Tampilan
              </label>
              <div className="flex items-center bg-[#F8F5F0] rounded-[16px] px-4 py-1 border border-transparent focus-within:border-[#F15A2B]">
                <User className="h-4 w-4 text-[#8C8C8C] mr-3" />
                <Input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Masukkan nama"
                  className="bg-transparent border-none focus-visible:ring-0 p-0 text-sm font-bold text-[#2D2D2D]"
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-wide">
                Ganti Kata Sandi (Opsional)
              </label>
              <div className="flex items-center bg-[#F8F5F0] rounded-[16px] px-4 py-1 border border-transparent focus-within:border-[#F15A2B]">
                <Lock className="h-4 w-4 text-[#8C8C8C] mr-3" />
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Kosongkan jika tidak diubah"
                  className="bg-transparent border-none focus-visible:ring-0 p-0 text-sm font-bold text-[#2D2D2D]"
                />
              </div>
            </div>
          </div>

          <Button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="w-full h-14 bg-gradient-to-r from-[#F15A2B] to-[#EC6340] rounded-full text-lg font-bold shadow-lg hover:brightness-110 active:scale-95 transition flex gap-2"
          >
            {isSaving ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <Save size={20} /> Simpan Perubahan
              </>
            )}
          </Button>

          <Button
            onClick={() => {
              auth.signOut();
              router.push("/login");
            }}
            variant="outline"
            className="w-full h-14 rounded-full text-red-500 border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-600 font-bold active:scale-95 transition"
          >
            Keluar (Logout)
          </Button>
        </div>

        {/* NAVBAR BAWAH */}
        {userRole === "Owner" ? (
          <div className="fixed bottom-0 w-full max-w-[420px] bg-gradient-to-t from-[#FAF7F2] via-[#FAF7F2] to-transparent pt-12 pb-6 px-6 z-50">
            <div className="bg-white shadow-[0_10px_40px_rgba(0,0,0,0.08)] rounded-[32px] p-2 flex justify-between items-center border border-[#F0EBE1] relative h-20">
              <Link
                href="/pos"
                className="flex flex-col items-center justify-center text-[#8C8C8C] w-1/5 hover:text-[#9A2D0D] transition"
              >
                <Calculator className="h-5 w-5 mb-1" />
                <span className="text-[9px] font-bold">Kasir</span>
              </Link>
              <Link
                href="/menu"
                className="flex flex-col items-center justify-center text-[#8C8C8C] w-1/5 hover:text-[#9A2D0D] transition"
              >
                <Utensils className="h-5 w-5 mb-1" />
                <span className="text-[9px] font-bold">Menu</span>
              </Link>
              <Link
                href="/dashboard"
                className="flex flex-col items-center justify-center text-[#8C8C8C] w-1/5 hover:text-[#9A2D0D] transition"
              >
                <BarChart3 className="h-5 w-5 mb-1" />
                <span className="text-[9px] font-bold">Laporan</span>
              </Link>
              <Link
                href="/riwayat"
                className="flex flex-col items-center justify-center text-[#8C8C8C] w-1/5 hover:text-[#9A2D0D] transition"
              >
                <History className="h-5 w-5 mb-1" />
                <span className="text-[9px] font-bold">Riwayat</span>
              </Link>

              {/* Slot 5: Setelan (AKTIF) */}
              <div className="w-1/5 flex flex-col items-center justify-center relative transition">
                <div className="absolute -top-12 bg-gradient-to-b from-[#F15A2B] to-[#D23F10] w-14 h-14 rounded-full flex items-center justify-center text-white shadow-[0_8px_20px_rgba(241,90,43,0.4)] border-4 border-[#FAF7F2] animate-in zoom-in-75 slide-in-from-bottom-6 duration-500 ease-out">
                  <Settings className="h-6 w-6" />
                </div>
                <span className="mt-8 text-[#9A2D0D] text-[9px] font-extrabold tracking-wide animate-in fade-in duration-500">
                  Setelan
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="fixed bottom-0 w-full max-w-[420px] bg-gradient-to-t from-[#FAF7F2] via-[#FAF7F2] to-transparent pt-10 pb-6 px-6 z-50">
            <div className="bg-white shadow-[0_10px_40px_rgba(0,0,0,0.08)] rounded-[32px] p-2 flex justify-around items-center border border-[#F0EBE1]">
              <Link
                href="/pos"
                className="flex flex-col items-center justify-center text-[#8C8C8C] px-6 py-3 hover:text-[#2D2D2D] transition"
              >
                <Calculator className="h-5 w-5 mb-1" />
                <span className="text-[10px] font-bold tracking-wide">
                  Kasir
                </span>
              </Link>
              <Link
                href="/riwayat"
                className="flex flex-col items-center justify-center text-[#8C8C8C] px-6 py-3 hover:text-[#2D2D2D] transition"
              >
                <History className="h-5 w-5 mb-1" />
                <span className="text-[10px] font-bold tracking-wide">
                  Riwayat
                </span>
              </Link>
              <div className="flex flex-col items-center justify-center bg-[#F15A2B] text-white rounded-[24px] px-6 py-3 shadow-md animate-in zoom-in-90 duration-300 ease-out">
                <Settings className="h-5 w-5 mb-1" />
                <span className="text-[10px] font-bold tracking-wide">
                  Setelan
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
