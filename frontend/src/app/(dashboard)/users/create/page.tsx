'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, getCurrentUser } from '../../../../lib/api';

const ROLES = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'SALES_USER', label: 'Sales User' },
  { value: 'PURCHASE_USER', label: 'Purchase User' },
  { value: 'MANUFACTURING_USER', label: 'Manufacturing User' },
  { value: 'INVENTORY_MANAGER', label: 'Inventory Manager' },
  { value: 'BUSINESS_OWNER', label: 'Business Owner' },
];

export default function CreateUserPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = getCurrentUser();

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('SALES_USER');

  // Error/Success state
  const [errorMsg, setErrorMsg] = useState('');



  const createUserMutation = useMutation({
    mutationFn: (userData: any) => api.post('/users', userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usersList'] });
      router.push('/users');
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to create user account');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password || !role) {
      setErrorMsg('All fields are required');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long');
      return;
    }

    createUserMutation.mutate({
      firstName,
      lastName,
      email,
      password,
      role,
    });
  };
  // Access check
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="text-6xl">🔒</div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Access Denied</h1>
        <p className="text-slate-500 max-w-md">
          You do not have the required permissions to view this module. Only administrators can manage system users.
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

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/users" className="hover:text-indigo-600 transition-colors">
          Users
        </Link>
        <span>/</span>
        <span>Create User</span>
      </div>

      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Create User Account</h1>
        <p className="text-slate-500 text-sm">Provision a new account and assign their operational security role.</p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-100 dark:bg-rose-950/40 border border-rose-500 rounded-xl text-rose-800 dark:text-rose-300 text-sm">
          {errorMsg}
        </div>
      )}

      <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-555">First Name</label>
              <input
                type="text"
                required
                placeholder="e.g. John"
                className="mt-1.5 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-555">Last Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Doe"
                className="mt-1.5 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-555">Email Address</label>
            <input
              type="email"
              required
              placeholder="user@shivfurniture.com"
              className="mt-1.5 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-555">Password</label>
            <input
              type="password"
              required
              placeholder="Minimum 6 characters"
              className="mt-1.5 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-555">System Role</label>
            <select
              className="mt-1.5 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100 dark:border-slate-700">
            <Link
              href="/users"
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={createUserMutation.isPending}
              className="px-4 py-2 text-white font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl text-sm transition-all shadow"
            >
              {createUserMutation.isPending ? 'Provisioning...' : 'Provision Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
