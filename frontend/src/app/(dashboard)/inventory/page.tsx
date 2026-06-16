'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getCurrentUser } from '../../../lib/api';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  ArrowLeftRight,
  Package,
  Warehouse as WarehouseIcon,
  AlertTriangle,
  TrendingUp,
  PlusCircle,
  MinusCircle,
  FileText
} from 'lucide-react';

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
  address?: string;
  active: boolean;
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

interface DashboardMetrics {
  totalValuation: number;
  totalOnHand: number;
  warehouseCount: number;
  totalItems: number;
  lowStockAlerts: number;
}

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'balances' | 'ledger' | 'transfers' | 'warehouses'>('balances');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState('');
  const [viewMode, setViewMode] = useState<'detailed' | 'aggregated'>('detailed');

  // Modals
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showStockInModal, setShowStockInModal] = useState(false);
  const [showStockOutModal, setShowStockOutModal] = useState(false);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);

  // Edit states
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);

  // Form states
  const [adjustForm, setAdjustForm] = useState({ productId: '', warehouseId: '', adjustmentQty: 0, reason: '' });
  const [transferForm, setTransferForm] = useState({ productId: '', srcWarehouseId: '', destWarehouseId: '', quantity: 0, reason: '' });
  const [stockInForm, setStockInForm] = useState({ productId: '', warehouseId: '', quantity: 0, reason: '' });
  const [stockOutForm, setStockOutForm] = useState({ productId: '', warehouseId: '', quantity: 0, reason: '' });
  const [warehouseForm, setWarehouseForm] = useState({ name: '', code: '', address: '' });

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  const isAuthorized = currentUser && ['ADMIN', 'BUSINESS_OWNER', 'INVENTORY_MANAGER'].includes(currentUser.role);

  // Queries
  const { data: inventory, isLoading: loadingInventory } = useQuery<InventoryItem[]>({
    queryKey: ['inventoryLevels'],
    queryFn: () => api.get('/inventory'),
  });

  const { data: warehouses, isLoading: loadingWarehouses } = useQuery<Warehouse[]>({
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

  const { data: metrics } = useQuery<DashboardMetrics>({
    queryKey: ['inventoryMetrics'],
    queryFn: () => api.get('/inventory/dashboard-metrics'),
  });

  // Mutations
  const adjustMutation = useMutation({
    mutationFn: (data: any) => api.post('/inventory/adjust', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryLevels'] });
      queryClient.invalidateQueries({ queryKey: ['stockLedger'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryMetrics'] });
      setShowAdjustModal(false);
      setAdjustForm({ productId: '', warehouseId: '', adjustmentQty: 0, reason: '' });
    },
    onError: (err: any) => alert(err.message || 'Error executing adjustment'),
  });

  const transferMutation = useMutation({
    mutationFn: (data: any) => api.post('/inventory/transfer', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryLevels'] });
      queryClient.invalidateQueries({ queryKey: ['stockLedger'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryMetrics'] });
      setShowTransferModal(false);
      setTransferForm({ productId: '', srcWarehouseId: '', destWarehouseId: '', quantity: 0, reason: '' });
    },
    onError: (err: any) => alert(err.message || 'Error executing transfer'),
  });

  const stockInMutation = useMutation({
    mutationFn: (data: any) => api.post('/inventory/stock-in', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryLevels'] });
      queryClient.invalidateQueries({ queryKey: ['stockLedger'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryMetrics'] });
      setShowStockInModal(false);
      setStockInForm({ productId: '', warehouseId: '', quantity: 0, reason: '' });
    },
    onError: (err: any) => alert(err.message || 'Error recording stock in'),
  });

  const stockOutMutation = useMutation({
    mutationFn: (data: any) => api.post('/inventory/stock-out', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryLevels'] });
      queryClient.invalidateQueries({ queryKey: ['stockLedger'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryMetrics'] });
      setShowStockOutModal(false);
      setStockOutForm({ productId: '', warehouseId: '', quantity: 0, reason: '' });
    },
    onError: (err: any) => alert(err.message || 'Error recording stock out'),
  });

  const createWarehouseMutation = useMutation({
    mutationFn: (data: any) => api.post('/inventory/warehouses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryMetrics'] });
      setShowWarehouseModal(false);
      setWarehouseForm({ name: '', code: '', address: '' });
    },
    onError: (err: any) => alert(err.message || 'Error creating warehouse'),
  });

  const updateWarehouseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/inventory/warehouses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      setShowWarehouseModal(false);
      setEditingWarehouse(null);
      setWarehouseForm({ name: '', code: '', address: '' });
    },
    onError: (err: any) => alert(err.message || 'Error updating warehouse'),
  });

  const deactivateWarehouseMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/inventory/warehouses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryMetrics'] });
    },
    onError: (err: any) => alert(err.message || 'Error deactivating warehouse'),
  });

  // Handlers
  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    adjustMutation.mutate(adjustForm);
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    transferMutation.mutate(transferForm);
  };

  const handleStockInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    stockInMutation.mutate(stockInForm);
  };

  const handleStockOutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    stockOutMutation.mutate(stockOutForm);
  };

  const handleWarehouseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingWarehouse) {
      updateWarehouseMutation.mutate({ id: editingWarehouse.id, data: warehouseForm });
    } else {
      createWarehouseMutation.mutate(warehouseForm);
    }
  };

  const handleEditWarehouse = (wh: Warehouse) => {
    setEditingWarehouse(wh);
    setWarehouseForm({ name: wh.name, code: wh.code, address: wh.address || '' });
    setShowWarehouseModal(true);
  };

  // Filters logic
  const filteredInventory = inventory?.filter((item) => {
    const matchesSearch =
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesWarehouse = selectedWarehouseFilter
      ? item.warehouseId === selectedWarehouseFilter
      : true;
    return matchesSearch && matchesWarehouse;
  }) || [];

  // Aggregated view logic (group by product SKU)
  const aggregatedInventoryMap = new Map<string, any>();
  filteredInventory.forEach((item) => {
    if (aggregatedInventoryMap.has(item.sku)) {
      const existing = aggregatedInventoryMap.get(item.sku);
      existing.onHand += item.onHand;
      existing.reserved += item.reserved;
      existing.availableQty += item.availableQty;
    } else {
      aggregatedInventoryMap.set(item.sku, { ...item });
    }
  });
  const aggregatedInventory = Array.from(aggregatedInventoryMap.values());

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            📦 Inventory & Stock
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Real-time warehouse tracking, locations management, and material ledger audit logs
          </p>
        </div>

        {isAuthorized && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowStockInModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-premium cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" /> Stock In
            </button>
            <button
              onClick={() => setShowStockOutModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-premium cursor-pointer"
            >
              <MinusCircle className="h-4 w-4" /> Stock Out
            </button>
            <button
              onClick={() => setShowTransferModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-premium cursor-pointer"
            >
              <ArrowLeftRight className="h-4 w-4" /> Transfer
            </button>
            <button
              onClick={() => setShowAdjustModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer"
            >
              ⚙️ Adjust stock count
            </button>
          </div>
        )}
      </div>

      {/* Dashboard KPI Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Valuation</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              ₹{metrics?.totalValuation.toLocaleString() || '0'}
            </h3>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Physical On Hand</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              {metrics?.totalOnHand.toLocaleString() || '0'}
            </h3>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Package className="h-6 w-6" />
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Locations</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              {metrics?.warehouseCount || '0'}
            </h3>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <WarehouseIcon className="h-6 w-6" />
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Low Stock Warnings</p>
            <h3 className={`text-2xl font-black ${(metrics?.lowStockAlerts || 0) > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-900 dark:text-white'}`}>
              {metrics?.lowStockAlerts || '0'}
            </h3>
          </div>
          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${(metrics?.lowStockAlerts || 0) > 0 ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600' : 'bg-slate-50 dark:bg-slate-750 text-slate-400'}`}>
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex space-x-2 border-b border-slate-250 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('balances')}
          className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'balances'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-450 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Package className="h-4 w-4" /> Stock Balances
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'ledger'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-450 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <FileText className="h-4 w-4" /> Stock Ledger Log
        </button>
        <button
          onClick={() => setActiveTab('transfers')}
          className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'transfers'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-450 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <ArrowLeftRight className="h-4 w-4" /> Stock Movements
        </button>
        <button
          onClick={() => setActiveTab('warehouses')}
          className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'warehouses'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-450 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <WarehouseIcon className="h-4 w-4" /> Warehouses
        </button>
      </div>

      {/* Tab Contents: Balances */}
      {activeTab === 'balances' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm">
            <div className="flex-1 flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Product Name or SKU..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-250 dark:border-slate-700 rounded-xl bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Warehouse Filter */}
              {viewMode === 'detailed' && (
                <select
                  className="p-2 border border-slate-250 dark:border-slate-700 rounded-xl bg-transparent text-sm min-w-[180px] focus:outline-none"
                  value={selectedWarehouseFilter}
                  onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
                >
                  <option value="">All Warehouses</option>
                  {warehouses?.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} ({wh.code})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Toggle View Mode */}
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-750 p-1 self-start md:self-auto border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('detailed')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'detailed'
                    ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Split By Warehouse
              </button>
              <button
                onClick={() => {
                  setViewMode('aggregated');
                  setSelectedWarehouseFilter('');
                }}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'aggregated'
                    ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Aggregate By Product
              </button>
            </div>
          </div>

          {/* Table list */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
            {loadingInventory ? (
              <div className="p-12 text-center text-slate-400 animate-pulse">Loading stock inventory data...</div>
            ) : filteredInventory.length === 0 ? (
              <div className="p-16 text-center text-slate-400 flex flex-col items-center gap-2">
                <Package className="h-10 w-10 text-slate-300" />
                <p>No inventory records found matching your filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-550/5 dark:bg-slate-750 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      {viewMode === 'detailed' && <th className="px-6 py-4">Warehouse Location</th>}
                      <th className="px-6 py-4">SKU</th>
                      <th className="px-6 py-4">Product Name</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4 text-center">UoM</th>
                      <th className="px-6 py-4 text-right">Physical On Hand</th>
                      <th className="px-6 py-4 text-right">Reserved Stock</th>
                      <th className="px-6 py-4 text-right">Free / Available</th>
                      <th className="px-6 py-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {(viewMode === 'detailed' ? filteredInventory : aggregatedInventory).map((inv, idx) => {
                      const isLowStock = inv.availableQty < 10;
                      return (
                        <tr key={inv.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                          {viewMode === 'detailed' && (
                            <td className="px-6 py-4">
                              <span className="font-bold text-slate-900 dark:text-white">{inv.warehouseName}</span>
                              <span className="ml-2 px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                {inv.warehouseCode}
                              </span>
                            </td>
                          )}
                          <td className="px-6 py-4 font-mono text-indigo-500 font-bold">{inv.sku}</td>
                          <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">{inv.productName}</td>
                          <td className="px-6 py-4 text-slate-500 text-xs">{inv.category}</td>
                          <td className="px-6 py-4 text-center font-mono">{inv.uom}</td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {inv.onHand}
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-slate-450 dark:text-slate-500">
                            {inv.reserved}
                          </td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {inv.availableQty}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {isLowStock ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-450">
                                <AlertTriangle className="h-3 w-3" /> Low Stock
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
                                Healthy
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Contents: Ledger */}
      {activeTab === 'ledger' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
          {loadingLedger ? (
            <div className="p-12 text-center text-slate-400 animate-pulse">Loading stock movements log...</div>
          ) : !ledgerResponse?.data || ledgerResponse.data.length === 0 ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center gap-2">
              <FileText className="h-10 w-10 text-slate-300" />
              <p>No inventory movements have been logged yet.</p>
            </div>
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
                      <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">
                        {log.warehouse?.code}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-indigo-500">{log.product?.sku}</span>
                        <p className="text-[10px] text-slate-400 max-w-[200px] truncate">{log.product?.name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 text-[9px] font-extrabold rounded uppercase bg-indigo-50 text-indigo-750 dark:bg-indigo-950/20 dark:text-indigo-300">
                          {log.movementType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right font-mono font-extrabold ${Number(log.quantity) < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {Number(log.quantity) > 0 ? `+${log.quantity}` : log.quantity}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">
                        {log.reference}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
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

      {/* Tab Contents: Transfers & Actions */}
      {activeTab === 'transfers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="h-10 w-10 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center rounded-xl font-bold">
                  📥
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Record Stock In</h3>
                <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
                  Manually add items to a warehouse due to raw material receiving, unexpected gains, or inventory replenishment.
                </p>
              </div>
              <button
                disabled={!isAuthorized}
                onClick={() => setShowStockInModal(true)}
                className="w-full py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-750 dark:disabled:text-slate-500 rounded-xl transition-all shadow-premium cursor-pointer"
              >
                Run Stock In
              </button>
            </div>

            <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="h-10 w-10 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center rounded-xl font-bold">
                  📤
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Record Stock Out</h3>
                <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
                  Release stock manually from a location for sample distribution, scrap write-off, or custom non-sales deliveries.
                </p>
              </div>
              <button
                disabled={!isAuthorized}
                onClick={() => setShowStockOutModal(true)}
                className="w-full py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-750 dark:disabled:text-slate-500 rounded-xl transition-all shadow-premium cursor-pointer"
              >
                Run Stock Out
              </button>
            </div>

            <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center rounded-xl">
                  <ArrowLeftRight className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Inter-Warehouse Transfer</h3>
                <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
                  Relocate materials between different warehouses safely. Validates source warehouse availability to prevent negative stock.
                </p>
              </div>
              <button
                disabled={!isAuthorized}
                onClick={() => setShowTransferModal(true)}
                className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-750 dark:disabled:text-slate-500 rounded-xl transition-all shadow-premium cursor-pointer"
              >
                Transfer Stock
              </button>
            </div>
          </div>

          {/* Transfers History (Filtered Stock Ledgers) */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Movements History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-750 text-xs font-bold text-slate-450 dark:text-slate-400 uppercase">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Product SKU</th>
                    <th className="py-3 px-4">Warehouse</th>
                    <th className="py-3 px-4">Change</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4">Reference Document</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-700/50">
                  {ledgerResponse?.data
                    ?.filter((log) =>
                      log.reference.startsWith('TRANSFER') ||
                      log.reference.startsWith('STOCK_IN') ||
                      log.reference.startsWith('STOCK_OUT')
                    )
                    .slice(0, 10)
                    .map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/10">
                        <td className="py-3 px-4 text-xs text-slate-450">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-indigo-500">{log.product?.sku}</td>
                        <td className="py-3 px-4 font-semibold">{log.warehouse?.code}</td>
                        <td className={`py-3 px-4 font-mono font-bold ${log.quantity < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-450">{log.product?.name}</td>
                        <td className="py-3 px-4 font-medium">{log.reference}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab Contents: Warehouse Management */}
      {activeTab === 'warehouses' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Active Stock Locations</h3>
              <p className="text-xs text-slate-450">View and manage physical warehousing nodes for logistics routing</p>
            </div>
            {isAuthorized && (
              <button
                onClick={() => {
                  setEditingWarehouse(null);
                  setWarehouseForm({ name: '', code: '', address: '' });
                  setShowWarehouseModal(true);
                }}
                className="flex items-center gap-1 px-4 py-2 text-xs font-semibold text-white gradient-bg rounded-xl shadow cursor-pointer hover:opacity-90"
              >
                <Plus className="h-4 w-4" /> Add Warehouse
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loadingWarehouses ? (
              <div className="p-8 text-center text-slate-400 animate-pulse col-span-3">Loading warehouse nodes...</div>
            ) : warehouses?.length === 0 ? (
              <div className="p-12 text-center text-slate-400 col-span-3">No warehouses registered.</div>
            ) : (
              warehouses?.map((wh) => (
                <div
                  key={wh.id}
                  className={`p-6 bg-white dark:bg-slate-800 border rounded-2xl shadow-sm flex flex-col justify-between gap-4 transition-all hover:shadow-md ${
                    wh.active
                      ? 'border-slate-200 dark:border-slate-700'
                      : 'border-slate-200 bg-slate-50/50 dark:bg-slate-850/20 opacity-60'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-350 px-2 py-0.5 rounded">
                        {wh.code}
                      </span>
                      {wh.active ? (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-750 dark:text-slate-400">
                          Deactivated
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        🏢 {wh.name}
                      </h4>
                      <p className="text-xs text-slate-450 mt-1">{wh.address || 'No address provided'}</p>
                    </div>
                  </div>

                  {isAuthorized && wh.active && (
                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700/60">
                      <button
                        onClick={() => handleEditWarehouse(wh)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-indigo-500 hover:bg-indigo-550/10 rounded-lg transition-all cursor-pointer font-medium"
                      >
                        <Edit2 className="h-3 w-3" /> Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to deactivate ${wh.name}?`)) {
                            deactivateWarehouseMutation.mutate(wh.id);
                          }
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-550/10 rounded-lg transition-all cursor-pointer font-medium"
                      >
                        <Trash2 className="h-3 w-3" /> Deactivate
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL: Stock In */}
      {showStockInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md p-6 rounded-2xl shadow-xl space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">📥 Manual Stock In</h3>
            <form onSubmit={handleStockInSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-450">Product</label>
                <select
                  required
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-transparent"
                  value={stockInForm.productId}
                  onChange={(e) => setStockInForm({ ...stockInForm, productId: e.target.value })}
                >
                  <option value="">Select Product</option>
                  {products?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-450">Target Warehouse</label>
                <select
                  required
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-transparent"
                  value={stockInForm.warehouseId}
                  onChange={(e) => setStockInForm({ ...stockInForm, warehouseId: e.target.value })}
                >
                  <option value="">Select Warehouse</option>
                  {warehouses?.filter(w => w.active).map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-450">Quantity (Add)</label>
                <input
                  type="number"
                  required
                  min="0.0001"
                  step="any"
                  placeholder="e.g. 100"
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-transparent"
                  value={stockInForm.quantity || ''}
                  onChange={(e) => setStockInForm({ ...stockInForm, quantity: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-450">Reason / Reference</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Initial replenishment"
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-transparent"
                  value={stockInForm.reason}
                  onChange={(e) => setStockInForm({ ...stockInForm, reason: e.target.value })}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowStockInModal(false)}
                  className="px-4 py-2 border border-slate-250 dark:border-slate-700 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 text-white font-semibold bg-emerald-600 hover:bg-emerald-700 rounded-xl text-sm shadow cursor-pointer">
                  Execute Stock In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Stock Out */}
      {showStockOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md p-6 rounded-2xl shadow-xl space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">📤 Manual Stock Out</h3>
            <form onSubmit={handleStockOutSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-450">Product</label>
                <select
                  required
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-transparent"
                  value={stockOutForm.productId}
                  onChange={(e) => setStockOutForm({ ...stockOutForm, productId: e.target.value })}
                >
                  <option value="">Select Product</option>
                  {products?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-450">Warehouse Location</label>
                <select
                  required
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-transparent"
                  value={stockOutForm.warehouseId}
                  onChange={(e) => setStockOutForm({ ...stockOutForm, warehouseId: e.target.value })}
                >
                  <option value="">Select Warehouse</option>
                  {warehouses?.filter(w => w.active).map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-450">Quantity (Deduct)</label>
                <input
                  type="number"
                  required
                  min="0.0001"
                  step="any"
                  placeholder="e.g. 50"
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-transparent"
                  value={stockOutForm.quantity || ''}
                  onChange={(e) => setStockOutForm({ ...stockOutForm, quantity: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-450">Reason / Reference</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scrap disposal write off"
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-transparent"
                  value={stockOutForm.reason}
                  onChange={(e) => setStockOutForm({ ...stockOutForm, reason: e.target.value })}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowStockOutModal(false)}
                  className="px-4 py-2 border border-slate-250 dark:border-slate-700 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 text-white font-semibold bg-rose-600 hover:bg-rose-700 rounded-xl text-sm shadow cursor-pointer">
                  Execute Stock Out
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Inter-Warehouse Transfer */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md p-6 rounded-2xl shadow-xl space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-indigo-500" /> Stock Transfer
            </h3>
            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-450">Product</label>
                <select
                  required
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-transparent"
                  value={transferForm.productId}
                  onChange={(e) => setTransferForm({ ...transferForm, productId: e.target.value })}
                >
                  <option value="">Select Product</option>
                  {products?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-450">From Warehouse</label>
                  <select
                    required
                    className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-transparent"
                    value={transferForm.srcWarehouseId}
                    onChange={(e) => setTransferForm({ ...transferForm, srcWarehouseId: e.target.value })}
                  >
                    <option value="">Select Src</option>
                    {warehouses?.filter(w => w.active).map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.code}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-450">To Warehouse</label>
                  <select
                    required
                    className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-transparent"
                    value={transferForm.destWarehouseId}
                    onChange={(e) => setTransferForm({ ...transferForm, destWarehouseId: e.target.value })}
                  >
                    <option value="">Select Dest</option>
                    {warehouses?.filter(w => w.active).map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-450">Quantity</label>
                <input
                  type="number"
                  required
                  min="0.0001"
                  step="any"
                  placeholder="Quantity to relocate"
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-transparent"
                  value={transferForm.quantity || ''}
                  onChange={(e) => setTransferForm({ ...transferForm, quantity: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-450">Transfer Reason</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Supply assembly line"
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-transparent"
                  value={transferForm.reason}
                  onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 border border-slate-250 dark:border-slate-700 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 text-white font-semibold bg-indigo-650 hover:bg-indigo-700 rounded-xl text-sm shadow cursor-pointer">
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Manual Adjustment */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md p-6 rounded-2xl shadow-xl space-y-6">
            <h3 className="text-xl font-bold">Manual Inventory Adjustment</h3>
            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-450">Target Product</label>
                <select
                  required
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-transparent"
                  value={adjustForm.productId}
                  onChange={(e) => setAdjustForm({ ...adjustForm, productId: e.target.value })}
                >
                  <option value="">Select Product</option>
                  {products?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-450">Warehouse Location</label>
                <select
                  required
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-transparent"
                  value={adjustForm.warehouseId}
                  onChange={(e) => setAdjustForm({ ...adjustForm, warehouseId: e.target.value })}
                >
                  <option value="">Select Warehouse</option>
                  {warehouses?.filter(w => w.active).map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-450">
                  Adjustment Quantity (Positive to add, Negative to write off)
                </label>
                <input
                  type="number"
                  required
                  step="any"
                  placeholder="e.g. +100 or -15"
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-transparent"
                  value={adjustForm.adjustmentQty || ''}
                  onChange={(e) => setAdjustForm({ ...adjustForm, adjustmentQty: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-450">Reason / Reference document</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stock count cycle discrepancy"
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-transparent"
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 border border-slate-250 dark:border-slate-700 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 text-white font-semibold bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm shadow cursor-pointer">
                  Execute Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add/Edit Warehouse */}
      {showWarehouseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md p-6 rounded-2xl shadow-xl space-y-6">
            <h3 className="text-xl font-bold">
              {editingWarehouse ? '✏️ Edit Warehouse' : '🏢 Register Warehouse'}
            </h3>
            <form onSubmit={handleWarehouseSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-450">Warehouse Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sector 5 Assembly Hub"
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-transparent"
                  value={warehouseForm.name}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-450">Warehouse Code (Unique)</label>
                <input
                  type="text"
                  required
                  disabled={!!editingWarehouse}
                  placeholder="e.g. WH-SEC5"
                  className="mt-1 w-full p-2.5 border border-slate-250 dark:border-slate-700 rounded-xl bg-transparent disabled:opacity-50"
                  value={warehouseForm.code}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, code: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-450">Address / Location</label>
                <input
                  type="text"
                  placeholder="e.g. Panchkula, Haryana"
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-transparent"
                  value={warehouseForm.address}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, address: e.target.value })}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowWarehouseModal(false)}
                  className="px-4 py-2 border border-slate-250 dark:border-slate-700 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 text-white font-semibold bg-indigo-650 hover:bg-indigo-700 rounded-xl text-sm shadow cursor-pointer">
                  {editingWarehouse ? 'Save Changes' : 'Register Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
