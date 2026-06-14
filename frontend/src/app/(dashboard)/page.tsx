'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface DashboardData {
  sales: { count: number; totalAmount: number };
  purchases: { count: number; totalAmount: number };
  pendingDeliveries: number;
  activeManufacturing: number;
  inventoryValue: number;
  delayedOrders: number;
  lowStockCount: number;
  lowStockProducts: Array<{ sku: string; name: string; warehouse: string; available: number }>;
  recentActivities: Array<{ id: string; user: string; action: string; module: string; timestamp: string }>;
}

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboardMetrics'],
    queryFn: () => api.get('/dashboard/metrics'),
    refetchInterval: 10000, // Auto refresh every 10s
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, idx) => (
            <div key={idx} className="h-32 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-red-950/20 border border-red-900 rounded-2xl text-red-400">
        ❌ Failed to load system metrics. Please verify that the backend is running.
      </div>
    );
  }

  const kpis = [
    { name: 'Total Sales Orders', value: `₹${data.sales.totalAmount.toLocaleString()}`, sub: `${data.sales.count} Orders`, icon: '📈', color: 'from-blue-650 to-blue-800' },
    { name: 'Total Purchases', value: `₹${data.purchases.totalAmount.toLocaleString()}`, sub: `${data.purchases.count} Purchase Orders`, icon: '🛒', color: 'from-purple-650 to-purple-800' },
    { name: 'Active Manufacturing', value: data.activeManufacturing, sub: 'Confirmed & Running', icon: '⚙️', color: 'from-orange-550 to-orange-700' },
    { name: 'Pending Deliveries', value: data.pendingDeliveries, sub: 'Awaiting Shipping dispatch', icon: '🚚', color: 'from-emerald-550 to-emerald-700' },
    { name: 'Inventory Valuation', value: `₹${data.inventoryValue.toLocaleString()}`, sub: 'Asset cost valuation', icon: '📦', color: 'from-violet-550 to-violet-700' },
    { name: 'Delayed Deliveries', value: data.delayedOrders, sub: 'Older than 3 days', icon: '⚠️', color: data.delayedOrders > 0 ? 'from-rose-550 to-rose-700 animate-pulse' : 'from-slate-550 to-slate-700' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Shiv Furniture Works Dashboard
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Real-time operations flow from demand booking to shopfloor production
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => (
          <div
            key={kpi.name}
            className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm hover:shadow-premium transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {kpi.name}
                </p>
                <h3 className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
                  {kpi.value}
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {kpi.sub}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-2xl shadow-sm">
                {kpi.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Double Column section for Alerts & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Low Stock Alerts */}
        <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
              ⚠️ Low Stock Alert Levels
            </h3>
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
              {data.lowStockCount} Products Short
            </span>
          </div>

          <div className="overflow-y-auto max-h-[300px] divide-y divide-slate-100 dark:divide-slate-700/60">
            {data.lowStockProducts.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                ✅ All inventory parameters are optimal. No shortages.
              </div>
            ) : (
              data.lowStockProducts.map((p, idx) => (
                <div key={idx} className="py-3 flex justify-between items-center text-sm">
                  <div>
                    <span className="font-semibold text-slate-850 dark:text-slate-200">{p.name}</span>
                    <span className="ml-2 px-2 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-650 dark:bg-slate-750 dark:text-slate-350">
                      SKU: {p.sku}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 mr-2">WH: {p.warehouse}</span>
                    <span className="font-bold text-red-500">{p.available} available</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent System Activity Logs */}
        <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
              🔒 Recent Operations Feed
            </h3>
            <span className="text-xs text-slate-450 dark:text-slate-400">Updated Realtime</span>
          </div>

          <div className="overflow-y-auto max-h-[300px] divide-y divide-slate-100 dark:divide-slate-700/60">
            {data.recentActivities.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                No logged entries found in system logs.
              </div>
            ) : (
              data.recentActivities.map((log) => (
                <div key={log.id} className="py-3 flex justify-between items-start text-sm">
                  <div className="space-y-1">
                    <p className="font-medium text-slate-950 dark:text-white flex items-center">
                      <span className="mr-1.5 px-1.5 py-0.5 text-[9px] font-bold rounded uppercase bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300">
                        {log.module}
                      </span>
                      {log.action.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      By: <span className="font-semibold">{log.user}</span>
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
