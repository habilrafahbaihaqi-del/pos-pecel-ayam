"use client";

import { useState, useEffect } from "react";
import { format, isToday } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
} from "firebase/firestore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User,
  LogOut,
  Calculator,
  History,
  TrendingUp,
  ReceiptText,
  Banknote,
  QrCode,
  Printer,
  Calendar as CalendarIcon,
  Utensils,
  BarChart3,
  Loader2,
  Trash2,
  Settings,
} from "lucide-react";
import Link from "next/link";

export default function RiwayatPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // STATE PROFIL
  const [userRole, setUserRole] = useState("Kasir");
  const [userName, setUserName] = useState("Kasir");
  const [userPhoto, setUserPhoto] = useState("");

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserRole(user.email === "owner@pecelayam.com" ? "Owner" : "Kasir");
        setUserName(
          user.displayName ||
            (user.email === "owner@pecelayam.com" ? "Bos Pecel" : "Kasir"),
        );
        setUserPhoto(user.photoURL || "");
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    const q = query(
      collection(db, "transactions"),
      orderBy("timestamp", "desc"),
    );
    const unsubscribeDb = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        dateObj: doc.data().timestamp?.toDate() || new Date(),
      }));
      setTransactions(data);
      setIsLoading(false);
    });
    return () => unsubscribeDb();
  }, []);

  const handleDeleteTransaction = async (id: string) => {
    const isConfirmed = window.confirm(
      "Apakah Anda yakin ingin membatalkan/menghapus transaksi ini? Data pendapatan akan otomatis disesuaikan.",
    );

    if (isConfirmed) {
      try {
        await deleteDoc(doc(db, "transactions", id));
      } catch (error) {
        console.error("Gagal menghapus transaksi: ", error);
        alert("Terjadi kesalahan saat menghapus transaksi.");
      }
    }
  };

  const filteredTransactions = transactions.filter(
    (t) =>
      format(t.dateObj, "yyyy-MM-dd") ===
      format(date || new Date(), "yyyy-MM-dd"),
  );

  const todayRevenue = transactions
    .filter((t) => isToday(t.dateObj))
    .reduce((sum, t) => sum + t.totalAmount, 0);

  return (
    <div className="min-h-screen bg-[#E5E5E5] flex justify-center font-sans">
      <div className="w-full max-w-[420px] bg-[#FAF7F2] min-h-screen relative pb-32 shadow-xl overflow-hidden">
        {/* HEADER PERSONALISASI */}
        <div className="flex items-center justify-between p-6 bg-white rounded-b-[40px] shadow-sm mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#F8F5F0] rounded-full flex items-center justify-center border-2 border-[#F15A2B] overflow-hidden shadow-inner">
              {userPhoto ? (
                <img
                  src={userPhoto}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="text-[#F15A2B] h-6 w-6" />
              )}
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#8C8C8C] uppercase tracking-wide">
                Hi, {userName}! 👋
              </p>
              <h2 className="text-[#9A2D0D] font-heading font-black text-xl italic tracking-tight leading-tight">
                Point of Sales
              </h2>
            </div>
          </div>
          <div
            onClick={() => {
              auth.signOut();
              router.push("/login");
            }}
            className="bg-[#F5EDEB] p-3 rounded-full text-[#9A2D0D] cursor-pointer hover:bg-[#EADCD8] transition active:scale-95"
          >
            <LogOut className="h-6 w-6" />
          </div>
        </div>

        {/* CARD PENDAPATAN */}
        <div className="px-6 mb-8">
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#F0EBE1] relative overflow-hidden">
            <p className="text-sm font-medium text-[#8C8C8C] mb-1">
              Pendapatan Hari Ini
            </p>
            <h2 className="text-[32px] font-black text-[#9A2D0D] mb-1 leading-none">
              Rp {todayRevenue.toLocaleString("id-ID")}
            </h2>
            <div className="absolute right-[-10px] bottom-[-10px] opacity-10 text-[#F15A2B]">
              <TrendingUp size={100} />
            </div>
          </div>
        </div>

        {/* FILTER KALENDER */}
        <div className="px-6 mb-4 flex justify-between items-center">
          <h3 className="text-xl font-black text-[#2D2D2D]">Riwayat</h3>
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 bg-white px-3 py-2 rounded-full border text-[#9A2D0D] font-bold text-xs shadow-sm hover:bg-[#F5EDEB] transition active:scale-95">
                <CalendarIcon size={14} />{" "}
                {format(date || new Date(), "dd MMM yyyy", {
                  locale: localeId,
                })}
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0 rounded-2xl shadow-2xl border-none"
              align="end"
            >
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => {
                  setDate(d);
                  setIsCalendarOpen(false);
                }}
                className="bg-white rounded-2xl"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* LIST TRANSAKSI */}
        <div className="px-6 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-[#F15A2B] h-10 w-10" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-[#CFCFCF]">
              <ReceiptText size={40} className="mx-auto text-[#CFCFCF] mb-3" />
              <p className="text-[#8C8C8C] font-medium text-sm">
                Tidak ada transaksi di tanggal ini
              </p>
            </div>
          ) : (
            filteredTransactions.map((trx) => (
              <Dialog key={trx.id}>
                <DialogTrigger asChild>
                  <div className="bg-white rounded-[24px] p-4 flex items-center justify-between shadow-sm border border-[#F0EBE1] cursor-pointer hover:bg-[#F8F5F0] active:scale-95 transition">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#F5EDEB] text-[#9A2D0D]">
                        {trx.paymentMethod === "QRIS" ? (
                          <QrCode size={24} />
                        ) : (
                          <Banknote size={24} />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-[#2D2D2D] leading-tight">
                          Rp {trx.totalAmount.toLocaleString("id-ID")}
                        </h4>
                        <p className="text-[10px] text-[#8C8C8C] mt-0.5">
                          {format(trx.dateObj, "HH:mm")} • {trx.paymentMethod}
                        </p>
                      </div>
                    </div>
                    <div className="bg-[#F1F3E1] text-[#7A8C4B] text-[10px] font-bold px-3 py-1 rounded-full border border-[#D5E1A3]">
                      Berhasil
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent className="w-[90%] max-w-[400px] rounded-[32px] bg-white p-6 border-none shadow-2xl">
                  <DialogHeader className="mb-4">
                    <p className="text-[10px] font-bold text-[#8C8C8C] tracking-widest">
                      #{trx.id.substring(0, 8).toUpperCase()}
                    </p>
                    <DialogTitle className="text-2xl font-black text-[#2D2D2D]">
                      Rp {trx.totalAmount.toLocaleString("id-ID")}
                    </DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="max-h-[250px] pr-4 mb-4">
                    <div className="space-y-4">
                      {trx.items.map((item: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex justify-between items-start"
                        >
                          <div className="flex gap-3">
                            <span className="w-6 h-6 rounded-full bg-[#F15A2B] text-white text-[10px] flex items-center justify-center font-bold mt-0.5 shrink-0">
                              {item.qty}
                            </span>
                            <div>
                              <p className="text-sm font-bold leading-tight">
                                {item.name}
                              </p>
                              {item.variant && (
                                <p className="text-[10px] text-[#F15A2B] font-bold uppercase mt-1">
                                  {item.variant}
                                </p>
                              )}
                            </div>
                          </div>
                          <p className="text-sm font-bold text-[#8C8C8C]">
                            Rp {item.subtotal.toLocaleString("id-ID")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="border-t border-[#EAEAEA] pt-4 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-bold text-[#8C8C8C]">
                        {format(trx.dateObj, "dd MMM yyyy, HH:mm", {
                          locale: localeId,
                        })}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleDeleteTransaction(trx.id)}
                          variant="outline"
                          className="rounded-full border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 h-9 text-xs font-bold px-3 flex gap-1.5 transition active:scale-95"
                        >
                          <Trash2 size={14} /> Batal
                        </Button>

                        <Button
                          disabled
                          className="rounded-full bg-[#CFCFCF] text-white h-9 text-xs font-bold px-4 flex gap-1.5"
                        >
                          <Printer size={14} /> Struk
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            ))
          )}
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

              <div className="w-1/5 flex flex-col items-center justify-center relative transition">
                <div className="absolute -top-12 bg-gradient-to-b from-[#F15A2B] to-[#D23F10] w-14 h-14 rounded-full flex items-center justify-center text-white shadow-[0_8px_20px_rgba(241,90,43,0.4)] border-4 border-[#FAF7F2] animate-in zoom-in-75 slide-in-from-bottom-6 duration-500 ease-out">
                  <History className="h-6 w-6" />
                </div>
                <span className="mt-8 text-[#9A2D0D] text-[9px] font-extrabold tracking-wide animate-in fade-in duration-500">
                  Riwayat
                </span>
              </div>

              <Link
                href="/pengaturan"
                className="flex flex-col items-center justify-center text-[#8C8C8C] w-1/5 hover:text-[#9A2D0D] transition"
              >
                <Settings className="h-5 w-5 mb-1" />
                <span className="text-[9px] font-bold">Setelan</span>
              </Link>
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

              <div className="flex flex-col items-center justify-center bg-[#F15A2B] text-white rounded-[24px] px-6 py-3 shadow-md animate-in zoom-in-90 duration-300 ease-out">
                <History className="h-5 w-5 mb-1" />
                <span className="text-[10px] font-bold tracking-wide">
                  Riwayat
                </span>
              </div>

              <Link
                href="/pengaturan"
                className="flex flex-col items-center justify-center text-[#8C8C8C] px-6 py-3 hover:text-[#2D2D2D] transition"
              >
                <Settings className="h-5 w-5 mb-1" />
                <span className="text-[10px] font-bold tracking-wide">
                  Setelan
                </span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
