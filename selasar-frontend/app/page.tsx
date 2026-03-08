'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Home() {
  // --- REVISI: Menambahkan <any[]> dan <any> agar TypeScript tidak rewel ---
  const [seats, setSeats] = useState<any[]>([]);
  const [vendor, setVendor] = useState<any>(null);
  const [menus, setMenus] = useState<any[]>([]);
  
  const [cart, setCart] = useState<any[]>([]);
  const [customerSeat, setCustomerSeat] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeOrder, setActiveOrder] = useState<any>(null);

  useEffect(() => {
    fetchData();

    // --- SCRIPT MIDTRANS SNAP ---
    const snapScript = "https://app.sandbox.midtrans.com/snap/snap.js";
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY as string;
    const script = document.createElement("script");
    script.src = snapScript;
    script.setAttribute("data-client-key", clientKey);
    script.async = true;
    document.body.appendChild(script);

    const channel = supabase
      .channel('realtime-selasar')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'seats' }, (payload) => {
        setSeats((prev) => prev.map((item) => (item.id === payload.new.id ? payload.new : item)));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'vendors' }, (payload) => {
        if (vendor && payload.new.id === vendor.id) setVendor(payload.new);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        setActiveOrder((prev: any) => {
          if (prev && prev.id === payload.new.id) return payload.new;
          return prev;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (document.body.contains(script)) {
         document.body.removeChild(script); 
      }
    };
  }, [vendor]);

  async function fetchData() {
    const { data: seatsData } = await supabase.from('seats').select('*').order('seat_code');
    if (seatsData) setSeats(seatsData);

    const { data: vendorData } = await supabase.from('vendors').select('*').limit(1).single();
    if (vendorData) {
      setVendor(vendorData);
      const { data: menusData } = await supabase.from('menus').select('*').eq('vendor_id', vendorData.id);
      if (menusData) setMenus(menusData);
    }
  }

  // --- REVISI: Menambahkan :any pada parameter ---
  const addToCart = (menuItem: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === menuItem.id);
      if (existing) return prev.map((item) => item.id === menuItem.id ? { ...item, qty: item.qty + 1 } : item);
      return [...prev, { ...menuItem, qty: 1 }];
    });
  };

  const removeFromCart = (menuId: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === menuId);
      if (existing.qty === 1) return prev.filter(item => item.id !== menuId);
      return prev.map((item) => item.id === menuId ? { ...item, qty: item.qty - 1 } : item);
    });
  };

  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  // --- LOGIKA PEMBAYARAN MIDTRANS ---
  const handlePaymentAndOrder = async () => {
    if (!customerSeat) return alert("Pilih meja/kursi Anda dulu ya!");
    if (cart.length === 0) return alert("Keranjang masih kosong!");
    
    setIsSubmitting(true);
    const orderIdMidtrans = `ORDER-${Date.now()}`; 

    try {
      const response = await fetch('/api/midtrans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderIdMidtrans,
          gross_amount: totalPrice,
          items: cart,
          seat_code: customerSeat
        }),
      });

      const { token } = await response.json();

      if (!token) throw new Error("Gagal mendapatkan token pembayaran");

      // @ts-ignore
      window.snap.pay(token, {
        onSuccess: async function (result: any) {
          console.log("Pembayaran Sukses!", result);
          saveOrderToDatabase(orderIdMidtrans, 'SUDAH DIBAYAR - PENDING');
        },
        onPending: function (result: any) {
          alert("Pembayaran tertunda. Selesaikan pembayaran Anda.");
          setIsSubmitting(false);
        },
        onError: function (result: any) {
          alert("Pembayaran gagal!");
          setIsSubmitting(false);
        },
        onClose: function () {
          setIsSubmitting(false);
        }
      });

    } catch (error: any) {
      alert("Terjadi kesalahan: " + error.message);
      setIsSubmitting(false);
    }
  };

  const saveOrderToDatabase = async (paymentId: string, status: string) => {
    const { data, error } = await supabase.from('orders').insert({
      vendor_id: vendor.id,
      seat_code: customerSeat,
      total_price: totalPrice,
      order_details: cart,
      status: 'PENDING'
    }).select().single(); 

    setIsSubmitting(false);

    if (error) {
      alert("Pembayaran berhasil tapi gagal meneruskan ke penjual. Hubungi admin.");
    } else {
      setActiveOrder(data); 
      setCart([]); 
      setCustomerSeat(''); 
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 font-sans selection:bg-teal-200 selection:text-teal-900">
      
      {/* Header Modern */}
      <div className="text-center mb-12 animate-fade-in">
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 mb-3 tracking-tight">
          Smart Selasar 🎓
        </h1>
        <p className="text-slate-500 font-medium text-lg">Pesan makan & pantau kursi kosong dalam satu sentuhan.</p>
      </div>
      
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Tiket Pesanan Aktif (Jika ada) */}
        {activeOrder && (
          <section className={`p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white/60 transition-all duration-500 relative overflow-hidden ${
            activeOrder.status === 'PENDING' ? 'bg-gradient-to-br from-red-50 to-orange-50' :
            activeOrder.status === 'PROSES' ? 'bg-gradient-to-br from-yellow-50 to-amber-50' :
            'bg-gradient-to-br from-emerald-50 to-teal-50'
          }`}>
            <div className="absolute -right-10 -top-10 opacity-10 blur-2xl">
              <div className="w-64 h-64 rounded-full bg-current"></div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10 gap-6">
              <div>
                <span className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-2 block">Status Pesanan Berjalan</span>
                <h2 className="text-3xl font-black text-slate-800 mb-1 flex items-center gap-3">
                  🎟️ Meja {activeOrder.seat_code}
                </h2>
                <p className="text-slate-600 font-semibold text-lg">Total: <span className="text-emerald-600">Rp {activeOrder.total_price.toLocaleString('id-ID')}</span> (LUNAS)</p>
              </div>
              
              <div className="w-full md:w-auto text-right">
                <div className={`px-8 py-4 rounded-2xl text-lg font-black text-white shadow-lg flex items-center justify-center gap-3 ${
                  activeOrder.status === 'PENDING' ? 'bg-gradient-to-r from-red-500 to-orange-400' :
                  activeOrder.status === 'PROSES' ? 'bg-gradient-to-r from-amber-500 to-yellow-400 animate-pulse' :
                  'bg-gradient-to-r from-emerald-500 to-teal-400'
                }`}>
                  {activeOrder.status === 'PENDING' ? '⏳ MENUNGGU DIMASAK' :
                   activeOrder.status === 'PROSES' ? '👨‍🍳 SEDANG DIMASAK' :
                   '✅ SIAP DIAMBIL / DIANTAR'}
                </div>
              </div>
            </div>

            {activeOrder.status === 'SELESAI' && (
              <button 
                onClick={() => setActiveOrder(null)}
                className="mt-8 w-full py-4 bg-white/80 hover:bg-white text-slate-800 font-bold rounded-2xl hover:shadow-md transition-all border border-slate-200"
              >
                Tutup Tiket Pesanan
              </button>
            )}
          </section>
        )}

        {/* Section Status Kursi */}
        <section className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h2 className="text-2xl font-bold text-slate-800">🪑 Status Kursi Selasar</h2>
            
            {/* Legend Modern */}
            <div className="flex gap-4 text-sm font-bold text-slate-600 bg-slate-50 py-2.5 px-5 rounded-full border border-slate-200">
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 bg-emerald-100 border-2 border-emerald-400 rounded-full"></span> Kosong
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 bg-amber-400 rounded-full shadow-[0_0_8px_#fbbf24]"></span> Terisi
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-4">
            {seats.map((seat) => (
              <div 
                key={seat.id} 
                className={`flex items-center justify-center h-16 rounded-2xl font-black text-xl transition-all duration-300 ${
                  seat.is_occupied 
                    ? 'bg-gradient-to-br from-amber-100 to-orange-100 border-2 border-amber-300 text-amber-800 shadow-[0_0_15px_rgba(251,191,36,0.3)] scale-105 z-10'
                    : 'bg-white border-2 border-slate-100 text-slate-400 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                {seat.seat_code}
              </div>
            ))}
          </div>
        </section>

        {!activeOrder && (
          <section>
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                🍽️ Menu Spesial {vendor ? vendor.vendor_name : 'Kantin'}
              </h2>
              {vendor && (
                <span className={`px-5 py-2 rounded-full text-sm font-bold shadow-sm flex items-center gap-2 ${vendor.is_open ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                  <span className={`w-2 h-2 rounded-full ${vendor.is_open ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                  {vendor.is_open ? 'TOKO BUKA' : 'TOKO TUTUP'}
                </span>
              )}
            </div>

            {!vendor ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
              </div>
            ) : !vendor.is_open ? (
              <div className="bg-white p-12 rounded-3xl text-center shadow-sm border border-slate-100">
                <div className="text-5xl mb-4">😴</div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Maaf, kantin sedang istirahat</h3>
                <p className="text-slate-500">Silakan kembali lagi nanti ya.</p>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row gap-8 items-start">
                
                {/* Daftar Menu Grid */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
                  {menus.map(menu => (
                    <div key={menu.id} className="group relative bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 hover:shadow-xl hover:border-emerald-200 transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col justify-between">
                      {/* Dekorasi Background */}
                      <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      
                      <div className="relative z-10 mb-6">
                        <h4 className="font-extrabold text-slate-800 text-xl leading-tight mb-2 group-hover:text-emerald-700 transition-colors">{menu.item_name}</h4>
                        <p className="text-teal-600 font-bold text-lg">Rp {menu.price.toLocaleString('id-ID')}</p>
                      </div>
                      
                      <button 
                        onClick={() => addToCart(menu)} 
                        className="relative z-10 w-full bg-slate-50 text-slate-700 border border-slate-200 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                        Tambah
                      </button>
                    </div>
                  ))}
                </div>

                {/* Sidebar Keranjang Modern */}
                <div className="w-full lg:w-[400px] bg-white/80 backdrop-blur-xl p-7 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white h-fit sticky top-6">
                  <h3 className="font-bold text-2xl text-slate-800 mb-6 flex items-center gap-3">
                    🛍️ Keranjang
                    {cart.length > 0 && (
                      <span className="bg-emerald-500 text-white text-sm w-6 h-6 flex items-center justify-center rounded-full">
                        {cart.reduce((total, item) => total + item.qty, 0)}
                      </span>
                    )}
                  </h3>
                  
                  {cart.length === 0 ? (
                    <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                      <p className="text-slate-400 font-medium text-lg mb-2">Masih kosong nih...</p>
                      <p className="text-slate-400 text-sm">Pilih menu favoritmu di samping kiri!</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                        {cart.map(item => (
                          <div key={item.id} className="flex justify-between items-center group">
                            <div className="flex-1 pr-4">
                              <p className="font-bold text-slate-800 leading-tight">{item.item_name}</p>
                              <p className="text-teal-600 font-medium mt-1">Rp {(item.price * item.qty).toLocaleString('id-ID')}</p>
                            </div>
                            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 border border-slate-200">
                              <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-white rounded-lg transition-all font-bold">-</button>
                              <span className="font-bold w-6 text-center text-slate-700">{item.qty}</span>
                              <button onClick={() => addToCart(item)} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-emerald-500 hover:bg-white rounded-lg transition-all font-bold">+</button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="border-t-2 border-slate-100 pt-6">
                        <div className="flex justify-between font-black text-xl text-slate-800 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <span>Total Bayar:</span>
                          <span className="text-emerald-600">Rp {totalPrice.toLocaleString('id-ID')}</span>
                        </div>

                        <div className="mb-6">
                          <label className="block text-sm font-bold text-slate-700 mb-3">📍 Pilih Lokasi Duduk Anda:</label>
                          <div className="relative">
                            <select 
                              className="w-full p-4 pl-5 border-2 border-slate-200 rounded-2xl bg-white focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-50 font-bold text-slate-700 appearance-none transition-all cursor-pointer"
                              value={customerSeat}
                              onChange={(e) => setCustomerSeat(e.target.value)}
                            >
                              <option value="">-- Ketuk untuk pilih meja --</option>
                              {seats.map(seat => (
                                <option key={seat.id} value={seat.seat_code}>
                                  Meja {seat.seat_code} {seat.is_occupied ? '(Anda di sini?)' : ''}
                                </option>
                              ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                          </div>
                        </div>

                        <button 
                          onClick={handlePaymentAndOrder}
                          disabled={isSubmitting || !customerSeat}
                          className={`w-full py-4 rounded-2xl font-black text-white transition-all transform flex items-center justify-center gap-2 text-lg ${
                            isSubmitting || !customerSeat 
                              ? 'bg-slate-300 cursor-not-allowed opacity-70' 
                              : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-[0_8px_20px_rgba(16,185,129,0.3)] hover:shadow-[0_8px_25px_rgba(16,185,129,0.4)] hover:-translate-y-0.5'
                          }`}
                        >
                          {isSubmitting ? (
                             <span className="flex items-center gap-2">
                               <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                               Memproses...
                             </span>
                          ) : '💳 Bayar Sekarang'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

      </div>
    </div>
  );
}