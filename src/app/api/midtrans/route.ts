import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { order_id, gross_amount, items, customer_name } = body;

    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    const encodedKey = Buffer.from(serverKey + ":").toString("base64");

    // UBAH URL KE PRODUCTION 👇
    const response = await fetch(
      "https://app.midtrans.com/snap/v1/transactions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${encodedKey}`,
        },
        body: JSON.stringify({
          transaction_details: {
            order_id: order_id,
            gross_amount: gross_amount,
          },
          item_details: items,
          customer_details: {
            first_name: customer_name,
          },
          enabled_payments: ["qris", "gopay", "shopeepay"],
        }),
      },
    );

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Midtrans Production Error:", error);
    return NextResponse.json(
      { error: "Gagal membuat transaksi" },
      { status: 500 },
    );
  }
}
