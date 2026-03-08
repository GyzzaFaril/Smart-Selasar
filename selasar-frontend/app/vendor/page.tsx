'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function VendorDashboard() {
  // 1. Tambahkan tipe <any> dan <any[]> pada useState agar tidak error "never[]"
  const [myVendor, setMyVendor] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);

  // State untuk form Tambah Menu
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [isSubmittingMenu, setIsSubmittingMenu] = useState(false);

  // 2. Beri tipe "any" (atau string/number) pada parameter vendorId
  const fetchOrders = async (vendorId: any) => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false }); 
    
    if (data) setOrders(data);
  };

  useEffect(() => {
    let currentVendorId: any = null; // Definisikan tipe di sini juga

    const initData = async () => {
      const { data: vendorData, error } = await supabase
        .from('vendors')
        .select('*')
        .limit(1)
        .single(); 

      if (vendorData) {
        setMyVendor(vendorData);
        currentVendorId = vendorData.id;
        fetchOrders(currentVendorId);
      } else if (error) {
        console.error("Gagal mengambil data toko. Pastikan ada minimal 1 data di tabel vendors!");
      }
    };

    initData();

    const channel = supabase
      .channel('realtime-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        if (currentVendorId) {
          fetchOrders(currentVendorId);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 3. Tambahkan tipe pada parameter orderId dan newStatus
  const updateStatus = async (orderId: any, newStatus: string) => {
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
  };

  // 4. Tambahkan tipe React.FormEvent pada parameter 'e'
  const handleAddMenu = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); 

    if (!newItemName || !newItemPrice) return alert("Nama menu dan harga harus diisi!");
    
    setIsSubmittingMenu(true);

    const { error } = await supabase.from('menus').insert({
      vendor_id: myVendor.id, 
      item_name: newItemName,
      price: parseInt(newItemPrice),
      is_available: true 
    });

    setIsSubmittingMenu(false);

    if (error) {
      alert("Gagal menambah menu: " + error.message);
    } else {
      alert("✅ Menu berhasil ditambahkan!");
      setNewItemName(''); 
      setNewItemPrice('');
      setShowMenuForm(false); 
    }
  };

  if (!myVendor) {
    return (
      <div className="min-h-screen bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-xl">
        Memuat Dashboard Toko... ⏳
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-800 p-6 font-sans text-slate-100">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Dashboard Otomatis pakai Nama Toko */}
        <div className="flex justify-between items-center border-b border-slate-600 pb-4">
          <h1 className="text-3xl font-bold text-emerald-400">🧑‍🍳 Dashboard: {myVendor.vendor_name}</h1>
          <div className={`px-4 py-2 rounded-lg text-sm font-bold ${myVendor.is_open ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
            Status: {myVendor.is_open ? 'BUKA' : 'TUTUP'}
          </div>
        </div>

        {/* SECTION BARU: Tambah Menu */}
        <div className="bg-slate-700 p-5 rounded-xl border border-slate-600">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">🍔 Manajemen Menu</h2>
            <button 
              onClick={() => setShowMenuForm(!showMenuForm)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-bold transition text-sm"
            >
              {showMenuForm ? 'Batal / Tutup' : '+ Tambah Menu Baru'}
            </button>
          </div>

          {/* Form Tambah Menu */}
          {showMenuForm && (
            <form onSubmit={handleAddMenu} className="mt-4 bg-slate-800 p-4 rounded-lg border border-slate-600 flex gap-4 items-end animate-fade-in">
              <div className="flex-1">
                <label className="block text-sm text-slate-400 mb-1">Nama Makanan / Minuman</label>
                <input 
                  type="text" 
                  className="w-full p-2 rounded bg-slate-900 border border-slate-600 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Cth: Nasi Goreng Spesial"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  required
                />
              </div>
              <div className="w-1/3">
                <label className="block text-sm text-slate-400 mb-1">Harga (Rp)</label>
                <input 
                  type="number" 
                  className="w-full p-2 rounded bg-slate-900 border border-slate-600 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Cth: 15000"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={isSubmittingMenu}
                className={`py-2 px-6 rounded font-bold transition ${isSubmittingMenu ? 'bg-slate-500' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}
              >
                {isSubmittingMenu ? 'Menyimpan...' : 'Simpan'}
              </button>
            </form>
          )}
        </div>

        {/* Daftar Pesanan */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold mb-4">Daftar Pesanan Masuk:</h2>
          {orders.length === 0 && <p className="text-slate-400 italic">Belum ada pesanan masuk. Menunggu pembeli...</p>}
          
          {orders.map((order: any) => (
            <div key={order.id} className={`p-5 rounded-xl border ${order.status === 'SELESAI' ? 'bg-slate-700 border-slate-600 opacity-60' : 'bg-white text-slate-800 border-emerald-500 shadow-lg'}`}>
              <div className="flex justify-between items-start border-b pb-3 mb-3">
                <div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${order.status === 'PENDING' ? 'bg-red-500' : order.status === 'PROSES' ? 'bg-yellow-500' : 'bg-emerald-500'}`}>
                    {order.status}
                  </span>
                  <h3 className="text-xl font-black mt-2">Meja / Kursi: {order.seat_code}</h3>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">Total Tagihan:</p>
                  <p className="text-lg font-bold text-emerald-600">Rp {order.total_price.toLocaleString('id-ID')}</p>
                </div>
              </div>

              {/* Looping Detail Makanan JSON */}
              <div className="mb-4">
                <p className="font-bold text-sm text-slate-500 mb-1">Detail Pesanan:</p>
                <ul className="list-disc list-inside font-medium">
                  {order.order_details.map((item: any, idx: number) => (
                    <li key={idx}>{item.qty}x {item.item_name}</li>
                  ))}
                </ul>
              </div>

              {/* Tombol Aksi */}
              {order.status !== 'SELESAI' && (
                <div className="flex gap-2 mt-4">
                  {order.status === 'PENDING' && (
                    <button onClick={() => updateStatus(order.id, 'PROSES')} className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold py-2 rounded-lg transition">
                      👨‍🍳 Mulai Masak / Proses
                    </button>
                  )}
                  {order.status === 'PROSES' && (
                    <button onClick={() => updateStatus(order.id, 'SELESAI')} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded-lg transition">
                      ✅ Selesai Diantar & Dibayar
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}