'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getCurrentUser } from '../../../lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  active: boolean;
}

interface UserListResponse {
  users: User[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const ROLES = [
  'ADMIN',
  'SALES_USER',
  'PURCHASE_USER',
  'MANUFACTURING_USER',
  'INVENTORY_MANAGER',
  'BUSINESS_OWNER',
];

export default function UsersPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const currentUser = getCurrentUser();

  // Search & Filter States
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Active Modals
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);

  // Form states inside modals
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  // Messages
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');



  // Fetch Users List
  const { data, isLoading, isError } = useQuery<UserListResponse>({
    queryKey: ['usersList', search, roleFilter, statusFilter, page],
    queryFn: () =>
      api.get('/users', {
        params: {
          search,
          role: roleFilter,
          status: statusFilter,
          page: String(page),
          limit: '10',
        },
      }),
  });

  // Toggle active status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch(`/users/${id}/status`, { active }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['usersList'] });
      setSuccessMsg(res.message || 'Status updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to update user status');
      setTimeout(() => setErrorMsg(''), 4000);
    },
  });

  // Assign Role Mutation
  const assignRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.patch(`/users/${id}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usersList'] });
      setShowRoleModal(false);
      setSelectedUser(null);
      setSuccessMsg('User role updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to update user role');
    },
  });

  // Change Password Mutation
  const changePasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: any }) =>
      api.patch(`/users/${id}/password`, { newPassword: password }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usersList'] });
      setShowPasswordModal(false);
      setSelectedUser(null);
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMsg('User password updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to update user password');
    },
  });

  const handleToggleStatus = (user: User) => {
    const actionText = user.active ? 'deactivate' : 'activate';
    if (confirm(`Are you sure you want to ${actionText} user ${user.firstName} ${user.lastName}?`)) {
      toggleStatusMutation.mutate({ id: user.id, active: !user.active });
    }
  };

  const handleRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !selectedRole) return;
    assignRoleMutation.mutate({ id: selectedUser.id, role: selectedRole });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    changePasswordMutation.mutate({ id: selectedUser.id, password: newPassword });
  };
  // Redirect/Deny if user is not admin
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="text-6xl">🔒</div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Access Denied</h1>
        <p className="text-slate-550 max-w-md">
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">User Accounts</h1>
          <p className="text-slate-500 text-sm">Create, edit, assign permissions, and manage all system access.</p>
        </div>

        <Link
          href="/users/create"
          className="px-4 py-2.5 text-sm font-medium text-white bg-indigo-650 hover:bg-indigo-700 rounded-xl transition-all shadow shrink-0 flex items-center gap-1.5"
        >
          ➕ Create User
        </Link>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-500 rounded-xl text-emerald-800 dark:text-emerald-300 text-sm">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-100 dark:bg-rose-950/40 border border-rose-500 rounded-xl text-rose-800 dark:text-rose-300 text-sm">
          {errorMsg}
        </div>
      )}

      {/* Search and Filters panel */}
      <div className="p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="🔍 Search users by name or email..."
            className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="w-full md:w-48">
          <select
            className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.toLowerCase().replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-48">
          <select
            className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 animate-pulse">Loading system users...</div>
        ) : isError || !data ? (
          <div className="p-8 text-center text-red-500">❌ Error retrieving users.</div>
        ) : data.users.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No matching user records found.</div>
        ) : (
          <div className="overflow-x-auto font-sans">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-750 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {data.users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                    <td className="px-6 py-4 font-semibold text-slate-850 dark:text-slate-250">
                      <Link href={`/users/${user.id}`} className="hover:text-indigo-600 transition-colors flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 font-bold flex items-center justify-center text-sm uppercase">
                          {user.firstName[0]}
                        </div>
                        <span>
                          {user.firstName} {user.lastName}
                        </span>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-[10px] font-bold rounded bg-slate-100 text-slate-750 dark:bg-slate-700 dark:text-slate-200 capitalize">
                        {user.role.toLowerCase().replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          user.active
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-350'
                            : 'bg-slate-100 text-slate-800 dark:bg-slate-750 dark:text-slate-400'
                        }`}
                      >
                        {user.active ? '● Active' : '○ Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center space-x-1">
                      <Link
                        href={`/users/${user.id}`}
                        className="px-2 py-1 text-xs text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded font-medium transition-all"
                      >
                        View
                      </Link>
                      <Link
                        href={`/users/${user.id}/edit`}
                        className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/30 rounded font-medium transition-all"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setSelectedRole(user.role);
                          setShowRoleModal(true);
                        }}
                        className="px-2 py-1 text-xs text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded font-medium transition-all"
                      >
                        Role
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowPasswordModal(true);
                        }}
                        className="px-2 py-1 text-xs text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950/20 rounded font-medium transition-all"
                      >
                        Password
                      </button>
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={`px-2 py-1 text-xs rounded font-medium transition-all ${
                          user.active
                            ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20'
                            : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                        }`}
                      >
                        {user.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
            <span className="text-xs text-slate-500">
              Showing page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} users total)
            </span>
            <div className="flex space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold disabled:opacity-40 transition-all hover:bg-white dark:hover:bg-slate-800"
              >
                Previous
              </button>
              <button
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold disabled:opacity-40 transition-all hover:bg-white dark:hover:bg-slate-800"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Assign Role Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm p-6 rounded-2xl shadow-xl space-y-6">
            <div>
              <h3 className="text-lg font-bold">Change User Role</h3>
              <p className="text-xs text-slate-500">
                Updating role for <span className="font-semibold">{selectedUser.firstName} {selectedUser.lastName}</span>
              </p>
            </div>

            <form onSubmit={handleRoleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Select Role</label>
                <select
                  required
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.toLowerCase().replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowRoleModal(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignRoleMutation.isPending}
                  className="px-4 py-2 text-white font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl text-sm transition-all"
                >
                  {assignRoleMutation.isPending ? 'Saving...' : 'Update Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md p-6 rounded-2xl shadow-xl space-y-6">
            <div>
              <h3 className="text-lg font-bold">Reset Password</h3>
              <p className="text-xs text-slate-500">
                Change password for <span className="font-semibold">{selectedUser.firstName} {selectedUser.lastName}</span>
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  className="mt-1.5 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm focus:outline-none"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Confirm Password</label>
                <input
                  type="password"
                  required
                  placeholder="Repeat new password"
                  className="mt-1.5 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm focus:outline-none"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setSelectedUser(null);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="px-4 py-2 text-white font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl text-sm transition-all"
                >
                  {changePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
