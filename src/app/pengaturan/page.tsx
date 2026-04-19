"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import {
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
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
  Wallet,
  Zap,
  Users,
  Receipt,
} from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState("Kasir");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // STATE BIAYA OPERASIONAL (KHUSUS OWNER)
  const [opCosts, setOpCosts] = useState({
    sewa: 0,
    listrik: 0,
    gaji: 0,
    lainnya: 0,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const role = user.email === "owner@pecelayam.com" ? "Owner" : "Kasir";
        setUserRole(role);
        setDisplayName(user.displayName || "");

        // Ambil data biaya operasional jika yang login Owner
        if (role === "Owner") {
          const docRef = doc(db, "settings", "operational");
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setOpCosts(docSnap.data() as any);
          }
        }
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

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    setIsSaving(true);

    try {
      await updateProfile(currentUser, { displayName: displayName });

      if (newPassword.length >= 6) {
        await updatePassword(currentUser, newPassword);
        setNewPassword("");
      }

      // Simpan Biaya Operasional ke Database (Khusus Owner)
      if (userRole === "Owner") {
        await setDoc(doc(db, "settings", "operational"), opCosts);
      }

      showToast("Pengaturan berhasil disimpan!");
    } catch (error: any) {
      console.error(error);
      alert("Gagal menyimpan pengaturan.");
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

  // Hitung Beban Harian Otomatis
  const totalBulanan =
    opCosts.sewa + opCosts.listrik + opCosts.gaji + opCosts.lainnya;
  const bebanHarian = Math.round(totalBulanan / 30);

  return (
    <div className="min-h-screen bg-[#E5E5E5] flex justify-center font-sans">
      <div className="w-full max-w-[420px] bg-[#FAF7F2] min-h-screen relative pb-32 shadow-xl overflow-x-hidden">
        {toastMsg && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-[#2D2D2D] text-white px-5 py-3 rounded-full text-sm font-bold shadow-2xl z-50 animate-in slide-in-from-top-10 fade-in flex items-center gap-2 whitespace-nowrap">
            <CheckCircle2 size={18} className="text-[#A3E635]" /> {toastMsg}
          </div>
        )}

        <div className="bg-white rounded-b-[40px] shadow-sm pb-8 pt-10 px-6 relative mb-6 text-center">
          <h2 className="text-2xl font-heading font-black text-[#2D2D2D] mb-4">
            Pengaturan
          </h2>
          <div className="w-20 h-20 mx-auto bg-[#F8F5F0] rounded-full border-4 border-[#FAF7F2] shadow-lg flex items-center justify-center text-[#F15A2B]">
            <User size={32} />
          </div>
          <p className="text-[10px] text-[#8C8C8C] font-bold mt-3 uppercase tracking-widest">
            {currentUser?.email}
          </p>
          <div className="mt-2 inline-block bg-[#F5EDEB] text-[#9A2D0D] px-3 py-1 rounded-full text-[10px] font-black uppercase">
            ROLE: {userRole}
          </div>
        </div>

        <div className="px-6 space-y-5">
          {/* AKUN SECTION */}
          <div className="bg-white p-5 rounded-[24px] shadow-sm border border-[#F0EBE1] space-y-4">
            <h3 className="font-black text-[#2D2D2D] border-b border-[#F5EDEB] pb-2 text-sm">
              Profil Akun
            </h3>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-wide">
                Nama Tampilan
              </label>
              <Input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-[#F8F5F0] border-none focus-visible:ring-[#F15A2B] font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-wide">
                Ganti Sandi (Opsional)
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Kosongkan jika tidak diubah"
                className="bg-[#F8F5F0] border-none focus-visible:ring-[#F15A2B] font-bold"
              />
            </div>
          </div>

          {/* BIAYA OPERASIONAL SECTION (KHUSUS OWNER) */}
          {userRole === "Owner" && (
            <div className="bg-white p-5 rounded-[24px] shadow-sm border border-[#F0EBE1] space-y-4">
              <div className="flex justify-between items-end border-b border-[#F5EDEB] pb-2">
                <h3 className="font-black text-[#2D2D2D] text-sm flex items-center gap-2">
                  <Wallet size={16} className="text-[#F15A2B]" /> Biaya
                  Operasional (Bulan)
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8C8C8C] flex gap-1 items-center">
                    <User size={12} /> Sewa Tempat
                  </label>
                  <Input
                    type="number"
                    value={opCosts.sewa || ""}
                    onChange={(e) =>
                      setOpCosts({
                        ...opCosts,
                        sewa: parseInt(e.target.value) || 0,
                      })
                    }
                    className="bg-[#F8F5F0] border-none focus-visible:ring-[#F15A2B] h-10 text-xs font-bold"
                    placeholder="Rp"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8C8C8C] flex gap-1 items-center">
                    <Zap size={12} /> Listrik & Air
                  </label>
                  <Input
                    type="number"
                    value={opCosts.listrik || ""}
                    onChange={(e) =>
                      setOpCosts({
                        ...opCosts,
                        listrik: parseInt(e.target.value) || 0,
                      })
                    }
                    className="bg-[#F8F5F0] border-none focus-visible:ring-[#F15A2B] h-10 text-xs font-bold"
                    placeholder="Rp"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8C8C8C] flex gap-1 items-center">
                    <Users size={12} /> Gaji Karyawan
                  </label>
                  <Input
                    type="number"
                    value={opCosts.gaji || ""}
                    onChange={(e) =>
                      setOpCosts({
                        ...opCosts,
                        gaji: parseInt(e.target.value) || 0,
                      })
                    }
                    className="bg-[#F8F5F0] border-none focus-visible:ring-[#F15A2B] h-10 text-xs font-bold"
                    placeholder="Rp"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8C8C8C] flex gap-1 items-center">
                    <Receipt size={12} /> Lain-lain
                  </label>
                  <Input
                    type="number"
                    value={opCosts.lainnya || ""}
                    onChange={(e) =>
                      setOpCosts({
                        ...opCosts,
                        lainnya: parseInt(e.target.value) || 0,
                      })
                    }
                    className="bg-[#F8F5F0] border-none focus-visible:ring-[#F15A2B] h-10 text-xs font-bold"
                    placeholder="Rp"
                  />
                </div>
              </div>

              {/* TAMPILAN BEBAN HARIAN (BEP) */}
              <div className="bg-[#FFF4E5] p-3 rounded-2xl border border-[#FFD8A8] mt-2">
                <p className="text-[10px] font-bold text-[#E65100] uppercase text-center mb-1">
                  Target Harian Balik Modal (BEP)
                </p>
                <h4 className="text-xl font-black text-[#E65100] text-center">
                  Rp {bebanHarian.toLocaleString("id-ID")}{" "}
                  <span className="text-xs">/ Hari</span>
                </h4>
              </div>
            </div>
          )}

          <Button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="w-full h-14 bg-gradient-to-r from-[#F15A2B] to-[#EC6340] rounded-full text-lg font-bold shadow-lg hover:brightness-110 active:scale-95 flex gap-2"
          >
            {isSaving ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <Save size={20} /> Simpan Pengaturan
              </>
            )}
          </Button>
          <Button
            onClick={() => {
              auth.signOut();
              router.push("/login");
            }}
            variant="outline"
            className="w-full h-12 rounded-full text-red-500 bg-red-50 hover:bg-red-100 font-bold active:scale-95 border-none"
          >
            Keluar (Logout)
          </Button>
        </div>

        {/* NAVBAR BAWAH DINAMIS */}
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

              {/* Slot 5: Setelan (AKTIF - OWNER) */}
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

              {/* Setelan AKTIF (KASIR) */}
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
