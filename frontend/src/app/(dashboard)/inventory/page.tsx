'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';

interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  category: string;
  uom: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  onHand: number;
  reserved: number;
  availableQty: number;
  updatedAt: string;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface LedgerEntry {
  id: string;
  productId: string;
  product: { sku: string; name: string };
  warehouse: { code: string };
  quantity: number;
  movementType: string;
  reference: string;
  user: { firstName: string; lastName: string };
  createdAt: string;
}

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'balances' | 'ledger'>('balances');
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  // Queries
  const { data: inventory, isLoading: loadingInventory } = useQuery<InventoryItem[]>({
    queryKey: ['inventoryLevels'],
    queryFn: () => api.get('/inventory'),
  });

  const { data: warehouses } = useQuery<Warehouse[]>({
    queryKey: ['warehouses'],
    queryFn: () => api.get('/inventory/warehouses'),
  });

  const { data: products } = useQuery<any[]>({
    queryKey: ['products'],
    queryFn: () => api.get('/products'),
  });

  const { data: ledgerResponse, isLoading: loadingLedger } = useQuery<{ data: LedgerEntry[] }>({
    queryKey: ['stockLedger'],
    queryFn: () => api.get('/inventory/ledger', { params: { limit: '100' } }),
  });

  // Mutations
  const adjustMutation = useMutation({
    mutationFn: (adjustment: any) => api.post('/inventory/adjust', adjustment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryLevels'] });
      queryClient.invalidateQueries({ queryKey: ['stockLedger'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      setShowAdjustModal(false);
      resetAdjustForm();
    },
    onError: (err: any) => alert(err.message || 'Error adjusting inventory'),
  });

  // Adjust Form State
  const [adjustProductId, setAdjustProductId] = useState('');
  const [adjustWarehouseId, setAdjustWarehouseId] = useState('');
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');

  const resetAdjustForm = () => {
    setAdjustProductId('');
    setAdjustWarehouseId('');
    setAdjustQty(0);
    setAdjustReason('');
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    adjustMutation.mutate({
      productId: adjustProductId,
      warehouseId: adjustWarehouseId,
      adjustmentQty: adjustQty,
      reason: adjustReason,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Inventory Management</h1>
          <p className="text-slate-500 text-sm">Monitor warehouse stock levels, available allocations, and movement records</p>
        </div>

        <button
          onClick={() => setShowAdjustModal(true)}
          className="px-4 py-2 text-sm font-medium text-white gradient-bg hover:opacity-90 rounded-xl transition-all shadow"
        >
          ⚙️ Adjust Stock count
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('balances')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'balances'
              ? 'border-indigo-650 text-indigo-650 font-bold dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          📦 Stock Balances
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'ledger'
              ? 'border-indigo-650 text-indigo-650 font-bold dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          📜 Stock Ledger Log
        </button>
      </div>

      {activeTab === 'balances' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
          {loadingInventory ? (
            <div className="p-8 text-center text-slate-400 animate-pulse">Loading stock status...</div>
          ) : !inventory || inventory.length === 0 ? (
            <div className="p-12 text-center text-slate-400">No inventory entries available.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-750 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4">Warehouse</th>
                    <th className="px-6 py-4">SKU</th>
                    <th className="px-6 py-4">Product Name</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4 text-center">Unit</th>
                    <th className="px-6 py-4 text-right">Physical On Hand</th>
                    <th className="px-6 py-4 text-right">Reserved stock</th>
                    <th className="px-6 py-4 text-right">Free / Available</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {inventory.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900 dark:text-white">{inv.warehouseName}</span>
                        <span className="ml-2 px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          {inv.warehouseCode}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-indigo-500 font-bold">{inv.sku}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">{inv.productName}</td>
                      <td className="px-6 py-4 text-slate-400 text-xs">{inv.category}</td>
                      <td className="px-6 py-4 text-center font-mono">{inv.uom}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold">{inv.onHand}</td>
                      <td className="px-6 py-4 text-right font-mono text-slate-400">{inv.reserved}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-indigo-650 dark:text-indigo-400">
                        {inv.availableQty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'ledger' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
          {loadingLedger ? (
            <div className="p-8 text-center text-slate-400 animate-pulse">Loading stock ledger history...</div>
          ) : !ledgerResponse?.data || ledgerResponse.data.length === 0 ? (
            <div className="p-12 text-center text-slate-400">No stock ledger transactions written.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-750 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">Warehouse</th>
                    <th className="px-6 py-4">Product SKU</th>
                    <th className="px-6 py-4">Movement Type</th>
                    <th className="px-6 py-4">Quantity Changed</th>
                    <th className="px-6 py-4">Document Reference</th>
                    <th className="px-6 py-4">Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {ledgerResponse.data.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                      <td className="px-6 py-4 text-slate-400 text-xs">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold">{log.warehouse?.code}</td>
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold">{log.product?.sku}</span>
                        <p className="text-[10px] text-slate-450 truncate">{log.product?.name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 text-[9px] font-extrabold rounded uppercase bg-indigo-50 text-indigo-750 dark:bg-indigo-950/20 dark:text-indigo-300">
                          {log.movementType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right font-mono font-extrabold ${Number(log.quantity) < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {Number(log.quantity) > 0 ? `+${log.quantity}` : log.quantity}
                      </td>
                      <td className="px-6 py-4 font-semibold">{log.reference}</td>
                      <td className="px-6 py-4 text-xs text-slate-550 dark:text-slate-400">
                        {log.user?.firstName} {log.user?.lastName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Adjust Inventory Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md p-6 rounded-2xl shadow-xl space-y-6">
            <h3 className="text-xl font-bold">Manual Inventory Adjustment</h3>
            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Target Product</label>
                <select
                  required className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                  value={adjustProductId} onChange={(e) => setAdjustProductId(e.target.value)}
                >
                  <option value="">Select Product</option>
                  {products?.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Warehouse Location</label>
                <select
                  required className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                  value={adjustWarehouseId} onChange={(e) => setAdjustWarehouseId(e.target.value)}
                >
                  <option value="">Select Warehouse</option>
                  {warehouses?.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Adjustment Quantity (Can be negative to write off)</label>
                <input
                  type="number" required step="any" placeholder="e.g. +100 or -15"
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                  value={adjustQty} onChange={(e) => setAdjustQty(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Reason / Reference document</label>
                <input
                  type="text" required placeholder="e.g. Initial Stocking or Cycle count discrepancy"
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                  value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button type="button" onClick={() => { setShowAdjustModal(false); resetAdjustForm(); }} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-white font-medium gradient-bg rounded-xl">
                  Execute Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
