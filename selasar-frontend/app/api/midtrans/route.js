import midtransClient from 'midtrans-client';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { order_id, gross_amount, items, seat_code } = body;

    // Inisialisasi Midtrans
    let snap = new midtransClient.Snap({
      isProduction: false, // Ubah ke true jika sudah live/bukan sandbox
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY
    });

    // Parameter pesanan yang dikirim ke Midtrans
    let parameter = {
      transaction_details: {
        order_id: order_id, // ID unik, misal: ORDER-163232323
        gross_amount: gross_amount
      },
      item_details: items.map(item => ({
        id: item.id,
        price: item.price,
        quantity: item.qty,
        name: item.item_name
      })),
      customer_details: {
        first_name: "Mahasiswa",
        last_name: `(Kursi: ${seat_code})`
      }
    };

    // Buat transaksi dan dapatkan tokennya
    const transaction = await snap.createTransaction(parameter);
    
    return NextResponse.json({ token: transaction.token });
  } catch (error) {
    console.error("Midtrans Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}