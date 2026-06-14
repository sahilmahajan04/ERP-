'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface SalesOrderItem {
  id: string;
  productId: string;
  product: { name: string; sku: string };
  warehouse: { code: string };
  quantity: number;
  unitPrice: number;
  totalCost: number;
  deliveredQty: number;
}

interface SalesOrder {
  id: string;
  orderNumber: string;
  customer: { name: string; email: string };
  status: 'DRAFT' | 'CONFIRMED' | 'PARTIALLY_DELIVERED' | 'FULLY_DELIVERED' | 'CANCELLED';
  totalAmount: number;
  orderDate: string;
  items: SalesOrderItem[];
}

export default function SalesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'orders' | 'customers'>('orders');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);

  // Queries
  const { data: orders, isLoading: loadingOrders } = useQuery<SalesOrder[]>({
    queryKey: ['salesOrders'],
    queryFn: () => api.get('/sales'),
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: () => api.get('/sales/customers'),
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
  const createCustomerMutation = useMutation({
    mutationFn: (newCust: any) => api.post('/sales/customers', newCust),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowCustomerModal(false);
      setCustName(''); setCustEmail(''); setCustPhone(''); setCustAddr('');
    },
    onError: (err: any) => alert(err.message || 'Error creating customer'),
  });

  const createOrderMutation = useMutation({
    mutationFn: (newOrder: any) => api.post('/sales', newOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      setShowOrderModal(false);
      resetOrderForm();
    },
    onError: (err: any) => alert(err.message || 'Error creating order'),
  });

  const confirmOrderMutation = useMutation({
    mutationFn: (id: string) => api.post(`/sales/${id}/confirm`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryLevels'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      alert('Order Confirmed! Dynamic reservations evaluated, automated procurement started for shortages.');
      setShowDetailsModal(false);
    },
    onError: (err: any) => alert(err.message || 'Error confirming order'),
  });

  const cancelOrderMutation = useMutation({
    mutationFn: (id: string) => api.post(`/sales/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryLevels'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      setShowDetailsModal(false);
    },
    onError: (err: any) => alert(err.message || 'Error cancelling order'),
  });

  const deliverMutation = useMutation({
    mutationFn: (payload: { id: string; items: any }) => api.post(`/sales/${payload.id}/deliver`, { items: payload.items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryLevels'] });
      queryClient.invalidateQueries({ queryKey: ['stockLedger'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      setShowDeliverModal(false);
      setShowDetailsModal(false);
    },
    onError: (err: any) => alert(err.message || 'Error executing delivery'),
  });

  // Customer Form State
  const [custName, setCustName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddr, setCustAddr] = useState('');

  // Order Form State
  const [orderCustomerId, setOrderCustomerId] = useState('');
  const [orderItems, setOrderItems] = useState<Array<{ productId: string; warehouseId: string; quantity: number; unitPrice: number }>>([
    { productId: '', warehouseId: '', quantity: 1, unitPrice: 0 }
  ]);

  const resetOrderForm = () => {
    setOrderCustomerId('');
    setOrderItems([{ productId: '', warehouseId: '', quantity: 1, unitPrice: 0 }]);
  };

  // Delivery Form State
  const [deliveryItems, setDeliveryItems] = useState<Record<string, number>>({});

  const handleProductChange = (idx: number, productId: string) => {
    const matchedProduct = products?.find(p => p.id === productId);
    const copy = [...orderItems];
    copy[idx].productId = productId;
    if (matchedProduct) {
      copy[idx].unitPrice = Number(matchedProduct.salesPrice);
    }
    setOrderItems(copy);
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    createOrderMutation.mutate({
      customerId: orderCustomerId,
      items: orderItems,
    });
  };

  const handleDeliverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    
    const itemsPayload = Object.entries(deliveryItems)
      .map(([productId, quantity]) => ({ productId, quantity }))
      .filter(i => i.quantity > 0);

    if (itemsPayload.length === 0) {
      alert('Must select at least one item and quantity to deliver');
      return;
    }

    deliverMutation.mutate({
      id: selectedOrder.id,
      items: itemsPayload,
    });
  };

  const initDeliveryForm = (order: SalesOrder) => {
    const initial: Record<string, number> = {};
    order.items.forEach(item => {
      const remaining = Number(item.quantity) - Number(item.deliveredQty);
      initial[item.productId] = remaining > 0 ? remaining : 0;
    });
    setDeliveryItems(initial);
    setSelectedOrder(order);
    setShowDeliverModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Sales Module</h1>
          <p className="text-slate-500 text-sm">Register customers, book orders, and schedule shipping handovers</p>
        </div>

        {activeTab === 'orders' && (
          <button
            onClick={() => setShowOrderModal(true)}
            className="px-4 py-2 text-sm font-medium text-white gradient-bg hover:opacity-90 rounded-xl transition-all shadow"
          >
            ➕ Book Sales Order
          </button>
        )}
        {activeTab === 'customers' && (
          <button
            onClick={() => setShowCustomerModal(true)}
            className="px-4 py-2 text-sm font-medium text-white gradient-bg hover:opacity-90 rounded-xl transition-all shadow"
          >
            ➕ Add Customer
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
          📈 Sales Orders
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'customers'
              ? 'border-indigo-650 text-indigo-650 font-bold dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          👥 Customers Directory
        </button>
      </div>

      {activeTab === 'orders' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
          {loadingOrders ? (
            <div className="p-8 text-center text-slate-400 animate-pulse">Loading orders list...</div>
          ) : !orders || orders.length === 0 ? (
            <div className="p-12 text-center text-slate-400">No Sales Orders registered.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-750 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4">SO Number</th>
                    <th className="px-6 py-4">Customer Name</th>
                    <th className="px-6 py-4">Booking Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Order Total</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {orders.map((order) => {
                    const statusColors = {
                      DRAFT: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
                      CONFIRMED: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
                      PARTIALLY_DELIVERED: 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
                      FULLY_DELIVERED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
                      CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
                    };
                    return (
                      <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                        <td className="px-6 py-4 font-mono font-bold">{order.orderNumber}</td>
                        <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{order.customer.name}</td>
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
                            🔎 Manage Order
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

      {activeTab === 'customers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers?.map((c) => (
            <div key={c.id} className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm space-y-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{c.name}</h3>
              <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <p>📧 Email: {c.email || 'N/A'}</p>
                <p>📞 Phone: {c.phone || 'N/A'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Book Sales Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-xl p-6 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto space-y-6">
            <h3 className="text-xl font-bold">Book Sales Order</h3>
            <form onSubmit={handleCreateOrder} className="space-y-6">
              <div>
                <label className="text-xs font-semibold text-slate-400">Select Customer</label>
                <select
                  required className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                  value={orderCustomerId} onChange={(e) => setOrderCustomerId(e.target.value)}
                >
                  <option value="">Choose Customer</option>
                  {customers?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Dynamic Items Lines */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Order Items</h4>
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
                        <option value="">Dispatch warehouse</option>
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
                        type="number" required min="0" placeholder="Price"
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
                  Save Draft SO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md p-6 rounded-2xl shadow-xl space-y-6">
            <h3 className="text-xl font-bold">Add Customer</h3>
            <form onSubmit={(e) => { e.preventDefault(); createCustomerMutation.mutate({ name: custName, email: custEmail, phone: custPhone, address: custAddr }); }} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Customer Name</label>
                <input
                  type="text" required placeholder="e.g. Ramesh Chandra"
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                  value={custName} onChange={(e) => setCustName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">Email</label>
                <input
                  type="email" placeholder="e.g. ramesh@example.com"
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                  value={custEmail} onChange={(e) => setCustEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">Phone</label>
                <input
                  type="text" placeholder="e.g. 9876543210"
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                  value={custPhone} onChange={(e) => setCustPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">Address</label>
                <textarea
                  placeholder="Billing/Shipping Address"
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent h-16"
                  value={custAddr} onChange={(e) => setCustAddr(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button type="button" onClick={() => setShowCustomerModal(false)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl">
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

      {/* Details / Manage Order Modal */}
      {showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-xl p-6 rounded-2xl shadow-xl space-y-6">
            <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-xl font-bold">Manage Sales Order {selectedOrder.orderNumber}</h3>
                <p className="text-xs text-slate-500">Customer: <span className="font-bold">{selectedOrder.customer.name}</span></p>
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
                      <th className="p-3">WH</th>
                      <th className="p-3 text-right">Qty</th>
                      <th className="p-3 text-right">Price</th>
                      <th className="p-3 text-right">Delivered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {selectedOrder.items.map((item) => (
                      <tr key={item.id}>
                        <td className="p-3 font-semibold">{item.product.name}</td>
                        <td className="p-3 font-mono text-xs">{item.warehouse?.code}</td>
                        <td className="p-3 text-right font-mono">{item.quantity}</td>
                        <td className="p-3 text-right font-mono">₹{Number(item.unitPrice).toFixed(2)}</td>
                        <td className="p-3 text-right font-mono font-bold text-indigo-500">{item.deliveredQty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Workflow Action Buttons */}
            <div className="flex flex-wrap gap-2 justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button" onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
              >
                Close
              </button>

              {selectedOrder.status === 'DRAFT' && (
                <>
                  <button
                    onClick={() => { if(confirm('Confirm Sales Order? This reserves stock & triggers automated procurement for shortages.')) confirmOrderMutation.mutate(selectedOrder.id) }}
                    className="px-4 py-2 text-white font-medium bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm"
                  >
                    ✔️ Confirm & Reserve
                  </button>
                  <button
                    onClick={() => { if(confirm('Cancel this sales order?')) cancelOrderMutation.mutate(selectedOrder.id) }}
                    className="px-4 py-2 text-white font-medium bg-red-600 hover:bg-red-500 rounded-xl text-sm"
                  >
                    🚫 Cancel Order
                  </button>
                </>
              )}

              {(selectedOrder.status === 'CONFIRMED' || selectedOrder.status === 'PARTIALLY_DELIVERED') && (
                <>
                  <button
                    onClick={() => initDeliveryForm(selectedOrder)}
                    className="px-4 py-2 text-white font-medium bg-indigo-600 hover:bg-indigo-550 rounded-xl text-sm"
                  >
                    🚚 Dispatch Delivery
                  </button>
                  <button
                    onClick={() => { if(confirm('Cancel order and release reserved stock?')) cancelOrderMutation.mutate(selectedOrder.id) }}
                    className="px-4 py-2 text-white font-medium bg-red-600 hover:bg-red-500 rounded-xl text-sm"
                  >
                    🚫 Cancel & Release
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Deliver Items Modal */}
      {showDeliverModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md p-6 rounded-2xl shadow-xl space-y-6">
            <h3 className="text-xl font-bold">Record Shipping Delivery</h3>
            <form onSubmit={handleDeliverSubmit} className="space-y-4">
              {selectedOrder.items.map((item) => {
                const remaining = Number(item.quantity) - Number(item.deliveredQty);
                if (remaining <= 0) return null;
                return (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <div>
                      <p className="font-semibold">{item.product.name}</p>
                      <p className="text-xs text-slate-400">Order remaining: {remaining} {item.product.sku}</p>
                    </div>
                    <input
                      type="number" min="0" max={remaining} required
                      className="w-24 p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-right font-mono"
                      value={deliveryItems[item.productId] || 0}
                      onChange={(e) => {
                        const copy = { ...deliveryItems };
                        copy[item.productId] = Number(e.target.value);
                        setDeliveryItems(copy);
                      }}
                    />
                  </div>
                );
              })}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button type="button" onClick={() => setShowDeliverModal(false)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-white font-medium gradient-bg rounded-xl">
                  Ship Items
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
