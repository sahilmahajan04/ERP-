'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getCurrentUser } from '../../../lib/api';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  active: boolean;
  createdAt: string;
}

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Edit details form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Alert message states
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [pwdErrorMsg, setPwdErrorMsg] = useState('');
  const [pwdSuccessMsg, setPwdSuccessMsg] = useState('');

  const { data: profile, isLoading, error } = useQuery<UserProfile>({
    queryKey: ['myProfile'],
    queryFn: async () => {
      const data = await api.get('/users/profile/me');
      setFirstName(data.firstName);
      setLastName(data.lastName);
      setEmail(data.email);
      return data;
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (updatedData: Partial<UserProfile>) =>
      api.put(`/users/${profile?.id}`, updatedData),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      setIsEditing(false);
      setSuccessMsg('Profile updated successfully!');
      setErrorMsg('');
      
      // Update local storage user details if needed
      const currentLocalUser = getCurrentUser();
      if (currentLocalUser) {
        localStorage.setItem(
          'user',
          JSON.stringify({
            ...currentLocalUser,
            firstName: res.user.firstName,
            lastName: res.user.lastName,
            email: res.user.email,
          })
        );
      }
      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to update profile');
      setSuccessMsg('');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (passwordData: any) =>
      api.patch(`/users/${profile?.id}/password`, passwordData),
    onSuccess: () => {
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwdErrorMsg('');
      setPwdSuccessMsg('Password changed successfully! Please log in again if required by the system.');
      setTimeout(() => setPwdSuccessMsg(''), 4000);
    },
    onError: (err: any) => {
      setPwdErrorMsg(err.message || 'Failed to change password');
    },
  });

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email) {
      setErrorMsg('All fields are required');
      return;
    }
    updateProfileMutation.mutate({ firstName, lastName, email });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwdErrorMsg('All fields are required');
      return;
    }
    if (newPassword.length < 6) {
      setPwdErrorMsg('New password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdErrorMsg('Passwords do not match');
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-8 text-center bg-red-950/20 border border-red-900 rounded-2xl text-red-400">
        ❌ Failed to load profile. Please try logging in again.
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          My Account Settings
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Manage your personal details, verify permissions, and keep your credentials secure.
        </p>
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

      {pwdSuccessMsg && (
        <div className="p-4 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-500 rounded-xl text-emerald-800 dark:text-emerald-300 text-sm">
          {pwdSuccessMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Card: Account Card */}
        <div className="md:col-span-1 p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm text-center flex flex-col items-center justify-center space-y-4">
          <div className="h-24 w-24 rounded-full bg-indigo-600 flex items-center justify-center font-extrabold text-white text-4xl shadow-md uppercase">
            {profile.firstName[0]}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {profile.firstName} {profile.lastName}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{profile.email}</p>
          </div>
          <span className="px-3.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 capitalize">
            {profile.role.toLowerCase().replace('_', ' ')}
          </span>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            Member since {new Date(profile.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Right Card: Profile Form */}
        <div className="md:col-span-2 p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Personal Information
            </h3>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-xs font-semibold bg-indigo-50 dark:bg-slate-700 text-indigo-650 dark:text-indigo-400 hover:opacity-90 rounded-xl transition-all"
              >
                ✏️ Edit Profile
              </button>
            )}
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-550 dark:text-slate-400">First Name</label>
                <input
                  type="text"
                  required
                  disabled={!isEditing}
                  className="mt-1.5 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-550"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-550 dark:text-slate-400">Last Name</label>
                <input
                  type="text"
                  required
                  disabled={!isEditing}
                  className="mt-1.5 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-550"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-550 dark:text-slate-400">Email Address</label>
              <input
                type="email"
                required
                disabled={!isEditing}
                className="mt-1.5 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-550"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {isEditing && (
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setFirstName(profile.firstName);
                    setLastName(profile.lastName);
                    setEmail(profile.email);
                    setErrorMsg('');
                  }}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="px-4 py-2 text-white font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl text-sm transition-all"
                >
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </form>

          {!isEditing && (
            <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Security & Password</h4>
                <p className="text-xs text-slate-500">Update password to keep your account secure.</p>
              </div>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-650 rounded-xl transition-all"
              >
                🔐 Change Password
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md p-6 rounded-2xl shadow-xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Change Password</h3>
              <p className="text-xs text-slate-500">Verify identity and choose a secure password.</p>
            </div>

            {pwdErrorMsg && (
              <div className="p-3 bg-rose-100 dark:bg-rose-950/40 border border-rose-500 rounded-lg text-rose-800 dark:text-rose-300 text-xs">
                {pwdErrorMsg}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Current Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Confirm New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Repeat new password"
                  className="mt-1 w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-250 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPwdErrorMsg('');
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
