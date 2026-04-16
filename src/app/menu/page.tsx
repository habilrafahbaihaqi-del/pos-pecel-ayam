"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase"; // Jembatan ke Firebase
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore"; // Tools CRUD Firestore
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User,
  LogOut,
  Plus,
  Edit3,
  Calculator,
  Utensils,
  BarChart3,
  History,
  Search,
  Image as ImageIcon,
  Camera,
  Trash2,
  Loader2,
} from "lucide-react";
import Link from "next/link";

// --- TIPE DATA ---
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

const categories = ["Semua", "Makanan", "Minuman", "Sate-satean", "Tambahan"];

export default function MenuManagementPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [userRole, setUserRole] = useState("Kasir");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [formData, setFormData] = useState<Product>({
    id: "",
    name: "",
    category: "Makanan",
    price: 0,
    img: "",
    hasVariants: false,
    variants: [],
  });

  // 1. CEK STATUS LOGIN & PERAN
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserRole(user.email === "owner@pecelayam.com" ? "Owner" : "Kasir");
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. AMBIL DATA DARI FIREBASE (REAL-TIME)
  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];
      setProducts(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- LOGIKA FILTER ---
  const filteredProducts = products.filter((p) => {
    const matchesCat =
      activeCategory === "Semua" || p.category === activeCategory;
    const matchesSearch = p.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // --- FUNGSI CRUD ---
  const handleOpenAdd = () => {
    setModalMode("add");
    setFormData({
      id: "",
      name: "",
      category: "Makanan",
      price: 0,
      img: "",
      hasVariants: false,
      variants: [],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setModalMode("edit");
    setFormData(JSON.parse(JSON.stringify(product)));
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () =>
        setFormData({ ...formData, img: reader.result as string });
      reader.readAsDataURL(file); // Simpan sebagai Base64 untuk sementara
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.img) return alert("Lengkapi data!");
    setIsLoading(true);

    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        price: formData.hasVariants
          ? Math.min(...formData.variants.map((v) => v.price))
          : formData.price,
        img: formData.img,
        hasVariants: formData.hasVariants,
        variants: formData.hasVariants ? formData.variants : [],
      };

      if (modalMode === "add") {
        await addDoc(collection(db, "products"), payload);
      } else {
        await updateDoc(doc(db, "products", formData.id), payload);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan ke Firebase");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Hapus produk ini?")) {
      try {
        await deleteDoc(doc(db, "products", id));
      } catch (err) {
        alert("Gagal menghapus");
      }
    }
  };

  // --- UI HELPERS ---
  const renderImg = (img: string, size: string) => (
    <div
      className={`${size} bg-[#F8F5F0] rounded-[18px] flex items-center justify-center overflow-hidden shadow-inner`}
    >
      {img?.length > 10 ? (
        <img src={img} className="w-full h-full object-cover" />
      ) : (
        <span className="text-4xl">{img || "🍽️"}</span>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#E5E5E5] flex justify-center font-sans">
      <div className="w-full max-w-[420px] bg-[#FAF7F2] min-h-screen relative pb-32 shadow-xl overflow-hidden">
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 bg-white rounded-b-[40px] shadow-sm mb-4">
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

        {/* TITLE & ADD */}
        <div className="px-6 mb-4 flex justify-between items-end">
          <div>
            <h1 className="text-[32px] font-black font-heading text-[#9A2D0D] leading-tight">
              Daftar Menu
            </h1>
            <p className="text-[#8C8C8C] text-sm font-medium">
              {filteredProducts.length} Produk Tersedia
            </p>
          </div>
          <Button
            onClick={handleOpenAdd}
            className="rounded-full bg-gradient-to-r from-[#F15A2B] to-[#EC6340] text-white shadow-lg px-5 h-11 active:scale-95 transition"
          >
            <Plus size={18} strokeWidth={3} /> Tambah
          </Button>
        </div>

        {/* SEARCH & FILTER */}
        <div className="px-6 mb-4 relative">
          <Search className="absolute left-10 top-1/2 -translate-y-1/2 text-[#8C8C8C] h-4 w-4" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 rounded-full border-none bg-white shadow-sm h-12"
            placeholder="Cari nama produk..."
          />
        </div>

        <div className="px-6 mb-6 overflow-x-auto flex gap-2 pb-2 [&::-webkit-scrollbar]:hidden">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-bold transition shadow-sm ${activeCategory === cat ? "bg-[#F15A2B] text-white" : "bg-white text-[#8C8C8C] border border-[#EAEAEA]"}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* LIST KARTU PRODUK */}
        <div className="px-6 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center py-20">
              <Loader2 className="animate-spin text-[#F15A2B] h-10 w-10" />
            </div>
          ) : (
            filteredProducts.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-[24px] p-3 flex gap-4 shadow-sm border border-[#F0EBE1] relative items-center"
              >
                {renderImg(p.img, "w-20 h-20")}
                <div className="flex-1">
                  <p className="text-[10px] text-[#8C8C8C] font-bold uppercase">
                    {p.category}
                  </p>
                  <h4 className="font-bold text-[#2D2D2D] leading-tight">
                    {p.name}
                  </h4>
                  <p className="text-[#9A2D0D] font-black text-sm">
                    {p.hasVariants && "Mulai "}Rp{" "}
                    {p.price.toLocaleString("id-ID")}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="w-8 h-8 bg-[#F5EDEB] text-[#9A2D0D] rounded-full flex items-center justify-center hover:bg-[#F15A2B] hover:text-white transition"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="w-8 h-8 bg-red-50 text-red-500 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* MODAL FORM */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="w-[95%] max-w-[400px] rounded-[32px] bg-white p-6 border-none shadow-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-[#2D2D2D]">
                {modalMode === "add" ? "Tambah Menu" : "Edit Menu"}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="flex-1 pr-2">
              <div className="space-y-4 py-2">
                <div className="flex flex-col items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                  />
                  <div
                    className="relative group cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {renderImg(formData.img, "w-32 h-32")}
                    <div className="absolute inset-0 bg-black/40 rounded-[18px] opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition">
                      <Camera size={24} />
                      <span className="text-[10px] font-bold">UBAH FOTO</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8C8C8C] uppercase">
                    Nama
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="bg-[#F8F5F0] border-none h-12 rounded-2xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8C8C8C] uppercase">
                    Kategori
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full bg-[#F8F5F0] border-none h-12 rounded-2xl px-4 text-sm focus:ring-1 focus:ring-[#F15A2B]"
                  >
                    {categories
                      .filter((c) => c !== "Semua")
                      .map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex items-center justify-between bg-[#F8F5F0] p-4 rounded-2xl">
                  <span className="text-sm font-bold">Varian?</span>
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-[#F15A2B]"
                    checked={formData.hasVariants}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        hasVariants: e.target.checked,
                      })
                    }
                  />
                </div>

                {!formData.hasVariants ? (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8C8C8C] uppercase">
                      Harga
                    </label>
                    <Input
                      type="number"
                      value={formData.price || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price: parseInt(e.target.value) || 0,
                        })
                      }
                      className="bg-[#F8F5F0] border-none h-12 rounded-2xl"
                    />
                  </div>
                ) : (
                  <div className="space-y-3 border border-dashed border-[#F15A2B] p-4 rounded-2xl">
                    {formData.variants.map((v, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          placeholder="Nama"
                          value={v.name}
                          onChange={(e) => {
                            const nv = [...formData.variants];
                            nv[i].name = e.target.value;
                            setFormData({ ...formData, variants: nv });
                          }}
                          className="bg-[#F8F5F0] border-none h-10 text-xs"
                        />
                        <Input
                          type="number"
                          placeholder="Harga"
                          value={v.price || ""}
                          onChange={(e) => {
                            const nv = [...formData.variants];
                            nv[i].price = parseInt(e.target.value) || 0;
                            setFormData({ ...formData, variants: nv });
                          }}
                          className="w-24 bg-[#F8F5F0] border-none h-10 text-xs"
                        />
                        <button
                          onClick={() =>
                            setFormData({
                              ...formData,
                              variants: formData.variants.filter(
                                (_, idx) => idx !== i,
                              ),
                            })
                          }
                          className="text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <Button
                      onClick={() =>
                        setFormData({
                          ...formData,
                          variants: [
                            ...formData.variants,
                            { name: "", price: 0 },
                          ],
                        })
                      }
                      variant="outline"
                      className="w-full text-xs h-10 border-[#F15A2B] text-[#F15A2B]"
                    >
                      + Varian
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="w-full h-14 bg-gradient-to-r from-[#F15A2B] to-[#EC6340] rounded-full text-lg font-bold mt-4 shadow-lg"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Simpan Produk"
              )}
            </Button>
          </DialogContent>
        </Dialog>

        {/* NAVBAR BAWAH */}
        <div className="fixed bottom-0 w-full max-w-[420px] bg-gradient-to-t from-[#FAF7F2] via-[#FAF7F2] to-transparent pt-12 pb-6 px-6 z-50">
          <div className="bg-white shadow-[0_10px_40px_rgba(0,0,0,0.08)] rounded-[32px] p-2 flex justify-between items-center border border-[#F0EBE1] relative h-20">
            <Link
              href="/pos"
              className="flex flex-col items-center justify-center text-[#8C8C8C] w-1/4 hover:text-[#9A2D0D] transition"
            >
              <Calculator className="h-6 w-6 mb-1" />
              <span className="text-[10px] font-bold">Kasir</span>
            </Link>
            <div className="w-1/4 flex flex-col items-center justify-center relative">
              <div className="absolute -top-14 bg-gradient-to-b from-[#F15A2B] to-[#D23F10] w-16 h-16 rounded-full flex items-center justify-center text-white shadow-[0_8px_20px_rgba(241,90,43,0.4)] border-4 border-[#FAF7F2] animate-in zoom-in-75 slide-in-from-bottom-6 duration-500">
                <Utensils className="h-7 w-7" />
              </div>
              <span className="mt-8 text-[#9A2D0D] text-[10px] font-extrabold tracking-wide">
                Menu
              </span>
            </div>
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
      </div>
    </div>
  );
}
