'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<'sales' | 'purchase' | 'inventory' | 'manufacturing' | 'procurement'>('sales');

  // Queries
  const { data: salesReport, isLoading: loadingSales } = useQuery<any[]>({
    queryKey: ['salesReport'],
    queryFn: () => api.get('/dashboard/reports/sales'),
    enabled: reportType === 'sales',
  });

  const { data: purchaseReport, isLoading: loadingPurchase } = useQuery<any[]>({
    queryKey: ['purchaseReport'],
    queryFn: () => api.get('/dashboard/reports/purchase'),
    enabled: reportType === 'purchase',
  });

  const { data: inventoryReport, isLoading: loadingInventory } = useQuery<any[]>({
    queryKey: ['inventoryReport'],
    queryFn: () => api.get('/dashboard/reports/inventory'),
    enabled: reportType === 'inventory',
  });

  const { data: manufacturingReport, isLoading: loadingManufacturing } = useQuery<any[]>({
    queryKey: ['manufacturingReport'],
    queryFn: () => api.get('/dashboard/reports/manufacturing'),
    enabled: reportType === 'manufacturing',
  });

  const { data: procurementReport, isLoading: loadingProcurement } = useQuery<any[]>({
    queryKey: ['procurementReport'],
    queryFn: () => api.get('/dashboard/reports/procurement'),
    enabled: reportType === 'procurement',
  });

  const handlePrint = () => {
    window.print();
  };

  const isLoading = loadingSales || loadingPurchase || loadingInventory || loadingManufacturing || loadingProcurement;

  return (
    <div className="space-y-6 print:p-0 print:space-y-4">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Business Reports</h1>
          <p className="text-slate-500 text-sm">Review operational indicators, inventories values, and replenishment stats</p>
        </div>

        <button
          onClick={handlePrint}
          className="px-4 py-2 text-sm font-medium text-white gradient-bg hover:opacity-90 rounded-xl transition-all shadow"
        >
          🖨️ Export PDF / Print
        </button>
      </div>

      {/* Selector - Print Hidden */}
      <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-700 print:hidden">
        {(['sales', 'purchase', 'inventory', 'manufacturing', 'procurement'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setReportType(type)}
            className={`px-5 py-3 text-sm font-medium border-b-2 capitalize transition-all ${
              reportType === type
                ? 'border-indigo-650 text-indigo-650 font-bold dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {type} Report
          </button>
        ))}
      </div>

      {/* Report Container */}
      <div className="p-8 bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-2xl print:border-none print:p-0 shadow-sm">
        {/* Printable Header */}
        <div className="hidden print:block text-center mb-8 pb-4 border-b border-slate-300">
          <h1 className="text-3xl font-extrabold text-slate-900 uppercase">Shiv Furniture Works</h1>
          <p className="text-sm text-slate-500">ERP System Operations Report — {reportType.toUpperCase()}</p>
          <p className="text-[10px] text-slate-400">Generated on: {new Date().toLocaleString()}</p>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-400 animate-pulse">Generating reporting data...</div>
        ) : (
          <div>
            {/* Sales Report */}
            {reportType === 'sales' && salesReport && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white print:hidden">Sales Ledger Overview</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 font-bold text-slate-500">
                        <th className="py-3 px-4">Order No.</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Booking Date</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Invoice Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {salesReport.map((row: any) => (
                        <tr key={row.id}>
                          <td className="py-3 px-4 font-mono font-semibold">{row.orderNumber}</td>
                          <td className="py-3 px-4">{row.customer.name}</td>
                          <td className="py-3 px-4 text-slate-500 text-xs">{new Date(row.orderDate).toLocaleDateString()}</td>
                          <td className="py-3 px-4 font-bold text-xs uppercase">{row.status}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold">₹{Number(row.totalAmount).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Purchase Report */}
            {reportType === 'purchase' && purchaseReport && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white print:hidden">Purchasing Report</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 font-bold text-slate-500">
                        <th className="py-3 px-4">PO Number</th>
                        <th className="py-3 px-4">Vendor</th>
                        <th className="py-3 px-4">Raised Date</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">PO Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {purchaseReport.map((row: any) => (
                        <tr key={row.id}>
                          <td className="py-3 px-4 font-mono font-semibold">{row.orderNumber}</td>
                          <td className="py-3 px-4">{row.vendor.name}</td>
                          <td className="py-3 px-4 text-slate-500 text-xs">{new Date(row.orderDate).toLocaleDateString()}</td>
                          <td className="py-3 px-4 font-bold text-xs uppercase">{row.status}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold">₹{Number(row.totalAmount).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Inventory Valuation Report */}
            {reportType === 'inventory' && inventoryReport && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white print:hidden">Inventory Valuation</h3>
                  <div className="text-sm font-bold text-slate-650 dark:text-slate-350">
                    Total Valuation: <span className="text-indigo-600 dark:text-indigo-400">
                      ₹{inventoryReport.reduce((acc: number, cur: any) => acc + cur.totalValue, 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 font-bold text-slate-500">
                        <th className="py-3 px-4">Warehouse</th>
                        <th className="py-3 px-4">SKU</th>
                        <th className="py-3 px-4">Product Name</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4 text-right">On Hand</th>
                        <th className="py-3 px-4 text-right">Cost Price</th>
                        <th className="py-3 px-4 text-right">Total Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {inventoryReport.map((row: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-3 px-4 font-mono font-bold text-xs">{row.warehouseCode}</td>
                          <td className="py-3 px-4 font-mono font-semibold">{row.sku}</td>
                          <td className="py-3 px-4">{row.name}</td>
                          <td className="py-3 px-4 text-xs text-slate-400">{row.category}</td>
                          <td className="py-3 px-4 text-right font-mono">{row.onHand}</td>
                          <td className="py-3 px-4 text-right font-mono">₹{row.costPrice.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-indigo-500">₹{row.totalValue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Manufacturing Report */}
            {reportType === 'manufacturing' && manufacturingReport && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white print:hidden">Shopfloor Build Rates</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 font-bold text-slate-500">
                        <th className="py-3 px-4">MO Number</th>
                        <th className="py-3 px-4">Product SKU</th>
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4">Qty</th>
                        <th className="py-3 px-4">Target Warehouse</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {manufacturingReport.map((row: any) => (
                        <tr key={row.id}>
                          <td className="py-3 px-4 font-mono font-semibold">{row.moNumber}</td>
                          <td className="py-3 px-4 font-mono">{row.product.sku}</td>
                          <td className="py-3 px-4">{row.product.name}</td>
                          <td className="py-3 px-4 font-mono">{row.quantity}</td>
                          <td className="py-3 px-4">{row.warehouse.code}</td>
                          <td className="py-3 px-4 font-bold text-xs uppercase">{row.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Procurement Report */}
            {reportType === 'procurement' && procurementReport && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white print:hidden">Replenishment Audit Log</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 font-bold text-slate-500">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Product Name</th>
                        <th className="py-3 px-4">Sales Reference</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4 text-right">Shortage Quantity</th>
                        <th className="py-3 px-4">Fulfillment Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {procurementReport.map((row: any) => (
                        <tr key={row.id}>
                          <td className="py-3 px-4 text-xs text-slate-400">{new Date(row.createdAt).toLocaleDateString()}</td>
                          <td className="py-3 px-4">
                            <span className="font-semibold">{row.product.name}</span>
                            <p className="text-[10px] text-slate-400 font-mono">({row.product.sku})</p>
                          </td>
                          <td className="py-3 px-4 font-mono">{row.salesOrder?.orderNumber || 'MTS Triggered'}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-750 dark:bg-slate-750 dark:text-slate-350">
                              {row.procurementType}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold">{row.shortageQuantity}</td>
                          <td className="py-3 px-4 font-bold text-xs uppercase">{row.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
