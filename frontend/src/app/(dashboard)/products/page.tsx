'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  salesPrice: number;
  costPrice: number;
  procurementStrategy: 'MTS' | 'MTO';
  procurementType: 'PURCHASE' | 'MANUFACTURING';
  category: { name: string };
  uom: { code: string };
  active: boolean;
}

interface Category {
  id: string;
  name: string;
  code: string;
  description: string;
}

interface Uom {
  id: string;
  name: string;
  code: string;
}

interface Bom {
  id: string;
  product: { sku: string; name: string };
  name: string;
  version: string;
  components: Array<{ product: { sku: string }; quantity: number }>;
  operations: Array<{ name: string; workCenter: string; sequence: number; durationMinutes: number }>;
}

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'uoms' | 'boms'>('products');
  
  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showUomModal, setShowUomModal] = useState(false);
  const [showBomModal, setShowBomModal] = useState(false);

  // Queries
  const { data: products, isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => api.get('/products'),
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/products/categories'),
  });

  const { data: uoms } = useQuery<Uom[]>({
    queryKey: ['uoms'],
    queryFn: () => api.get('/products/uoms'),
  });

  const { data: boms } = useQuery<Bom[]>({
    queryKey: ['boms'],
    queryFn: () => api.get('/manufacturing/boms'),
  });

  const { data: vendors } = useQuery<any[]>({
    queryKey: ['vendors'],
    queryFn: () => api.get('/purchase/vendors'),
  });

  // Mutations
  const createProductMutation = useMutation({
    mutationFn: (newProduct: any) => api.post('/products', newProduct),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowProductModal(false);
      resetProductForm();
    },
    onError: (err: any) => alert(err.message || 'Error creating product'),
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });

  const createCategoryMutation = useMutation({
    mutationFn: (newCategory: any) => api.post('/products/categories', newCategory),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setShowCategoryModal(false);
    },
    onError: (err: any) => alert(err.message || 'Error creating category'),
  });

  const createUomMutation = useMutation({
    mutationFn: (newUom: any) => api.post('/products/uoms', newUom),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uoms'] });
      setShowUomModal(false);
    },
    onError: (err: any) => alert(err.message || 'Error creating UoM'),
  });

  const createBomMutation = useMutation({
    mutationFn: (newBom: any) => api.post('/manufacturing/boms', newBom),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boms'] });
      setShowBomModal(false);
      resetBomForm();
    },
    onError: (err: any) => alert(err.message || 'Error creating BoM'),
  });

  // Product Form state
  const [sku, setSku] = useState('');
  const [prodName, setProdName] = useState('');
  const [description, setDescription] = useState('');
  const [salesPrice, setSalesPrice] = useState(0);
  const [costPrice, setCostPrice] = useState(0);
  const [categoryId, setCategoryId] = useState('');
  const [uomId, setUomId] = useState('');
  const [strategy, setStrategy] = useState<'MTS' | 'MTO'>('MTS');
  const [procType, setProcType] = useState<'PURCHASE' | 'MANUFACTURING'>('PURCHASE');
  const [vendorId, setVendorId] = useState('');

  const resetProductForm = () => {
    setSku('');
    setProdName('');
    setDescription('');
    setSalesPrice(0);
    setCostPrice(0);
    setCategoryId('');
    setUomId('');
    setStrategy('MTS');
    setProcType('PURCHASE');
    setVendorId('');
  };

  // Category Form State
  const [catName, setCatName] = useState('');
  const [catCode, setCatCode] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // Uom Form State
  const [uomName, setUomName] = useState('');
  const [uomCode, setUomCode] = useState('');

  // BoM Form State
  const [bomProductId, setBomProductId] = useState('');
  const [bomName, setBomName] = useState('');
  const [bomVersion, setBomVersion] = useState('1.0.0');
  const [bomComponents, setBomComponents] = useState<Array<{ productId: string; quantity: number }>>([{ productId: '', quantity: 1 }]);
  const [bomOperations, setBomOperations] = useState<Array<{ name: string; workCenter: string; sequence: number; durationMinutes: number }>>([
    { name: 'Assembly', workCenter: 'ASSEMBLY_LINE', sequence: 1, durationMinutes: 60 }
  ]);

  const resetBomForm = () => {
    setBomProductId('');
    setBomName('');
    setBomVersion('1.0.0');
    setBomComponents([{ productId: '', quantity: 1 }]);
    setBomOperations([{ name: 'Assembly', workCenter: 'ASSEMBLY_LINE', sequence: 1, durationMinutes: 60 }]);
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    createProductMutation.mutate({
      sku,
      name: prodName,
      description,
      salesPrice,
      costPrice,
      categoryId,
      uomId,
      procurementStrategy: strategy,
      procurementType: procType,
      vendorId: vendorId || null,
    });
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    createCategoryMutation.mutate({ name: catName, code: catCode, description: catDesc });
  };

  const handleAddUom = (e: React.FormEvent) => {
    e.preventDefault();
    createUomMutation.mutate({ name: uomName, code: uomCode });
  };

  const handleAddBom = (e: React.FormEvent) => {
    e.preventDefault();
    // filter empty components
    const filteredComponents = bomComponents.filter(c => c.productId !== '');
    if (filteredComponents.length === 0) {
      alert('Must select at least one component');
      return;
    }
    createBomMutation.mutate({
      productId: bomProductId,
      name: bomName,
      version: bomVersion,
      components: filteredComponents,
      operations: bomOperations,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Products Catalog</h1>
          <p className="text-slate-500 text-sm">Configure materials, items categories, units, and Bills of Materials (BoM)</p>
        </div>
        
        {activeTab === 'products' && (
          <button
            onClick={() => setShowProductModal(true)}
            className="px-4 py-2 text-sm font-medium text-white gradient-bg hover:opacity-90 rounded-xl transition-all shadow"
          >
            ➕ Add Product
          </button>
        )}
        {activeTab === 'categories' && (
          <button
            onClick={() => setShowCategoryModal(true)}
            className="px-4 py-2 text-sm font-medium text-white gradient-bg hover:opacity-90 rounded-xl transition-all shadow"
          >
            ➕ Add Category
          </button>
        )}
        {activeTab === 'uoms' && (
          <button
            onClick={() => setShowUomModal(true)}
            className="px-4 py-2 text-sm font-medium text-white gradient-bg hover:opacity-90 rounded-xl transition-all shadow"
          >
            ➕ Add Unit of Measure
          </button>
        )}
        {activeTab === 'boms' && (
          <button
            onClick={() => setShowBomModal(true)}
            className="px-4 py-2 text-sm font-medium text-white gradient-bg hover:opacity-90 rounded-xl transition-all shadow"
          >
            ➕ Create BoM
          </button>
        )}
      </div>

      {/* Tabs headers */}
      <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-700">
        {(['products', 'categories', 'uoms', 'boms'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-medium border-b-2 capitalize transition-all ${
              activeTab === tab
                ? 'border-indigo-650 text-indigo-650 font-bold dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'products' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
          {loadingProducts ? (
            <div className="p-8 text-center text-slate-400 animate-pulse">Loading products catalog...</div>
          ) : !products || products.length === 0 ? (
            <div className="p-12 text-center text-slate-400">No products configured. Click "Add Product" to create one.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-750 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4">SKU</th>
                    <th className="px-6 py-4">Product Name</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">UoM</th>
                    <th className="px-6 py-4">Strategy</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4 text-right">Cost Price</th>
                    <th className="px-6 py-4 text-right">Sales Price</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">{p.sku}</td>
                      <td className="px-6 py-4 font-semibold text-slate-850 dark:text-slate-200">{p.name}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{p.category?.name}</td>
                      <td className="px-6 py-4 font-mono text-slate-500 dark:text-slate-400">{p.uom?.code}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-[10px] font-bold rounded ${p.procurementStrategy === 'MTO' ? 'bg-orange-100 text-orange-850 dark:bg-orange-950/40 dark:text-orange-300' : 'bg-blue-100 text-blue-850 dark:bg-blue-950/40 dark:text-blue-300'}`}>
                          {p.procurementStrategy}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-semibold">{p.procurementType}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono">₹{Number(p.costPrice).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-mono">₹{Number(p.salesPrice).toFixed(2)}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => { if(confirm('Soft-delete this product?')) deleteProductMutation.mutate(p.id) }}
                          className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded font-medium"
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories?.map((cat) => (
            <div key={cat.id} className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm">
              <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-505 dark:bg-slate-700 px-2.5 py-1 rounded">
                Code: {cat.code}
              </span>
              <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">{cat.name}</h3>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{cat.description || 'No description provided'}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'uoms' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {uoms?.map((uom) => (
            <div key={uom.id} className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-center">
              <span className="text-3xl font-extrabold text-indigo-500 dark:text-indigo-400 font-mono">
                {uom.code}
              </span>
              <h4 className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">{uom.name}</h4>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'boms' && (
        <div className="space-y-6">
          {boms?.map((bom) => (
            <div key={bom.id} className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm space-y-4">
              <div className="flex justify-between items-start border-b border-slate-150 dark:border-slate-700 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{bom.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">For product: <span className="font-bold">{bom.product.name} ({bom.product.sku})</span></p>
                </div>
                <span className="px-2.5 py-1 text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 rounded">
                  v{bom.version}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Components Required</h4>
                  <ul className="space-y-1.5 text-sm">
                    {bom.components.map((c, idx) => (
                      <li key={idx} className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-750/30">
                        <span className="font-mono text-slate-700 dark:text-slate-350">{c.product.sku}</span>
                        <span className="font-bold">{Number(c.quantity)} units</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Operations Sequence</h4>
                  <ul className="space-y-1.5 text-sm">
                    {bom.operations.map((o, idx) => (
                      <li key={idx} className="flex justify-between items-center p-2 rounded bg-slate-50 dark:bg-slate-750/30">
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{o.sequence}. {o.name}</span>
                          <p className="text-[10px] text-slate-400 capitalize">Center: {o.workCenter.replace('_', ' ')}</p>
                        </div>
                        <span className="text-xs font-semibold text-indigo-500">{o.durationMinutes} mins</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg p-6 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto space-y-6">
            <h3 className="text-xl font-bold">Add Product</h3>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400">SKU Code</label>
                  <input
                    type="text" required placeholder="e.g. FP-TAB-WD"
                    className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                    value={sku} onChange={(e) => setSku(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">Product Name</label>
                  <input
                    type="text" required placeholder="e.g. Oak Dining Table"
                    className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                    value={prodName} onChange={(e) => setProdName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Description</label>
                <textarea
                  placeholder="Details of the product"
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent h-20"
                  value={description} onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400">Cost Price (₹)</label>
                  <input
                    type="number" required min="0" step="0.01"
                    className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                    value={costPrice} onChange={(e) => setCostPrice(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">Sales Price (₹)</label>
                  <input
                    type="number" required min="0" step="0.01"
                    className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                    value={salesPrice} onChange={(e) => setSalesPrice(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400">Category</label>
                  <select
                    required className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                    value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">Select Category</option>
                    {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">Unit of Measure (UoM)</label>
                  <select
                    required className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                    value={uomId} onChange={(e) => setUomId(e.target.value)}
                  >
                    <option value="">Select UoM</option>
                    {uoms?.map(u => <option key={u.id} value={u.id}>{u.name} ({u.code})</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400">Strategy</label>
                  <select
                    className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                    value={strategy} onChange={(e) => setStrategy(e.target.value as any)}
                  >
                    <option value="MTS">MTS (Make To Stock)</option>
                    <option value="MTO">MTO (Make To Order)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">Type</label>
                  <select
                    className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                    value={procType} onChange={(e) => setProcType(e.target.value as any)}
                  >
                    <option value="PURCHASE">Purchase</option>
                    <option value="MANUFACTURING">Manufacturing</option>
                  </select>
                </div>
              </div>

              {procType === 'PURCHASE' && (
                <div>
                  <label className="text-xs font-semibold text-slate-400">Vendor Supplier</label>
                  <select
                    className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                    value={vendorId} onChange={(e) => setVendorId(e.target.value)}
                  >
                    <option value="">Select Vendor</option>
                    {vendors?.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button" onClick={() => { setShowProductModal(false); resetProductForm(); }}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit" className="px-4 py-2 text-white font-medium gradient-bg rounded-xl"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md p-6 rounded-2xl shadow-xl space-y-6">
            <h3 className="text-xl font-bold">Add Category</h3>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Category Name</label>
                <input
                  type="text" required placeholder="e.g. Finished Goods"
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                  value={catName} onChange={(e) => setCatName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">Category Code</label>
                <input
                  type="text" required placeholder="e.g. FIN"
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                  value={catCode} onChange={(e) => setCatCode(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">Description</label>
                <textarea
                  placeholder="Details"
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent h-20"
                  value={catDesc} onChange={(e) => setCatDesc(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button type="button" onClick={() => setShowCategoryModal(false)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl">
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

      {/* Add UOM Modal */}
      {showUomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm p-6 rounded-2xl shadow-xl space-y-6">
            <h3 className="text-xl font-bold">Add Unit of Measure</h3>
            <form onSubmit={handleAddUom} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">UoM Name</label>
                <input
                  type="text" required placeholder="e.g. Kilograms"
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                  value={uomName} onChange={(e) => setUomName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">UoM Code</label>
                <input
                  type="text" required placeholder="e.g. KG"
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                  value={uomCode} onChange={(e) => setUomCode(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button type="button" onClick={() => setShowUomModal(false)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl">
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

      {/* Create BoM Modal */}
      {showBomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg p-6 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto space-y-6">
            <h3 className="text-xl font-bold">Create Bill of Materials</h3>
            <form onSubmit={handleAddBom} className="space-y-6">
              <div>
                <label className="text-xs font-semibold text-slate-400">Finished Product</label>
                <select
                  required className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                  value={bomProductId} onChange={(e) => setBomProductId(e.target.value)}
                >
                  <option value="">Select Manufactured Product</option>
                  {products?.filter(p => p.procurementType === 'MANUFACTURING').map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400">BoM Name</label>
                  <input
                    type="text" required placeholder="Standard Wooden Table BoM"
                    className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                    value={bomName} onChange={(e) => setBomName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">Version</label>
                  <input
                    type="text" required placeholder="1.0.0"
                    className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                    value={bomVersion} onChange={(e) => setBomVersion(e.target.value)}
                  />
                </div>
              </div>

              {/* Dynamic Components List */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Components</h4>
                  <button
                    type="button"
                    onClick={() => setBomComponents([...bomComponents, { productId: '', quantity: 1 }])}
                    className="text-xs text-indigo-500 font-bold hover:underline"
                  >
                    ➕ Add Component
                  </button>
                </div>

                {bomComponents.map((c, idx) => (
                  <div key={idx} className="flex space-x-3 items-center">
                    <select
                      required className="w-2/3 p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                      value={c.productId}
                      onChange={(e) => {
                        const copy = [...bomComponents];
                        copy[idx].productId = e.target.value;
                        setBomComponents(copy);
                      }}
                    >
                      <option value="">Select component product</option>
                      {products?.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                      ))}
                    </select>

                    <input
                      type="number" required min="0.0001" step="any" placeholder="Qty"
                      className="w-1/4 p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                      value={c.quantity}
                      onChange={(e) => {
                        const copy = [...bomComponents];
                        copy[idx].quantity = Number(e.target.value);
                        setBomComponents(copy);
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => {
                        if (bomComponents.length > 1) {
                          setBomComponents(bomComponents.filter((_, i) => i !== idx));
                        }
                      }}
                      className="text-red-500 text-sm"
                    >
                      ❌
                    </button>
                  </div>
                ))}
              </div>

              {/* Dynamic Operations List */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Operations Pipeline</h4>
                  <button
                    type="button"
                    onClick={() => setBomOperations([...bomOperations, { name: '', workCenter: 'ASSEMBLY_LINE', sequence: bomOperations.length + 1, durationMinutes: 30 }])}
                    className="text-xs text-indigo-500 font-bold hover:underline"
                  >
                    ➕ Add Operation
                  </button>
                </div>

                {bomOperations.map((o, idx) => (
                  <div key={idx} className="space-y-2 p-3 bg-slate-50 dark:bg-slate-750/30 border border-slate-200 dark:border-slate-700 rounded-xl relative">
                    <button
                      type="button"
                      onClick={() => {
                        if (bomOperations.length > 1) {
                          setBomOperations(bomOperations.filter((_, i) => i !== idx).map((op, i) => ({ ...op, sequence: i + 1 })));
                        }
                      }}
                      className="absolute top-2 right-2 text-red-500 text-xs"
                    >
                      ❌
                    </button>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400">Step Name</label>
                        <input
                          type="text" required placeholder="e.g. Painting"
                          className="mt-1 w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm"
                          value={o.name}
                          onChange={(e) => {
                            const copy = [...bomOperations];
                            copy[idx].name = e.target.value;
                            setBomOperations(copy);
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400">Work Center</label>
                        <select
                          className="mt-1 w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm"
                          value={o.workCenter}
                          onChange={(e) => {
                            const copy = [...bomOperations];
                            copy[idx].workCenter = e.target.value;
                            setBomOperations(copy);
                          }}
                        >
                          <option value="ASSEMBLY_LINE">Assembly Line</option>
                          <option value="PAINT_FLOOR">Paint Floor</option>
                          <option value="PACKAGING_UNIT">Packaging Unit</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400">Sequence Order</label>
                        <input
                          type="number" required min="1" disabled
                          className="mt-1 w-full p-2 border border-slate-250 dark:border-slate-700 rounded-lg bg-slate-100/50 text-slate-500 text-sm"
                          value={o.sequence}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400">Duration (mins)</label>
                        <input
                          type="number" required min="1"
                          className="mt-1 w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm"
                          value={o.durationMinutes}
                          onChange={(e) => {
                            const copy = [...bomOperations];
                            copy[idx].durationMinutes = Number(e.target.value);
                            setBomOperations(copy);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button type="button" onClick={() => { setShowBomModal(false); resetBomForm(); }} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl">
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
    </div>
  );
}
