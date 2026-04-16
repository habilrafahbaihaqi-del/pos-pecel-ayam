import { redirect } from "next/navigation";

export default function Home() {
  // Langsung arahkan (redirect) pengguna ke halaman login saat membuka http://localhost:3000/
  redirect("/login");
}
