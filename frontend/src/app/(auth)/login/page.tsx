'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, setTokens, getTokens } from '../../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const { accessToken } = getTokens();
    if (accessToken) {
      router.push('/');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.post('/auth/login', { email, password });
      setTokens(data.accessToken, data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('Admin@123');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12 dark:bg-slate-950 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-900/20 blur-3xl" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-violet-900/20 blur-3xl" />

      <div className="w-full max-w-md space-y-8 animate-fade-in relative z-10">
        <div className="text-center">
          <h2 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Shiv Furniture Works
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Sign in to access the Enterprise Resource Planning (ERP) suite
          </p>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/50 backdrop-blur-xl p-8 rounded-2xl shadow-premium">
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-950/30 border border-red-800 text-red-400 text-sm font-medium">
              ⚠️ {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                className="mt-1 block w-full px-4 py-3 bg-slate-950/60 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-indigo-500"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                className="mt-1 block w-full px-4 py-3 bg-slate-950/60 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-indigo-500"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg text-white font-medium gradient-bg hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center justify-center"
            >
              {loading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : 'Access System'}
            </button>
          </form>

          {/* Quick login for developer demo */}
          <div className="mt-8 pt-6 border-t border-slate-700/60">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">
              Quick Role-based Access (Demo Pass: Admin@123)
            </h4>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => handleQuickLogin('admin@shivfurniture.com')}
                className="p-2 text-left rounded bg-indigo-950/40 text-indigo-300 border border-indigo-900/50 hover:bg-indigo-900/30"
              >
                🔑 Admin
              </button>
              <button
                onClick={() => handleQuickLogin('sales@shivfurniture.com')}
                className="p-2 text-left rounded bg-emerald-950/40 text-emerald-300 border border-emerald-900/50 hover:bg-emerald-900/30"
              >
                📈 Sales User
              </button>
              <button
                onClick={() => handleQuickLogin('purchase@shivfurniture.com')}
                className="p-2 text-left rounded bg-sky-950/40 text-sky-300 border border-sky-900/50 hover:bg-sky-900/30"
              >
                🛒 Purchase User
              </button>
              <button
                onClick={() => handleQuickLogin('manufacturing@shivfurniture.com')}
                className="p-2 text-left rounded bg-orange-950/40 text-orange-300 border border-orange-900/50 hover:bg-orange-900/30"
              >
                ⚙️ Manufacturing
              </button>
              <button
                onClick={() => handleQuickLogin('inventory@shivfurniture.com')}
                className="p-2 text-left rounded bg-violet-950/40 text-violet-300 border border-violet-900/50 hover:bg-violet-900/30"
              >
                📦 Inventory Manager
              </button>
              <button
                onClick={() => handleQuickLogin('owner@shivfurniture.com')}
                className="p-2 text-left rounded bg-slate-900/60 text-slate-300 border border-slate-700/50 hover:bg-slate-800/40"
              >
                📊 Business Owner
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
