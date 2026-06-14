'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, getCurrentUser } from '../../../../../lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  active: boolean;
}

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const currentUser = getCurrentUser();

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  // Error/Success state
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch current user details
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ['userDetails', id],
    queryFn: async () => {
      const data = await api.get(`/users/${id}`);
      setFirstName(data.firstName);
      setLastName(data.lastName);
      setEmail(data.email);
      return data;
    },
    enabled: !!id,
  });



  const editUserMutation = useMutation({
    mutationFn: (userData: any) => api.put(`/users/${id}`, userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userDetails', id] });
      queryClient.invalidateQueries({ queryKey: ['usersList'] });
      router.push(`/users/${id}`);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to update user account');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email) {
      setErrorMsg('All fields are required');
      return;
    }
    editUserMutation.mutate({ firstName, lastName, email });
  };

  // Access check: Only Admin is allowed to access this edit page
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="text-6xl">🔒</div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Access Denied</h1>
        <p className="text-slate-500 max-w-md">
          You do not have the required permissions to modify user accounts. Only administrators can perform this action.
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
        ❌ Failed to fetch user details.
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
        <Link href={`/users/${id}`} className="hover:text-indigo-600 transition-colors">
          {user.firstName} {user.lastName}
        </Link>
        <span>/</span>
        <span>Edit</span>
      </div>

      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Modify User Profile</h1>
        <p className="text-slate-500 text-sm">Update profile contact coordinates and identification names.</p>
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
              className="mt-1.5 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100 dark:border-slate-700">
            <Link
              href={`/users/${id}`}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={editUserMutation.isPending}
              className="px-4 py-2 text-white font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl text-sm transition-all shadow"
            >
              {editUserMutation.isPending ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
