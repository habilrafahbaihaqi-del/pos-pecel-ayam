"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore"; // Tambahan addDoc & serverTimestamp
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LogOut,
  ShoppingCart,
  Plus,
  Minus,
  Calculator,
  History,
  User,
  Check,
  Utensils,
  BarChart3,
  Loader2,
  Banknote, // Tambahan untuk ikon metode pembayaran
  QrCode, // Tambahan untuk ikon metode pembayaran
} from "lucide-react";

type Variant = { name: string; price: number };
type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  img: string;
  hasVariants: boolean;
  variants: Variant[];
};
type CartItem = Product & {
  qty: number;
  selectedVariant?: string;
  totalPrice: number;
};

export default function PosPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);

  // STATE DATABASE REAL-TIME (Menu)
  const [menuItems, setMenuItems] = useState<Product[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);

  // STATE PERAN (Role)
  const [userRole, setUserRole] = useState("Kasir");

  // STATE MODAL VARIAN
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [chosenVariant, setChosenVariant] = useState<Variant | null>(null);
  const [variantQty, setVariantQty] = useState(1);
  const [isVariantOpen, setIsVariantOpen] = useState(false);

  // STATE CHECKOUT PEMBAYARAN
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"Tunai" | "QRIS">("Tunai");
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. MENDETEKSI USER SAAT INI
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email === "owner@pecelayam.com") {
        setUserRole("Owner");
      } else {
        setUserRole("Kasir");
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. MENGAMBIL DATA MENU DARI FIREBASE SECARA REAL-TIME
  useEffect(() => {
    const unsubscribeDb = onSnapshot(collection(db, "products"), (snapshot) => {
      const productsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];

      setMenuItems(productsData);
      setIsLoadingMenu(false);
    });

    return () => unsubscribeDb();
  }, []);

  // --- LOGIKA KERANJANG ---
  const handlePlusClick = (product: Product) => {
    if (product.hasVariants && product.variants?.length > 0) {
      setSelectedProduct(product);
      setChosenVariant(product.variants[0]);
      setVariantQty(1);
      setIsVariantOpen(true);
    } else {
      addToCart(product, 1);
    }
  };

  const addToCart = (product: Product, qty: number, variant?: Variant) => {
    setCart((prev) => {
      const existing = prev.find((item) =>
        variant
          ? item.id === product.id && item.selectedVariant === variant.name
          : item.id === product.id && !item.selectedVariant,
      );
      const price = variant ? variant.price : product.price;
      if (existing) {
        return prev.map((item) =>
          (
            variant
              ? item.id === product.id && item.selectedVariant === variant.name
              : item.id === product.id && !item.selectedVariant
          )
            ? {
                ...item,
                qty: item.qty + qty,
                totalPrice: (item.qty + qty) * price,
              }
            : item,
        );
      }
      return [
        ...prev,
        {
          ...product,
          qty,
          selectedVariant: variant?.name,
          price,
          totalPrice: qty * price,
        },
      ];
    });
    setIsVariantOpen(false);
  };

  const updateQty = (
    id: string,
    variantName: string | undefined,
    delta: number,
  ) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id && item.selectedVariant === variantName
            ? {
                ...item,
                qty: item.qty + delta,
                totalPrice: (item.qty + delta) * item.price,
              }
            : item,
        )
        .filter((item) => item.qty > 0),
    );
  };

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.totalPrice, 0);

  // --- LOGIKA CHECKOUT (SIMPAN KE FIREBASE) ---
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);

    try {
      const transactionData = {
        timestamp: serverTimestamp(),
        items: cart.map((item) => ({
          id: item.id,
          name: item.name,
          qty: item.qty,
          variant: item.selectedVariant || null,
          price: item.price,
          subtotal: item.totalPrice,
        })),
        totalAmount: totalPrice,
        totalItems: totalItems,
        paymentMethod: paymentMethod,
        status: "Berhasil",
      };

      // Simpan ke koleksi 'transactions'
      await addDoc(collection(db, "transactions"), transactionData);

      // Reset State
      setCart([]);
      setIsCheckoutOpen(false);
      alert("Transaksi Berhasil Disimpan!");
    } catch (err) {
      console.error(err);
      alert("Gagal memproses pembayaran");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E5E5E5] flex justify-center font-sans">
      <div className="w-full max-w-[420px] bg-[#FAF7F2] min-h-screen relative pb-32 shadow-xl overflow-hidden">
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 bg-white rounded-b-[40px] shadow-sm mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center border-2 border-[#F15A2B]">
              <User className="text-white h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#8C8C8C] tracking-widest uppercase">
                Peran: {userRole}
              </p>
              <h2 className="text-[#9A2D0D] font-heading font-bold text-lg italic tracking-tight">
                Point of Sales
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* KERANJANG */}
            <Dialog>
              <DialogTrigger asChild>
                <div className="relative cursor-pointer bg-[#F5EDEB] p-3 rounded-full hover:bg-[#EADCD8] transition">
                  <ShoppingCart className="h-6 w-6 text-[#9A2D0D]" />
                  {totalItems > 0 && (
                    <Badge className="absolute -top-1 -right-1 bg-[#F15A2B] text-white rounded-full h-5 w-5 flex items-center justify-center text-[10px] border-2 border-white">
                      {totalItems}
                    </Badge>
                  )}
                </div>
              </DialogTrigger>
              <DialogContent className="w-[90%] max-w-[400px] rounded-[32px] bg-white p-6 border-none">
                <DialogHeader>
                  <DialogTitle className="font-heading text-2xl font-bold flex items-center gap-2 text-[#2D2D2D]">
                    <ShoppingCart className="text-[#F15A2B]" /> Pesanan
                  </DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[250px] mt-4 pr-4">
                  {cart.length === 0 ? (
                    <div className="text-center py-10 text-[#8C8C8C]">
                      Kosong
                    </div>
                  ) : (
                    cart.map((item, i) => (
                      <div
                        key={i}
                        className="mb-4 border-b border-[#F5EDEB] pb-4"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-[#2D2D2D]">
                              {item.name}
                            </h4>
                            {item.selectedVariant && (
                              <p className="text-[10px] font-bold text-[#F15A2B] uppercase tracking-wider">
                                {item.selectedVariant}
                              </p>
                            )}
                          </div>
                          <span className="font-bold text-[#2D2D2D]">
                            Rp {item.totalPrice.toLocaleString("id-ID")}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-[#8C8C8C]">
                            @ Rp {item.price.toLocaleString("id-ID")}
                          </span>
                          <div className="flex items-center gap-3 bg-[#F5EDEB] rounded-full px-2 py-1">
                            <button
                              onClick={() =>
                                updateQty(item.id, item.selectedVariant, -1)
                              }
                              className="bg-white rounded-full p-1 active:scale-90 transition"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="text-xs font-bold w-4 text-center">
                              {item.qty}
                            </span>
                            <button
                              onClick={() =>
                                updateQty(item.id, item.selectedVariant, 1)
                              }
                              className="bg-white rounded-full p-1 active:scale-90 transition"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </ScrollArea>
                <div className="mt-4 pt-4 border-t-2 border-dashed border-[#EAEAEA]">
                  <p className="text-xs font-bold text-[#8C8C8C] mb-1 uppercase">
                    Total Tagihan
                  </p>
                  <h2 className="text-3xl font-black text-[#9A2D0D] mb-6">
                    Rp {totalPrice.toLocaleString("id-ID")}
                  </h2>
                  <Button
                    onClick={() => setIsCheckoutOpen(true)} // Trigger Modal Checkout
                    disabled={cart.length === 0}
                    className="w-full h-14 bg-gradient-to-r from-[#F15A2B] to-[#EC6340] rounded-full text-lg font-bold shadow-lg hover:brightness-110 active:scale-95 transition"
                  >
                    Proses Pembayaran
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Tombol Logout */}
            <div
              onClick={() => {
                auth.signOut();
                router.push("/login");
              }}
              className="bg-[#F5EDEB] p-3 rounded-full text-[#9A2D0D] cursor-pointer active:scale-95 transition"
            >
              <LogOut className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* KONTEN MENU DARI FIREBASE */}
        <div className="px-6 mb-6">
          <h1 className="text-[32px] font-black font-heading text-[#2D2D2D]">
            Menu
          </h1>
        </div>

        <div className="px-6 pb-6">
          {isLoadingMenu ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#8C8C8C]">
              <Loader2 className="animate-spin h-10 w-10 text-[#F15A2B] mb-4" />
              <p className="font-bold">Memuat menu terbaru...</p>
            </div>
          ) : menuItems.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-[#CFCFCF]">
              <Utensils size={40} className="mx-auto text-[#CFCFCF] mb-3" />
              <p className="text-[#8C8C8C] font-medium text-sm px-4">
                Menu masih kosong.
                <br />
                Silakan tambah menu di Dashboard Owner.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {menuItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-[32px] p-3 shadow-sm border border-[#F0EBE1]"
                >
                  <div className="w-full h-28 bg-[#F8F5F0] rounded-[24px] flex items-center justify-center text-4xl mb-3 overflow-hidden">
                    {item.img?.startsWith("http") ||
                    item.img?.startsWith("data:") ? (
                      <img
                        src={item.img}
                        className="w-full h-full object-cover"
                        alt={item.name}
                      />
                    ) : (
                      <span>{item.img || "🍽️"}</span>
                    )}
                  </div>
                  <div className="px-1">
                    <h3 className="font-bold text-[#2D2D2D] text-sm leading-tight mb-1">
                      {item.name}
                    </h3>
                    <p className="text-[10px] text-[#8C8C8C] mb-2">
                      {item.category}
                    </p>
                    <div className="flex justify-between items-center mt-auto">
                      <span className="text-[#9A2D0D] font-black text-sm">
                        {item.hasVariants ? "Mulai " : ""}Rp{" "}
                        {item.price.toLocaleString("id-ID")}
                      </span>
                      <button
                        onClick={() => handlePlusClick(item)}
                        className="bg-[#F15A2B] text-white w-8 h-8 flex items-center justify-center rounded-full active:scale-90 transition shadow-md"
                      >
                        <Plus size={18} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MODAL PILIH VARIAN */}
        <Dialog open={isVariantOpen} onOpenChange={setIsVariantOpen}>
          <DialogContent className="w-[90%] max-w-[400px] rounded-[32px] bg-white p-6 border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-[#2D2D2D]">
                Pilih Varian
              </DialogTitle>
              <p className="text-sm text-[#8C8C8C]">{selectedProduct?.name}</p>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {selectedProduct?.variants?.map((v) => (
                  <button
                    key={v.name}
                    onClick={() => setChosenVariant(v)}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${chosenVariant?.name === v.name ? "border-[#F15A2B] bg-[#F5EDEB] text-[#9A2D0D]" : "border-[#EAEAEA] text-[#8C8C8C]"}`}
                  >
                    <span className="font-bold">{v.name}</span>
                    <span className="text-xs">
                      Rp {v.price.toLocaleString("id-ID")}
                    </span>
                    {chosenVariant?.name === v.name && (
                      <Check size={14} className="mt-1" />
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-center gap-6 py-4">
                <button
                  onClick={() => setVariantQty(Math.max(1, variantQty - 1))}
                  className="w-10 h-10 bg-[#F5EDEB] rounded-full flex items-center justify-center text-[#9A2D0D] active:scale-90 transition"
                >
                  <Minus />
                </button>
                <span className="text-2xl font-black">{variantQty}</span>
                <button
                  onClick={() => setVariantQty(variantQty + 1)}
                  className="w-10 h-10 bg-[#F5EDEB] rounded-full flex items-center justify-center text-[#9A2D0D] active:scale-90 transition"
                >
                  <Plus />
                </button>
              </div>
              <Button
                onClick={() =>
                  selectedProduct &&
                  chosenVariant &&
                  addToCart(selectedProduct, variantQty, chosenVariant)
                }
                className="w-full h-14 bg-[#F15A2B] rounded-full text-lg font-bold shadow-lg"
              >
                Tambah ke Pesanan - Rp{" "}
                {((chosenVariant?.price || 0) * variantQty).toLocaleString(
                  "id-ID",
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL KONFIRMASI PEMBAYARAN (CHECKOUT) */}
        <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
          <DialogContent className="w-[90%] max-w-[400px] rounded-[32px] bg-white p-6 border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-[#2D2D2D]">
                Konfirmasi Bayar
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-6">
              <div className="bg-[#F8F5F0] p-4 rounded-2xl text-center shadow-inner">
                <p className="text-xs font-bold text-[#8C8C8C] uppercase mb-1">
                  Total yang harus dibayar
                </p>
                <h2 className="text-3xl font-black text-[#9A2D0D]">
                  Rp {totalPrice.toLocaleString("id-ID")}
                </h2>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-[#8C8C8C] uppercase tracking-wide">
                  Pilih Metode
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMethod("Tunai")}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95 ${paymentMethod === "Tunai" ? "border-[#F15A2B] bg-[#F5EDEB] text-[#9A2D0D]" : "border-[#EAEAEA] text-[#8C8C8C]"}`}
                  >
                    <Banknote size={24} />{" "}
                    <span className="font-bold">Tunai</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod("QRIS")}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95 ${paymentMethod === "QRIS" ? "border-[#F15A2B] bg-[#F5EDEB] text-[#9A2D0D]" : "border-[#EAEAEA] text-[#8C8C8C]"}`}
                  >
                    <QrCode size={24} /> <span className="font-bold">QRIS</span>
                  </button>
                </div>
              </div>

              <Button
                onClick={handleCheckout}
                disabled={isProcessing}
                className="w-full h-14 bg-[#9A2D0D] hover:bg-[#F15A2B] text-white rounded-full text-lg font-bold shadow-lg active:scale-95 transition-all"
              >
                {isProcessing ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  "Selesaikan Pesanan"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* NAVBAR BAWAH DINAMIS */}
        {userRole === "Owner" ? (
          <div className="fixed bottom-0 w-full max-w-[420px] bg-gradient-to-t from-[#FAF7F2] via-[#FAF7F2] to-transparent pt-12 pb-6 px-6 z-50">
            <div className="bg-white shadow-[0_10px_40px_rgba(0,0,0,0.08)] rounded-[32px] p-2 flex justify-between items-center border border-[#F0EBE1] relative h-20">
              <div className="w-1/4 flex flex-col items-center justify-center relative transition">
                <div className="absolute -top-14 bg-gradient-to-b from-[#F15A2B] to-[#D23F10] w-16 h-16 rounded-full flex items-center justify-center text-white shadow-[0_8px_20px_rgba(241,90,43,0.4)] border-4 border-[#FAF7F2] animate-in zoom-in-75 slide-in-from-bottom-6 duration-500 ease-out">
                  <Calculator className="h-7 w-7" />
                </div>
                <span className="mt-8 text-[#9A2D0D] text-[10px] font-extrabold tracking-wide animate-in fade-in duration-500">
                  Kasir
                </span>
              </div>
              <Link
                href="/menu"
                className="flex flex-col items-center justify-center text-[#8C8C8C] w-1/4 hover:text-[#9A2D0D] transition"
              >
                <Utensils className="h-6 w-6 mb-1" />
                <span className="text-[10px] font-bold">Menu</span>
              </Link>
              <Link
                href="/dashboard"
                className="flex flex-col items-center justify-center text-[#8C8C8C] w-1/4 hover:text-[#9A2D0D] transition"
              >
                <BarChart3 className="h-6 w-6 mb-1" />
                <span className="text-[10px] font-bold">Laporan</span>
              </Link>
              <Link
                href="/riwayat"
                className="flex flex-col items-center justify-center text-[#8C8C8C] w-1/4 hover:text-[#9A2D0D] transition"
              >
                <History className="h-6 w-6 mb-1" />
                <span className="text-[10px] font-bold">Riwayat</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="fixed bottom-0 w-full max-w-[420px] bg-gradient-to-t from-[#FAF7F2] via-[#FAF7F2] to-transparent pt-10 pb-6 px-6">
            <div className="bg-white shadow-[0_10px_40px_rgba(0,0,0,0.08)] rounded-[32px] p-2 flex justify-around items-center border border-[#F0EBE1]">
              <div className="flex flex-col items-center justify-center bg-[#F15A2B] text-white rounded-[24px] px-6 py-3 shadow-md animate-in zoom-in-90 duration-300 ease-out">
                <Calculator className="h-6 w-6 mb-1" />
                <span className="text-[11px] font-bold tracking-wide">
                  Kasir
                </span>
              </div>
              <Link
                href="/riwayat"
                className="flex flex-col items-center justify-center text-[#8C8C8C] px-6 py-3 hover:text-[#2D2D2D] transition"
              >
                <History className="h-6 w-6 mb-1" />
                <span className="text-[11px] font-bold tracking-wide">
                  Riwayat
                </span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
