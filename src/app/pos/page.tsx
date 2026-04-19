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
  doc, // Tambahan untuk update stok
  updateDoc, // Tambahan untuk update stok
  increment, // Fungsi canggih Firebase untuk nambah/kurang angka akurat
} from "firebase/firestore";
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
  Banknote,
  QrCode,
  Settings,
  AlertCircle, // Ikon peringatan stok
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
  stock: number; // Menambahkan tipe data stok
};
type CartItem = Product & {
  qty: number;
  selectedVariant?: string;
  totalPrice: number;
};

export default function PosPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartLoaded, setIsCartLoaded] = useState(false); // Penanda LocalStorage

  // STATE NOTIFIKASI (TOAST)
  const [toast, setToast] = useState({ show: false, msg: "" });

  const showToast = (msg: string) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: "" }), 2500);
  };

  // STATE DATABASE REAL-TIME (Menu)
  const [menuItems, setMenuItems] = useState<Product[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);

  // STATE PERAN & PROFIL
  const [userRole, setUserRole] = useState("Kasir");
  const [userName, setUserName] = useState("Kasir");
  const [userPhoto, setUserPhoto] = useState("");

  // STATE MODAL
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [chosenVariant, setChosenVariant] = useState<Variant | null>(null);
  const [variantQty, setVariantQty] = useState(1);
  const [isVariantOpen, setIsVariantOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"Tunai" | "QRIS">("Tunai");
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. MENDETEKSI USER SAAT INI
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
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
    return () => unsubscribe();
  }, [router]);

  // 2. MENGAMBIL DATA MENU DARI FIREBASE
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

  // 3. MENGAMBIL KERANJANG DARI LOCAL STORAGE (Agar tidak hilang saat pindah halaman)
  useEffect(() => {
    const savedCart = localStorage.getItem("pos_cart_v1");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (error) {
        console.error("Gagal memuat keranjang", error);
      }
    }
    setIsCartLoaded(true);
  }, []);

  // 4. MENYIMPAN KERANJANG KE LOCAL STORAGE OTOMATIS
  useEffect(() => {
    if (isCartLoaded) {
      // TRIK AJAIB: Kita buang properti 'img' (Base64 raksasa) sebelum disimpan
      // agar memori LocalStorage tidak jebol (QuotaExceededError)
      const cartToSave = cart.map(
        ({ img, ...itemTanpaGambar }) => itemTanpaGambar,
      );
      localStorage.setItem("pos_cart_v1", JSON.stringify(cartToSave));
    }
  }, [cart, isCartLoaded]);

  // --- LOGIKA KERANJANG ---
  const handlePlusClick = (product: Product) => {
    // Cek ketersediaan stok sebelum membuka modal / menambah ke keranjang
    const currentCartQty = cart
      .filter((c) => c.id === product.id)
      .reduce((sum, c) => sum + c.qty, 0);
    const stockAvailable = product.stock || 0;

    if (currentCartQty >= stockAvailable) {
      showToast(`Stok ${product.name} habis atau tidak mencukupi!`);
      return;
    }

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
    const currentCartQty = cart
      .filter((c) => c.id === product.id)
      .reduce((sum, c) => sum + c.qty, 0);
    const stockAvailable = product.stock || 0;

    if (currentCartQty + qty > stockAvailable) {
      showToast(
        `Sisa stok ${product.name} hanya ${stockAvailable - currentCartQty} pcs!`,
      );
      return;
    }

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
    showToast(
      `${qty}x ${product.name} ${variant ? `(${variant.name})` : ""} ditambahkan!`,
    );
  };

  const updateQty = (
    id: string,
    variantName: string | undefined,
    delta: number,
  ) => {
    // Validasi penambahan kuantitas dengan stok real-time
    if (delta > 0) {
      const productInDb = menuItems.find((p) => p.id === id);
      const currentCartQty = cart
        .filter((c) => c.id === id)
        .reduce((sum, c) => sum + c.qty, 0);
      const stockAvailable = productInDb?.stock || 0;

      if (currentCartQty + delta > stockAvailable) {
        showToast(`Stok maksimal tercapai! Sisa ${stockAvailable} pcs.`);
        return;
      }
    }

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

  // --- LOGIKA CHECKOUT & POTONG STOK ---
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);

    try {
      // 1. Simpan data transaksi
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
        kasirName: userName,
      };

      await addDoc(collection(db, "transactions"), transactionData);

      // 2. POTONG STOK OTOMATIS DI DATABASE
      // Gabungkan jumlah qty per produk (karena 1 produk bisa punya banyak varian di keranjang)
      const stockDeductions: Record<string, number> = {};
      cart.forEach((item) => {
        if (!stockDeductions[item.id]) stockDeductions[item.id] = 0;
        stockDeductions[item.id] += item.qty;
      });

      // Lakukan pemotongan menggunakan increment(-)
      const updatePromises = Object.keys(stockDeductions).map((productId) => {
        const productRef = doc(db, "products", productId);
        return updateDoc(productRef, {
          stock: increment(-stockDeductions[productId]),
        });
      });
      await Promise.all(updatePromises); // Eksekusi update secara bersamaan agar cepat

      // 3. Kosongkan keranjang setelah berhasil
      setCart([]);
      setIsCheckoutOpen(false);
      showToast("Transaksi Berhasil & Stok Terpotong! 🎉");
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
        {/* NOTIFIKASI TOAST */}
        {toast.show && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-[#2D2D2D] text-white px-5 py-3 rounded-full text-xs font-bold shadow-2xl z-50 animate-in slide-in-from-top-10 fade-in duration-300 flex items-center gap-2 whitespace-nowrap">
            <Check size={16} className="text-[#A3E635]" /> {toast.msg}
          </div>
        )}

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
        </div>

        {/* KONTEN MENU DARI FIREBASE */}
        <div className="px-6 pb-6 mt-4">
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
                Silakan tambah menu di Pengaturan Menu.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {menuItems.map((item) => {
                const stock = item.stock || 0;
                const isLowStock = stock <= 5;
                const isOutOfStock = stock <= 0;

                return (
                  <div
                    key={item.id}
                    // TAMPILAN CARD: Merah jika stok tipis (<= 5)
                    className={`rounded-[32px] p-3 shadow-sm relative transition-all ${
                      isLowStock
                        ? "bg-[#FFF9F8] border-2 border-[#F15A2B]"
                        : "bg-white border border-[#F0EBE1]"
                    }`}
                  >
                    {isLowStock && !isOutOfStock && (
                      <div className="absolute -top-2 -right-2 bg-[#F15A2B] text-white p-1.5 rounded-full shadow-md z-10 animate-pulse">
                        <AlertCircle size={14} strokeWidth={3} />
                      </div>
                    )}

                    <div className="w-full h-28 bg-[#F8F5F0] rounded-[24px] flex items-center justify-center text-4xl mb-3 overflow-hidden relative">
                      {item.img?.startsWith("http") ||
                      item.img?.startsWith("data:") ? (
                        <img
                          src={item.img}
                          className={`w-full h-full object-cover ${isOutOfStock ? "grayscale opacity-50" : ""}`}
                          alt={item.name}
                        />
                      ) : (
                        <span
                          className={isOutOfStock ? "grayscale opacity-50" : ""}
                        >
                          {item.img || "🍽️"}
                        </span>
                      )}

                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                          <span className="bg-[#2D2D2D] text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-white">
                            Habis
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="px-1">
                      <h3 className="font-bold text-[#2D2D2D] text-sm leading-tight mb-1">
                        {item.name}
                      </h3>
                      <p className="text-[10px] text-[#8C8C8C] mb-1">
                        {item.category}
                      </p>

                      {/* INDIKATOR STOK */}
                      <p
                        className={`text-[10px] font-black uppercase mb-2 ${
                          isOutOfStock
                            ? "text-slate-400"
                            : isLowStock
                              ? "text-[#F15A2B]"
                              : "text-[#7A8C4B]"
                        }`}
                      >
                        Sisa Stok: {stock}
                      </p>

                      <div className="flex justify-between items-center mt-auto">
                        <span className="text-[#9A2D0D] font-black text-sm">
                          {item.hasVariants ? "Mulai " : ""}Rp{" "}
                          {(item.price / 1000).toFixed(0)}k
                        </span>
                        <button
                          onClick={() => handlePlusClick(item)}
                          disabled={isOutOfStock}
                          className={`${
                            isOutOfStock
                              ? "bg-[#CFCFCF]"
                              : "bg-[#F15A2B] active:scale-90 shadow-md"
                          } text-white w-8 h-8 flex items-center justify-center rounded-full transition`}
                        >
                          <Plus size={18} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                Tambah - Rp{" "}
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

        {/* FLOATING CART BUTTON & MODAL KERANJANG */}
        <Dialog>
          <DialogTrigger asChild>
            <button className="fixed bottom-28 right-6 w-16 h-16 bg-gradient-to-tr from-[#F15A2B] to-[#EC6340] rounded-full shadow-[0_10px_25px_rgba(241,90,43,0.4)] flex items-center justify-center text-white z-[60] hover:scale-105 active:scale-95 transition-all border-4 border-[#FAF7F2]">
              <ShoppingCart className="h-7 w-7" />
              {totalItems > 0 && (
                <Badge className="absolute -top-2 -left-2 bg-[#2D2D2D] text-white rounded-full h-6 w-6 flex items-center justify-center text-[11px] font-black shadow-md border-2 border-white">
                  {totalItems}
                </Badge>
              )}
            </button>
          </DialogTrigger>
          <DialogContent className="w-[90%] max-w-[400px] rounded-[32px] bg-white p-6 border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl font-bold flex items-center gap-2 text-[#2D2D2D]">
                <ShoppingCart className="text-[#F15A2B]" /> Pesanan
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[250px] mt-4 pr-4">
              {cart.length === 0 ? (
                <div className="text-center py-10 text-[#8C8C8C] font-medium">
                  Keranjang Kosong
                </div>
              ) : (
                cart.map((item, i) => (
                  <div key={i} className="mb-4 border-b border-[#F5EDEB] pb-4">
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
                          className="bg-white rounded-full p-1 active:scale-90 transition shadow-sm"
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
                          className="bg-white rounded-full p-1 active:scale-90 transition shadow-sm"
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
              <p className="text-xs font-bold text-[#8C8C8C] mb-1 uppercase tracking-wide">
                Total Tagihan
              </p>
              <h2 className="text-3xl font-black text-[#9A2D0D] mb-6">
                Rp {totalPrice.toLocaleString("id-ID")}
              </h2>
              <Button
                onClick={() => setIsCheckoutOpen(true)}
                disabled={cart.length === 0}
                className="w-full h-14 bg-gradient-to-r from-[#F15A2B] to-[#EC6340] rounded-full text-lg font-bold shadow-lg hover:brightness-110 active:scale-95 transition"
              >
                Proses Pembayaran
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* NAVBAR BAWAH DINAMIS */}
        {userRole === "Owner" ? (
          <div className="fixed bottom-0 w-full max-w-[420px] bg-gradient-to-t from-[#FAF7F2] via-[#FAF7F2] to-transparent pt-12 pb-6 px-6 z-50">
            <div className="bg-white shadow-[0_10px_40px_rgba(0,0,0,0.08)] rounded-[32px] p-2 flex justify-between items-center border border-[#F0EBE1] relative h-20">
              <div className="w-1/5 flex flex-col items-center justify-center relative transition">
                <div className="absolute -top-12 bg-gradient-to-b from-[#F15A2B] to-[#D23F10] w-14 h-14 rounded-full flex items-center justify-center text-white shadow-[0_8px_20px_rgba(241,90,43,0.4)] border-4 border-[#FAF7F2] animate-in zoom-in-75 slide-in-from-bottom-6 duration-500 ease-out">
                  <Calculator className="h-6 w-6" />
                </div>
                <span className="mt-8 text-[#9A2D0D] text-[9px] font-extrabold tracking-wide animate-in fade-in duration-500">
                  Kasir
                </span>
              </div>
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
              <div className="flex flex-col items-center justify-center bg-[#F15A2B] text-white rounded-[24px] px-6 py-3 shadow-md animate-in zoom-in-90 duration-300 ease-out">
                <Calculator className="h-5 w-5 mb-1" />
                <span className="text-[10px] font-bold tracking-wide">
                  Kasir
                </span>
              </div>
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
