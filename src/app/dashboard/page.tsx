"use client";

import { useState, useEffect } from "react";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  User,
  LogOut,
  Calendar as CalendarIcon,
  Printer,
  Banknote,
  ReceiptText,
  Flame,
  Star,
  History,
  Calculator,
  Utensils,
  BarChart3,
  QrCode,
  Loader2,
  Settings,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // STATE PROFIL
  const [userRole, setUserRole] = useState("Owner");
  const [userName, setUserName] = useState("Owner");
  const [userPhoto, setUserPhoto] = useState("");

  const [transactions, setTransactions] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

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

    return () => {
      clearInterval(timer);
      unsubscribeAuth();
    };
  }, [router]);

  useEffect(() => {
    const unsubTrx = onSnapshot(collection(db, "transactions"), (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        dateObj: doc.data().timestamp?.toDate() || new Date(),
      }));
      data.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
      setTransactions(data);
      setIsLoading(false);
    });

    const unsubProd = onSnapshot(collection(db, "products"), (snap) => {
      setProducts(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubTrx();
      unsubProd();
    };
  }, []);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    setIsCalendarOpen(false);
  };

  const displayedTransactions = date
    ? transactions.filter(
        (t) => format(t.dateObj, "yyyy-MM-dd") === format(date, "yyyy-MM-dd"),
      )
    : transactions;

  const totalOmzet = displayedTransactions.reduce(
    (sum, t) => sum + t.totalAmount,
    0,
  );
  const totalTransaksi = displayedTransactions.length;

  const itemCounts: Record<
    string,
    { qty: number; revenue: number; img: string }
  > = {};

  displayedTransactions.forEach((t) => {
    t.items.forEach((item: any) => {
      if (!itemCounts[item.name]) {
        const prod = products.find((p) => p.name === item.name);
        itemCounts[item.name] = { qty: 0, revenue: 0, img: prod?.img || "🍽️" };
      }
      itemCounts[item.name].qty += item.qty;
      itemCounts[item.name].revenue += item.subtotal;
    });
  });

  const sortedItems = Object.entries(itemCounts).sort(
    (a, b) => b[1].qty - a[1].qty,
  );
  const bestSellerName = sortedItems.length > 0 ? sortedItems[0][0] : "-";
  const topMenuData = sortedItems.slice(0, 4).map((entry) => ({
    name: entry[0],
    qty: entry[1].qty,
    revenue: entry[1].revenue,
    img: entry[1].img,
  }));

  const last7Days = eachDayOfInterval({
    start: subDays(new Date(), 6),
    end: new Date(),
  });
  const weeklyData = last7Days.map((day) => {
    const dailyTotal = transactions
      .filter(
        (t) => format(t.dateObj, "yyyy-MM-dd") === format(day, "yyyy-MM-dd"),
      )
      .reduce((sum, t) => sum + t.totalAmount, 0);
    return {
      day: format(day, "EEE", { locale: localeId }),
      realValue: dailyTotal,
    };
  });

  const maxDaily = Math.max(...weeklyData.map((d) => d.realValue), 1);
  const chartData = weeklyData.map((d) => ({
    day: d.day,
    value: Math.max(5, Math.round((d.realValue / maxDaily) * 100)),
    realValue: d.realValue,
    isPeak: d.realValue === maxDaily && d.realValue > 0,
  }));

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

        <div className="px-6 mb-6">
          <h1 className="text-[36px] font-black font-heading text-[#9A2D0D] leading-tight mb-1">
            Dashboard
          </h1>
          <p className="text-[#8C8C8C] font-medium text-sm">
            {format(currentTime, "EEEE, dd MMMM yyyy", { locale: localeId })} •{" "}
            {format(currentTime, "HH:mm")} WIB
          </p>
        </div>

        <div className="px-6 mb-8 flex justify-between items-center gap-3">
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <button className="flex-1 flex items-center justify-center gap-2 bg-white h-11 rounded-full border border-[#EAEAEA] text-[#2D2D2D] font-bold text-sm shadow-sm hover:bg-[#F5EDEB] transition active:scale-95">
                <CalendarIcon size={16} className="text-[#9A2D0D]" />
                {date
                  ? format(date, "dd MMM yyyy", { locale: localeId })
                  : "Semua Waktu"}
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0 rounded-2xl border-none shadow-2xl"
              align="start"
            >
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                initialFocus
                className="bg-white rounded-2xl"
              />
            </PopoverContent>
          </Popover>

          <Button
            disabled
            className="flex-1 h-11 rounded-full bg-[#CFCFCF] text-white font-bold text-sm shadow-sm opacity-80 flex items-center justify-center gap-2"
          >
            <Printer size={16} /> Export PDF
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-[#F15A2B] h-12 w-12" />
          </div>
        ) : (
          <>
            <div className="px-6 space-y-4 mb-8">
              <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#F0EBE1] relative">
                <div className="w-12 h-12 bg-[#F5EDEB] rounded-2xl flex items-center justify-center text-[#F15A2B] mb-4">
                  <Banknote size={24} />
                </div>
                <p className="text-xs font-bold text-[#8C8C8C] tracking-widest uppercase mb-1">
                  Total Omzet
                </p>
                <h2 className="text-[32px] font-black font-heading text-[#2D2D2D] leading-none">
                  Rp {totalOmzet.toLocaleString("id-ID")}
                </h2>
              </div>

              <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#F0EBE1] relative">
                <div className="w-12 h-12 bg-[#F5EDEB] rounded-2xl flex items-center justify-center text-[#F15A2B] mb-4">
                  <ReceiptText size={24} />
                </div>
                <p className="text-xs font-bold text-[#8C8C8C] tracking-widest uppercase mb-1">
                  Total Transaksi
                </p>
                <h2 className="text-[32px] font-black font-heading text-[#2D2D2D] leading-none">
                  {totalTransaksi.toLocaleString("id-ID")}
                </h2>
              </div>

              <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#F0EBE1] relative">
                <div className="w-12 h-12 bg-[#FFF4E5] rounded-2xl flex items-center justify-center text-[#FF9800] mb-4">
                  <Flame size={24} fill="#FF9800" className="text-[#FF9800]" />
                </div>
                <p className="text-xs font-bold text-[#8C8C8C] tracking-widest uppercase mb-1">
                  Menu Terlaris
                </p>
                <h2 className="text-[24px] font-bold font-heading text-[#2D2D2D] leading-none">
                  {bestSellerName}
                </h2>
              </div>
            </div>

            <div className="px-6 mb-8">
              <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#F0EBE1]">
                <div className="flex items-center gap-3 mb-6">
                  <BarChart3 className="text-[#F15A2B]" size={24} />
                  <h3 className="text-lg font-bold font-heading text-[#2D2D2D] leading-tight">
                    Statistik Pendapatan <br />{" "}
                    <span className="text-[#8C8C8C] text-sm">
                      7 Hari Terakhir
                    </span>
                  </h3>
                </div>

                <div className="flex justify-between items-end h-48 pt-4">
                  {chartData.map((data, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col items-center w-8 group relative"
                    >
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[10px] py-1 px-2 rounded-md whitespace-nowrap pointer-events-none z-20">
                        Rp {(data.realValue / 1000).toFixed(0)}k
                      </div>

                      <div className="relative w-full flex justify-center items-end h-36">
                        <div className="absolute bottom-0 w-6 h-full bg-[#F5F5F5] rounded-full z-0"></div>
                        <div
                          style={{ height: `${data.value}%` }}
                          className={`relative w-6 rounded-full z-10 transition-all duration-1000 shadow-[inset_-3px_0px_5px_rgba(0,0,0,0.15)] ${data.isPeak ? "bg-gradient-to-t from-[#9A2D0D] to-[#D23F10]" : "bg-gradient-to-t from-[#EC6340] to-[#F15A2B]"}`}
                        >
                          <div
                            className={`absolute top-0 left-0 w-full h-3 rounded-full opacity-80 ${data.isPeak ? "bg-[#FF5A36]" : "bg-[#FF8D70]"}`}
                          ></div>
                          {data.isPeak && (
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#2D2D2D] text-white text-[8px] font-bold px-2 py-1 rounded-full whitespace-nowrap">
                              Puncak
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-[#8C8C8C] mt-3 uppercase">
                        {data.day}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 mb-8">
              <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#F0EBE1]">
                <div className="flex items-center gap-2 mb-5">
                  <Star className="text-[#FFC107]" size={20} fill="#FFC107" />
                  <h3 className="text-xl font-bold font-heading text-[#2D2D2D]">
                    Top Menu
                  </h3>
                </div>

                <div className="space-y-5">
                  {topMenuData.length === 0 ? (
                    <p className="text-center text-sm text-[#8C8C8C]">
                      Belum ada data penjualan.
                    </p>
                  ) : (
                    topMenuData.map((menu, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-[#F8F5F0] rounded-full flex items-center justify-center text-2xl shadow-inner overflow-hidden">
                            {menu.img?.startsWith("http") ||
                            menu.img?.startsWith("data:") ? (
                              <img
                                src={menu.img}
                                className="w-full h-full object-cover"
                                alt={menu.name}
                              />
                            ) : (
                              <span>{menu.img}</span>
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-[#2D2D2D] text-sm">
                              {menu.name}
                            </h4>
                            <p className="text-[#8C8C8C] text-xs">
                              {menu.qty} Porsi terjual
                            </p>
                          </div>
                        </div>
                        <span className="font-bold font-heading text-[#9A2D0D]">
                          Rp {menu.revenue.toLocaleString("id-ID")}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 mb-8">
              <div className="flex items-center gap-2 mb-4">
                <History className="text-[#9A2D0D]" size={20} />
                <h3 className="text-xl font-bold font-heading text-[#2D2D2D]">
                  Transaksi Terbaru
                </h3>
              </div>

              <div className="space-y-3">
                {transactions.length === 0 ? (
                  <p className="text-center text-sm text-[#8C8C8C]">
                    Belum ada transaksi.
                  </p>
                ) : (
                  transactions.slice(0, 4).map((trx, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-[24px] p-4 flex items-center justify-between shadow-sm border border-[#F0EBE1]"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#FFF4E5] text-[#FF9800] rounded-full flex items-center justify-center font-bold text-[10px]">
                          #{trx.id.substring(0, 4).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-[#2D2D2D] text-sm">
                            {trx.items.length > 0
                              ? trx.items[0].name
                              : "Pesanan"}{" "}
                            {trx.items.length > 1 &&
                              `+${trx.items.length - 1} item`}
                          </h4>
                          <p className="text-[#8C8C8C] text-[10px] mt-0.5">
                            {format(trx.dateObj, "HH:mm")} • {trx.totalItems}{" "}
                            Item • {trx.paymentMethod}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold font-heading text-[#2D2D2D]">
                          Rp {trx.totalAmount.toLocaleString("id-ID")}
                        </p>
                        <div className="flex justify-end mt-1">
                          {trx.paymentMethod === "QRIS" ? (
                            <QrCode size={14} className="text-[#8C8C8C]" />
                          ) : (
                            <Banknote size={14} className="text-[#8C8C8C]" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

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

              <div className="w-1/5 flex flex-col items-center justify-center relative transition">
                <div className="absolute -top-12 bg-gradient-to-b from-[#F15A2B] to-[#D23F10] w-14 h-14 rounded-full flex items-center justify-center text-white shadow-[0_8px_20px_rgba(241,90,43,0.4)] border-4 border-[#FAF7F2] animate-in zoom-in-75 slide-in-from-bottom-6 duration-500 ease-out">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <span className="mt-8 text-[#9A2D0D] text-[9px] font-extrabold tracking-wide animate-in fade-in duration-500">
                  Laporan
                </span>
              </div>

              <Link
                href="/riwayat"
                className="flex flex-col items-center justify-center text-[#8C8C8C] w-1/5 hover:text-[#9A2D0D] transition"
              >
                <History className="h-5 w-5 mb-1" />
                <span className="text-[9px] font-bold">Riwayat</span>
              </Link>
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
              <Link
                href="/riwayat"
                className="flex flex-col items-center justify-center text-[#8C8C8C] px-6 py-3 hover:text-[#2D2D2D] transition"
              >
                <History className="h-5 w-5 mb-1" />
                <span className="text-[10px] font-bold tracking-wide">
                  Riwayat
                </span>
              </Link>
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
