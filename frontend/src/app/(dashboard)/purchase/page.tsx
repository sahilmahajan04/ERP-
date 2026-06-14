'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';

interface Vendor {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
}

interface PurchaseOrderItem {
  id: string;
  productId: string;
  product: { name: string; sku: string };
  warehouse: { code: string };
  quantity: number;
  unitPrice: number;
  totalCost: number;
  receivedQty: number;
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  vendor: { name: string };
  status: 'DRAFT' | 'CONFIRMED' | 'PARTIALLY_RECEIVED' | 'FULLY_RECEIVED' | 'CANCELLED';
  totalAmount: number;
  orderDate: string;
  items: PurchaseOrderItem[];
}

export default function PurchasePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'orders' | 'vendors'>('orders');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

  // Queries
  const { data: orders, isLoading: loadingOrders } = useQuery<PurchaseOrder[]>({
    queryKey: ['purchaseOrders'],
    queryFn: () => api.get('/purchase'),
  });

  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: ['vendors'],
    queryFn: () => api.get('/purchase/vendors'),
  });

  const { data: products } = useQuery<any[]>({
    queryKey: ['products'],
    queryFn: () => api.get('/products'),
  });

  const { data: warehouses } = useQuery<any[]>({
    queryKey: ['warehouses'],
    queryFn: () => api.get('/inventory/warehouses'),
  });

  // Mutations
  const createVendorMutation = useMutation({
    mutationFn: (newVendor: any) => api.post('/purchase/vendors', newVendor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setShowVendorModal(false);
      setVName(''); setVContact(''); setVEmail(''); setVPhone(''); setVAddr('');
    },
    onError: (err: any) => alert(err.message || 'Error creating vendor'),
  });

  const createOrderMutation = useMutation({
    mutationFn: (newOrder: any) => api.post('/purchase', newOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      setShowOrderModal(false);
      resetOrderForm();
    },
    onError: (err: any) => alert(err.message || 'Error creating purchase order'),
  });

  const confirmOrderMutation = useMutation({
    mutationFn: (id: string) => api.post(`/purchase/${id}/confirm`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      setShowDetailsModal(false);
    },
    onError: (err: any) => alert(err.message || 'Error confirming purchase order'),
  });

  const receiveMutation = useMutation({
    mutationFn: (payload: { id: string; items: any }) => api.post(`/purchase/${payload.id}/receive`, { items: payload.items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryLevels'] });
      queryClient.invalidateQueries({ queryKey: ['stockLedger'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      setShowReceiveModal(false);
      setShowDetailsModal(false);
    },
    onError: (err: any) => alert(err.message || 'Error executing goods receipt'),
  });

  // Vendor Form State
  const [vName, setVName] = useState('');
  const [vContact, setVContact] = useState('');
  const [vEmail, setVEmail] = useState('');
  const [vPhone, setVPhone] = useState('');
  const [vAddr, setVAddr] = useState('');

  // PO Form State
  const [orderVendorId, setOrderVendorId] = useState('');
  const [orderItems, setOrderItems] = useState<Array<{ productId: string; warehouseId: string; quantity: number; unitPrice: number }>>([
    { productId: '', warehouseId: '', quantity: 1, unitPrice: 0 }
  ]);

  const resetOrderForm = () => {
    setOrderVendorId('');
    setOrderItems([{ productId: '', warehouseId: '', quantity: 1, unitPrice: 0 }]);
  };

  // Goods Receipt Form State
  const [receiveItems, setReceiveItems] = useState<Record<string, number>>({});

  const handleProductChange = (idx: number, productId: string) => {
    const matchedProduct = products?.find(p => p.id === productId);
    const copy = [...orderItems];
    copy[idx].productId = productId;
    if (matchedProduct) {
      copy[idx].unitPrice = Number(matchedProduct.costPrice);
    }
    setOrderItems(copy);
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    createOrderMutation.mutate({
      vendorId: orderVendorId,
      items: orderItems,
    });
  };

  const handleReceiveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    const itemsPayload = Object.entries(receiveItems)
      .map(([productId, quantity]) => ({ productId, quantity }))
      .filter(i => i.quantity > 0);

    if (itemsPayload.length === 0) {
      alert('Must select at least one item and quantity to receive');
      return;
    }

    receiveMutation.mutate({
      id: selectedOrder.id,
      items: itemsPayload,
    });
  };

  const initReceiveForm = (order: PurchaseOrder) => {
    const initial: Record<string, number> = {};
    order.items.forEach(item => {
      const remaining = Number(item.quantity) - Number(item.receivedQty);
      initial[item.productId] = remaining > 0 ? remaining : 0;
    });
    setReceiveItems(initial);
    setSelectedOrder(order);
    setShowReceiveModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Purchase Module</h1>
          <p className="text-slate-500 text-sm">Register suppliers, book raw material orders, and manage warehouse receipts</p>
        </div>

        {activeTab === 'orders' && (
          <button
            onClick={() => setShowOrderModal(true)}
            className="px-4 py-2 text-sm font-medium text-white gradient-bg hover:opacity-90 rounded-xl transition-all shadow"
          >
            ➕ Raise Purchase Order
          </button>
        )}
        {activeTab === 'vendors' && (
          <button
            onClick={() => setShowVendorModal(true)}
            className="px-4 py-2 text-sm font-medium text-white gradient-bg hover:opacity-90 rounded-xl transition-all shadow"
          >
            ➕ Register Vendor
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'orders'
              ? 'border-indigo-650 text-indigo-650 font-bold dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          🛒 Purchase Orders
        </button>
        <button
          onClick={() => setActiveTab('vendors')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'vendors'
              ? 'border-indigo-650 text-indigo-650 font-bold dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          🏭 Suppliers / Vendors
        </button>
      </div>

      {activeTab === 'orders' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
          {loadingOrders ? (
            <div className="p-8 text-center text-slate-400 animate-pulse">Loading purchase orders...</div>
          ) : !orders || orders.length === 0 ? (
            <div className="p-12 text-center text-slate-400">No Purchase Orders raised.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-750 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4">PO Number</th>
                    <th className="px-6 py-4">Supplier Name</th>
                    <th className="px-6 py-4">Order Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">PO Total</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {orders.map((order) => {
                    const statusColors = {
                      DRAFT: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
                      CONFIRMED: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
                      PARTIALLY_RECEIVED: 'bg-orange-100 text-orange-850 dark:bg-orange-950/40 dark:text-orange-300',
                      FULLY_RECEIVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
                      CANCELLED: 'bg-red-105 text-red-800 dark:bg-red-950/40 dark:text-red-300',
                    };
                    return (
                      <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                        <td className="px-6 py-4 font-mono font-bold">{order.orderNumber}</td>
                        <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{order.vendor.name}</td>
                        <td className="px-6 py-4 text-slate-400 text-xs">{new Date(order.orderDate).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${statusColors[order.status]}`}>
                            {order.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold">₹{Number(order.totalAmount).toLocaleString()}</td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => { setSelectedOrder(order); setShowDetailsModal(true); }}
                            className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/60 dark:text-indigo-400 text-xs font-bold rounded-lg transition-all"
                          >
                            🔎 Manage PO
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'vendors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendors?.map((v) => (
            <div key={v.id} className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm space-y-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{v.name}</h3>
              <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <p>👤 Contact: {v.contactName || 'N/A'}</p>
                <p>📧 Email: {v.email || 'N/A'}</p>
                <p>📞 Phone: {v.phone || 'N/A'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Raise PO Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-xl p-6 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto space-y-6">
            <h3 className="text-xl font-bold">Raise Purchase Order</h3>
            <form onSubmit={handleCreateOrder} className="space-y-6">
              <div>
                <label className="text-xs font-semibold text-slate-400">Supplier Vendor</label>
                <select
                  required className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                  value={orderVendorId} onChange={(e) => setOrderVendorId(e.target.value)}
                >
                  <option value="">Choose Supplier</option>
                  {vendors?.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>

              {/* Dynamic Items Lines */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Purchase Items</h4>
                  <button
                    type="button"
                    onClick={() => setOrderItems([...orderItems, { productId: '', warehouseId: '', quantity: 1, unitPrice: 0 }])}
                    className="text-xs text-indigo-500 font-bold hover:underline"
                  >
                    ➕ Add Line
                  </button>
                </div>

                {orderItems.map((item, idx) => (
                  <div key={idx} className="flex space-x-3 items-center bg-slate-50 dark:bg-slate-750/20 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="w-1/2 space-y-2">
                      <select
                        required className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm"
                        value={item.productId} onChange={(e) => handleProductChange(idx, e.target.value)}
                      >
                        <option value="">Select product</option>
                        {products?.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                      </select>

                      <select
                        required className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm"
                        value={item.warehouseId}
                        onChange={(e) => {
                          const copy = [...orderItems];
                          copy[idx].warehouseId = e.target.value;
                          setOrderItems(copy);
                        }}
                      >
                        <option value="">Receiving warehouse</option>
                        {warehouses?.map(w => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
                      </select>
                    </div>

                    <div className="w-1/2 flex space-x-2 items-center">
                      <input
                        type="number" required min="1" placeholder="Qty"
                        className="w-1/2 p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm"
                        value={item.quantity}
                        onChange={(e) => {
                          const copy = [...orderItems];
                          copy[idx].quantity = Number(e.target.value);
                          setOrderItems(copy);
                        }}
                      />
                      <input
                        type="number" required min="0" placeholder="Cost Price"
                        className="w-1/2 p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const copy = [...orderItems];
                          copy[idx].unitPrice = Number(e.target.value);
                          setOrderItems(copy);
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => {
                          if (orderItems.length > 1) {
                            setOrderItems(orderItems.filter((_, i) => i !== idx));
                          }
                        }}
                        className="text-red-500 text-sm"
                      >
                        ❌
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button type="button" onClick={() => { setShowOrderModal(false); resetOrderForm(); }} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-white font-medium gradient-bg rounded-xl">
                  Save Draft PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register Vendor Modal */}
      {showVendorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md p-6 rounded-2xl shadow-xl space-y-6">
            <h3 className="text-xl font-bold">Register Supplier Vendor</h3>
            <form onSubmit={(e) => { e.preventDefault(); createVendorMutation.mutate({ name: vName, contactName: vContact, email: vEmail, phone: vPhone, address: vAddr }); }} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Vendor Name</label>
                <input
                  type="text" required placeholder="e.g. Steel & Screws Supplies"
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                  value={vName} onChange={(e) => setVName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">Contact Person</label>
                <input
                  type="text" placeholder="e.g. Suresh Kumar"
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                  value={vContact} onChange={(e) => setVContact(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">Email</label>
                <input
                  type="email" placeholder="e.g. sales@steelscrews.com"
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                  value={vEmail} onChange={(e) => setVEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">Phone</label>
                <input
                  type="text" placeholder="e.g. 9812345670"
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                  value={vPhone} onChange={(e) => setVPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">Address</label>
                <textarea
                  placeholder="Billing/Store Address"
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent h-16"
                  value={vAddr} onChange={(e) => setVAddr(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button type="button" onClick={() => setShowVendorModal(false)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-white font-medium gradient-bg rounded-xl">
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details / Manage PO Modal */}
      {showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-xl p-6 rounded-2xl shadow-xl space-y-6">
            <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-xl font-bold">Raise PO {selectedOrder.orderNumber}</h3>
                <p className="text-xs text-slate-500">Supplier: <span className="font-bold">{selectedOrder.vendor.name}</span></p>
              </div>
              <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                Status: {selectedOrder.status}
              </span>
            </div>

            {/* Items Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider">Ordered Items</h4>
              <div className="border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden text-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-750 text-xs text-slate-500 font-bold uppercase">
                    <tr>
                      <th className="p-3">Product</th>
                      <th className="p-3">WH Destination</th>
                      <th className="p-3 text-right">Qty</th>
                      <th className="p-3 text-right">Cost Price</th>
                      <th className="p-3 text-right">Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {selectedOrder.items.map((item) => (
                      <tr key={item.id}>
                        <td className="p-3 font-semibold">{item.product.name}</td>
                        <td className="p-3 font-mono text-xs">{item.warehouse?.code}</td>
                        <td className="p-3 text-right font-mono">{item.quantity}</td>
                        <td className="p-3 text-right font-mono">₹{Number(item.unitPrice).toFixed(2)}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-600">{item.receivedQty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button" onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
              >
                Close
              </button>

              {selectedOrder.status === 'DRAFT' && (
                <button
                  onClick={() => confirmOrderMutation.mutate(selectedOrder.id)}
                  className="px-4 py-2 text-white font-medium bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm"
                >
                  ✔️ Confirm Purchase Order
                </button>
              )}

              {(selectedOrder.status === 'CONFIRMED' || selectedOrder.status === 'PARTIALLY_RECEIVED') && (
                <button
                  onClick={() => initReceiveForm(selectedOrder)}
                  className="px-4 py-2 text-white font-medium bg-indigo-650 hover:bg-indigo-550 rounded-xl text-sm"
                >
                  📥 Check-in Goods Receipt
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Receive Items Modal */}
      {showReceiveModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md p-6 rounded-2xl shadow-xl space-y-6">
            <h3 className="text-xl font-bold">Goods Receipt Check-In</h3>
            <form onSubmit={handleReceiveSubmit} className="space-y-4">
              {selectedOrder.items.map((item) => {
                const remaining = Number(item.quantity) - Number(item.receivedQty);
                if (remaining <= 0) return null;
                return (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <div>
                      <p className="font-semibold">{item.product.name}</p>
                      <p className="text-xs text-slate-400">Awaiting check-in: {remaining} {item.product.sku}</p>
                    </div>
                    <input
                      type="number" min="0" max={remaining} required
                      className="w-24 p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-right font-mono"
                      value={receiveItems[item.productId] || 0}
                      onChange={(e) => {
                        const copy = { ...receiveItems };
                        copy[item.productId] = Number(e.target.value);
                        setReceiveItems(copy);
                      }}
                    />
                  </div>
                );
              })}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button type="button" onClick={() => setShowReceiveModal(false)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-white font-medium gradient-bg rounded-xl">
                  Receive Items
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
