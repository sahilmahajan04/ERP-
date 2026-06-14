'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';

interface WorkOrder {
  id: string;
  woNumber: string;
  name: string;
  workCenter: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  sequence: number;
}

interface ManufacturingOrder {
  id: string;
  moNumber: string;
  product: { sku: string; name: string };
  bom: { name: string; version: string };
  warehouse: { name: string };
  assignee?: { firstName: string; lastName: string };
  quantity: number;
  status: 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  workOrders: WorkOrder[];
}

export default function ManufacturingPage() {
  const queryClient = useQueryClient();
  const [showMoModal, setShowMoModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedMo, setSelectedMo] = useState<ManufacturingOrder | null>(null);

  // Queries
  const { data: mos, isLoading: loadingMos } = useQuery<ManufacturingOrder[]>({
    queryKey: ['manufacturingOrders'],
    queryFn: () => api.get('/manufacturing'),
  });

  const { data: boms } = useQuery<any[]>({
    queryKey: ['boms'],
    queryFn: () => api.get('/manufacturing/boms'),
  });

  const { data: warehouses } = useQuery<any[]>({
    queryKey: ['warehouses'],
    queryFn: () => api.get('/inventory/warehouses'),
  });

  const { data: users } = useQuery<any[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/auth/me').then(() => [
      { id: 'admin-id', firstName: 'Shiv', lastName: 'Kumar' },
      { id: 'mfg-id', firstName: 'Vijay', lastName: 'Singh' }
    ]).catch(() => []), // mock users list for assignee
  });

  // Mutations
  const createMoMutation = useMutation({
    mutationFn: (newMo: any) => api.post('/manufacturing', newMo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturingOrders'] });
      setShowMoModal(false);
      resetMoForm();
    },
    onError: (err: any) => alert(err.message || 'Error creating manufacturing order'),
  });

  const confirmMoMutation = useMutation({
    mutationFn: (id: string) => api.post(`/manufacturing/${id}/confirm`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturingOrders'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryLevels'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      setShowDetailsModal(false);
    },
    onError: (err: any) => alert(err.message || 'Error confirming MO'),
  });

  const startMoMutation = useMutation({
    mutationFn: (id: string) => api.post(`/manufacturing/${id}/start`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturingOrders'] });
      setShowDetailsModal(false);
    },
    onError: (err: any) => alert(err.message || 'Error starting MO'),
  });

  const completeMoMutation = useMutation({
    mutationFn: (id: string) => api.post(`/manufacturing/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturingOrders'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryLevels'] });
      queryClient.invalidateQueries({ queryKey: ['stockLedger'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      setShowDetailsModal(false);
    },
    onError: (err: any) => alert(err.message || 'Error completing MO'),
  });

  const cancelMoMutation = useMutation({
    mutationFn: (id: string) => api.post(`/manufacturing/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturingOrders'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryLevels'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      setShowDetailsModal(false);
    },
    onError: (err: any) => alert(err.message || 'Error cancelling MO'),
  });

  const advanceWoMutation = useMutation({
    mutationFn: (payload: { woId: string; status: string }) => api.put(`/manufacturing/work-orders/${payload.woId}`, { status: payload.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturingOrders'] });
      setShowDetailsModal(false);
    },
    onError: (err: any) => alert(err.message || 'Error updating work order step'),
  });

  // MO Form State
  const [moProductId, setMoProductId] = useState('');
  const [moQty, setMoQty] = useState(1);
  const [moBomId, setMoBomId] = useState('');
  const [moWarehouseId, setMoWarehouseId] = useState('');
  const [moAssigneeId, setMoAssigneeId] = useState('');

  const resetMoForm = () => {
    setMoProductId('');
    setMoQty(1);
    setMoBomId('');
    setMoWarehouseId('');
    setMoAssigneeId('');
  };

  const handleProductChange = (productId: string) => {
    setMoProductId(productId);
    const activeBom = boms?.find(b => b.productId === productId);
    if (activeBom) {
      setMoBomId(activeBom.id);
    } else {
      setMoBomId('');
    }
  };

  const handleCreateMo = (e: React.FormEvent) => {
    e.preventDefault();
    createMoMutation.mutate({
      productId: moProductId,
      quantity: moQty,
      bomId: moBomId,
      warehouseId: moWarehouseId,
      assigneeId: moAssigneeId || null,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Manufacturing Orders</h1>
          <p className="text-slate-500 text-sm">Schedule shop floor builds, manage routing operations, and complete assembly processes</p>
        </div>

        <button
          onClick={() => setShowMoModal(true)}
          className="px-4 py-2 text-sm font-medium text-white gradient-bg hover:opacity-90 rounded-xl transition-all shadow"
        >
          ➕ Create Build Order
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
        {loadingMos ? (
          <div className="p-8 text-center text-slate-400 animate-pulse">Loading build queues...</div>
        ) : !mos || mos.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No Manufacturing Orders logged.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-750 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4">MO Number</th>
                  <th className="px-6 py-4">Finished Item</th>
                  <th className="px-6 py-4">BOM Spec</th>
                  <th className="px-6 py-4">Qty</th>
                  <th className="px-6 py-4">Warehouse Depot</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {mos.map((mo) => {
                  const statusColors = {
                    DRAFT: 'bg-slate-100 text-slate-805 dark:bg-slate-700 dark:text-slate-200',
                    CONFIRMED: 'bg-blue-105 text-blue-805 dark:bg-blue-950/40 dark:text-blue-300',
                    IN_PROGRESS: 'bg-orange-105 text-orange-855 dark:bg-orange-950/40 dark:text-orange-300',
                    COMPLETED: 'bg-emerald-105 text-emerald-855 dark:bg-emerald-950/40 dark:text-emerald-300',
                    CANCELLED: 'bg-red-105 text-red-855 dark:bg-red-950/40 dark:text-red-300',
                  };
                  return (
                    <tr key={mo.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                      <td className="px-6 py-4 font-mono font-bold">{mo.moNumber}</td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900 dark:text-white">{mo.product.name}</span>
                        <span className="ml-2 font-mono text-xs text-slate-400">({mo.product.sku})</span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">{mo.bom.name}</td>
                      <td className="px-6 py-4 font-mono font-bold">{mo.quantity}</td>
                      <td className="px-6 py-4 font-semibold text-slate-500 text-xs">{mo.warehouse.name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${statusColors[mo.status]}`}>
                          {mo.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => { setSelectedMo(mo); setShowDetailsModal(true); }}
                          className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/60 dark:text-indigo-400 text-xs font-bold rounded-lg transition-all"
                        >
                          ⚙️ shopfloor Control
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

      {/* Create MO Modal */}
      {showMoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md p-6 rounded-2xl shadow-xl space-y-6">
            <h3 className="text-xl font-bold">Raise Build order (MO)</h3>
            <form onSubmit={handleCreateMo} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Manufactured Product</label>
                <select
                  required className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                  value={moProductId} onChange={(e) => handleProductChange(e.target.value)}
                >
                  <option value="">Select Item</option>
                  {boms?.map(b => (
                    <option key={b.id} value={b.productId}>{b.product.name} ({b.product.sku})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400">Build Quantity</label>
                  <input
                    type="number" required min="1"
                    className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                    value={moQty} onChange={(e) => setMoQty(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">BOM Active Spec</label>
                  <input
                    type="text" disabled
                    className="mt-1 w-full p-2.5 border border-slate-250 dark:border-slate-700 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-500 text-sm font-semibold"
                    value={moBomId ? boms?.find(b => b.id === moBomId)?.name : 'Auto-assigned'}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Finished Goods Deposit Warehouse</label>
                <select
                  required className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                  value={moWarehouseId} onChange={(e) => setMoWarehouseId(e.target.value)}
                >
                  <option value="">Select Warehouse</option>
                  {warehouses?.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Floor Supervisor / Assignee</label>
                <select
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                  value={moAssigneeId} onChange={(e) => setMoAssigneeId(e.target.value)}
                >
                  <option value="">Choose User</option>
                  {users?.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button type="button" onClick={() => { setShowMoModal(false); resetMoForm(); }} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-white font-medium gradient-bg rounded-xl">
                  Create Build
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MO shopfloor control details modal */}
      {showDetailsModal && selectedMo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-xl p-6 rounded-2xl shadow-xl space-y-6">
            <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-xl font-bold">Build Control: {selectedMo.moNumber}</h3>
                <p className="text-xs text-slate-500">Product: <span className="font-bold">{selectedMo.product.name} ({selectedMo.product.sku})</span></p>
              </div>
              <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                State: {selectedMo.status}
              </span>
            </div>

            {/* Work Orders Sequencing */}
            {selectedMo.workOrders && selectedMo.workOrders.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider">Shopfloor Work Center Sequencing</h4>
                <div className="space-y-2">
                  {selectedMo.workOrders.map((wo) => {
                    const statusColors = {
                      PENDING: 'bg-slate-100 text-slate-700',
                      IN_PROGRESS: 'bg-orange-100 text-orange-800 animate-pulse font-bold',
                      COMPLETED: 'bg-emerald-100 text-emerald-800 font-bold',
                      CANCELLED: 'bg-red-150 text-red-800',
                    };
                    return (
                      <div key={wo.id} className="flex justify-between items-center p-3 border border-slate-100 dark:border-slate-700 rounded-xl">
                        <div>
                          <span className="text-sm font-semibold">{wo.sequence}. {wo.name}</span>
                          <p className="text-[10px] text-slate-400 capitalize">Center: {wo.workCenter.replace('_', ' ')}</p>
                        </div>
                        <div className="flex space-x-2 items-center">
                          <span className={`px-2 py-0.5 text-xs rounded ${statusColors[wo.status]}`}>
                            {wo.status.replace('_', ' ')}
                          </span>
                          
                          {wo.status === 'IN_PROGRESS' && (
                            <button
                              onClick={() => advanceWoMutation.mutate({ woId: wo.id, status: 'COMPLETED' })}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all"
                            >
                              ✓ Complete Step
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button" onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
              >
                Close
              </button>

              {selectedMo.status === 'DRAFT' && (
                <>
                  <button
                    onClick={() => confirmMoMutation.mutate(selectedMo.id)}
                    className="px-4 py-2 text-white font-medium bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm"
                  >
                    ✔️ Confirm Order & Reserve Stock
                  </button>
                  <button
                    onClick={() => cancelMoMutation.mutate(selectedMo.id)}
                    className="px-4 py-2 text-white font-medium bg-red-650 hover:bg-red-500 rounded-xl text-sm"
                  >
                    🚫 Cancel Build
                  </button>
                </>
              )}

              {selectedMo.status === 'CONFIRMED' && (
                <>
                  <button
                    onClick={() => startMoMutation.mutate(selectedMo.id)}
                    className="px-4 py-2 text-white font-medium bg-indigo-650 hover:bg-indigo-550 rounded-xl text-sm"
                  >
                    ⚙️ Start Shopfloor Assembly
                  </button>
                  <button
                    onClick={() => cancelMoMutation.mutate(selectedMo.id)}
                    className="px-4 py-2 text-white font-medium bg-red-650 hover:bg-red-500 rounded-xl text-sm"
                  >
                    🚫 Cancel & Release
                  </button>
                </>
              )}

              {selectedMo.status === 'IN_PROGRESS' && (
                <>
                  <button
                    onClick={() => { if(confirm('Complete Manufacturing Order? This consumes all component ingredients from raw warehouse, adds finished tables/chairs to inventory, and clears work orders.')) completeMoMutation.mutate(selectedMo.id) }}
                    className="px-4 py-2 text-white font-medium bg-emerald-650 hover:bg-emerald-555 rounded-xl text-sm"
                  >
                    🚀 Complete Production
                  </button>
                  <button
                    onClick={() => cancelMoMutation.mutate(selectedMo.id)}
                    className="px-4 py-2 text-white font-medium bg-red-650 hover:bg-red-500 rounded-xl text-sm"
                  >
                    🚫 Cancel & Release
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
