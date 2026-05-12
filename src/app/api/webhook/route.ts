import { NextResponse } from "next/server";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Midtrans mengirimkan banyak data, kita ambil yang paling penting: ID dan Statusnya
    const { order_id, transaction_status } = body;

    // Jika statusnya settlement (sudah masuk rekening) atau capture (berhasil)
    if (
      transaction_status === "settlement" ||
      transaction_status === "capture"
    ) {
      // Cari transaksi di Firestore yang nomor order-nya cocok dengan dari Midtrans
      const q = query(
        collection(db, "transactions"),
        where("id", "==", order_id),
      );
      const querySnapshot = await getDocs(q);

      // Jika transaksinya ketemu, ubah statusnya jadi "Berhasil"
      querySnapshot.forEach(async (document) => {
        const docRef = doc(db, "transactions", document.id);
        await updateDoc(docRef, { status: "Berhasil" });
      });
    }

    // Wajib mengembalikan status 200 OK agar Midtrans tahu pesannya sudah kita terima
    // Kalau tidak, Midtrans akan terus-terusan ngirim pesan (Spam) sampai berhasil
    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json(
      { error: "Gagal memproses webhook" },
      { status: 500 },
    );
  }
}
