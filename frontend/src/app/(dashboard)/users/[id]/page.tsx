'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, getCurrentUser } from '../../../../lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const currentUser = getCurrentUser();

  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ['userDetails', id],
    queryFn: () => api.get(`/users/${id}`),
    enabled: !!id,
  });

  // Access check: Only Admin or the user themselves can view their details
  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.id !== id)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="text-6xl">🔒</div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Access Denied</h1>
        <p className="text-slate-500 max-w-md">
          You do not have permission to view this user profile.
        </p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all shadow"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-8 text-center bg-red-950/20 border border-red-900 rounded-2xl text-red-400">
        ❌ User not found or failed to load.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
        {currentUser.role === 'ADMIN' ? (
          <Link href="/users" className="hover:text-indigo-600 transition-colors">
            Users
          </Link>
        ) : (
          <Link href="/" className="hover:text-indigo-600 transition-colors">
            Dashboard
          </Link>
        )}
        <span>/</span>
        <span>User Details</span>
      </div>

      <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">User Details</h1>
          <p className="text-slate-500 text-sm">Detailed configuration profile for {user.firstName}.</p>
        </div>
        {currentUser.role === 'ADMIN' && (
          <Link
            href={`/users/${user.id}/edit`}
            className="px-4 py-2 text-sm font-semibold bg-indigo-50 dark:bg-slate-750 text-indigo-650 dark:text-indigo-400 hover:opacity-90 rounded-xl transition-all"
          >
            ✏️ Edit Details
          </Link>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
        {/* Top visual card banner */}
        <div className="h-32 bg-gradient-to-r from-indigo-555 to-purple-650 relative">
          <div className="absolute -bottom-10 left-8">
            <div className="h-20 w-20 rounded-full bg-white dark:bg-slate-800 p-1">
              <div className="h-full w-full rounded-full bg-indigo-600 flex items-center justify-center font-extrabold text-white text-2xl uppercase shadow-md">
                {user.firstName[0]}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-14 p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-sm text-slate-500">{user.email}</p>
            </div>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                user.active
                  ? 'bg-emerald-100 text-emerald-850 dark:bg-emerald-950/40 dark:text-emerald-350'
                  : 'bg-slate-100 text-slate-805 dark:bg-slate-750 dark:text-slate-400'
              }`}
            >
              {user.active ? '● Active' : '○ Inactive'}
            </span>
          </div>

          <hr className="border-slate-100 dark:border-slate-700/60" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Operational Role</span>
              <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                {user.role.toLowerCase().replace('_', ' ')}
              </p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account Reference ID</span>
              <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400 select-all">{user.id}</p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Provisioned Date</span>
              <p className="mt-1 text-slate-650 dark:text-slate-300">
                {new Date(user.createdAt).toLocaleString()}
              </p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Last Activity Date</span>
              <p className="mt-1 text-slate-650 dark:text-slate-300">
                {new Date(user.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
