'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getTokens, clearTokens, getCurrentUser } from '../../lib/api';

const MODULES = [
  { name: 'Dashboard', path: '/', icon: '📊', roles: ['ADMIN', 'SALES_USER', 'PURCHASE_USER', 'MANUFACTURING_USER', 'INVENTORY_MANAGER', 'BUSINESS_OWNER'] },
  { name: 'Products & BoMs', path: '/products', icon: '🌲', roles: ['ADMIN', 'SALES_USER', 'PURCHASE_USER', 'MANUFACTURING_USER', 'INVENTORY_MANAGER', 'BUSINESS_OWNER'] },
  { name: 'Inventory & Stock', path: '/inventory', icon: '📦', roles: ['ADMIN', 'SALES_USER', 'PURCHASE_USER', 'MANUFACTURING_USER', 'INVENTORY_MANAGER', 'BUSINESS_OWNER'] },
  { name: 'Sales Orders', path: '/sales', icon: '📈', roles: ['ADMIN', 'SALES_USER', 'BUSINESS_OWNER'] },
  { name: 'Purchase Orders', path: '/purchase', icon: '🛒', roles: ['ADMIN', 'PURCHASE_USER', 'BUSINESS_OWNER'] },
  { name: 'Manufacturing', path: '/manufacturing', icon: '⚙️', roles: ['ADMIN', 'MANUFACTURING_USER', 'BUSINESS_OWNER'] },
  { name: 'Reports', path: '/reports', icon: '📋', roles: ['ADMIN', 'BUSINESS_OWNER'] },
  { name: 'Audit Logs', path: '/audit-logs', icon: '🔒', roles: ['ADMIN', 'BUSINESS_OWNER'] },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const { accessToken } = getTokens();
    if (!accessToken) {
      router.push('/login');
    } else {
      const activeUser = getCurrentUser();
      setUser(activeUser);
    }
  }, [router]);

  const handleLogout = () => {
    clearTokens();
    router.push('/login');
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  // Filter modules based on role
  const allowedModules = MODULES.filter((mod) => mod.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-slate-800 text-slate-100 border-r border-slate-700">
        <div className="flex items-center h-16 px-6 bg-slate-950 font-bold text-xl tracking-tight text-white border-b border-slate-800">
          🌲 Shiv Works ERP
        </div>
        
        <div className="flex-1 flex flex-col justify-between py-6 overflow-y-auto px-4 space-y-4">
          <nav className="space-y-1">
            {allowedModules.map((item) => {
              const active = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
              return (
                <Link
                  key={item.name}
                  href={item.path}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                    active
                      ? 'bg-indigo-600 text-white shadow-premium'
                      : 'text-slate-300 hover:bg-slate-750 hover:text-white'
                  }`}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="pt-4 border-t border-slate-700/60">
            <div className="flex items-center px-4 py-3 bg-slate-750/30 border border-slate-700/40 rounded-xl mb-4">
              <div className="h-9 w-9 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white shadow-sm uppercase">
                {user.firstName[0]}
              </div>
              <div className="ml-3 overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">{user.firstName} {user.lastName}</p>
                <p className="text-[10px] text-slate-400 capitalize truncate">{user.role.toLowerCase().replace('_', ' ')}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-950/20 hover:text-red-300 rounded-lg transition-all border border-transparent hover:border-red-900/30"
            >
              <span className="mr-3">🚪</span> Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative flex w-64 max-w-xs flex-col bg-slate-800 text-slate-100 border-r border-slate-700 animate-fade-in">
            <div className="flex items-center h-16 px-6 bg-slate-950 font-bold text-xl text-white">
              🌲 Shiv Works ERP
            </div>
            <nav className="flex-1 py-4 px-4 overflow-y-auto space-y-1">
              {allowedModules.map((item) => {
                const active = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.name}
                    href={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                      active
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <span className="mr-3 text-lg">{item.icon}</span>
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-700">
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-950/20 rounded-lg"
              >
                <span className="mr-3">🚪</span> Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header bar */}
        <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-10 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden text-slate-500 hover:text-slate-700 dark:text-slate-300 p-2"
          >
            ☰
          </button>
          
          <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Welcome back, <span className="text-slate-900 dark:text-white font-bold">{user.firstName}</span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 capitalize">
              Role: {user.role.toLowerCase().replace('_', ' ')}
            </span>
          </div>
        </header>

        {/* Content main */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
