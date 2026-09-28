import React, { useState, useEffect } from 'react';
import {
  User,
  KeyRound,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Camera,
  Lock,
  Phone,
  Mail,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'profile' | 'password';
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'profile',
}) => {
  const { user, refreshUser, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>(defaultTab);

  // Profile Form States
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState(user?.avatar || PRESET_AVATARS[0]);
  const [showCustomAvatarInput, setShowCustomAvatarInput] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');

  // Password Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Feedback States
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset or sync state when opened or user/tab changes
  useEffect(() => {
    if (isOpen && user) {
      setActiveTab(defaultTab);
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setAvatar(user.avatar || PRESET_AVATARS[0]);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMsg(null);
      setSuccessMsg(null);
      setShowCustomAvatarInput(false);
      setCustomAvatarUrl('');
    }
  }, [isOpen, defaultTab, user]);

  if (!isOpen || !user) return null;

  // Handle Profile Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Full Name is required');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Email address is required');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      await api.auth.updateProfile(user.id, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        avatar: avatar.trim(),
      });

      await refreshUser();
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Handle Change / Reset Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!newPassword || newPassword.trim().length < 4) {
      setErrorMsg('New password must be at least 4 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirmation password do not match.');
      return;
    }

    try {
      setLoading(true);

      // If user provided current password, verify via changePassword;
      // If current password is left blank (forgot password/quick reset mode), use resetPassword
      if (currentPassword.trim()) {
        await api.auth.changePassword(user.id, currentPassword.trim(), newPassword.trim());
      } else {
        await api.auth.resetPassword(user.id, newPassword.trim());
      }

      await refreshUser();
      setSuccessMsg('Password has been changed successfully! Your new password is active.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Password update failed. Please check your current password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-600/90 text-white flex items-center justify-center shadow-xs shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide truncate">
                My Account Settings
              </h2>
              <p className="text-[11px] text-slate-300">
                Manage profile info & account security
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                isAdmin
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {user.role}
            </span>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-4 pt-2 gap-2 text-xs font-semibold shrink-0">
          <button
            onClick={() => {
              setActiveTab('profile');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`pb-2.5 px-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('password');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`pb-2.5 px-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'password'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Reset Password</span>
          </button>
        </div>

        {/* Feedback Alert Banners */}
        {successMsg && (
          <div className="mx-4 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button
              onClick={() => setSuccessMsg(null)}
              className="text-emerald-500 hover:text-emerald-700 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mx-4 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab 1: Edit Profile Content */}
        {activeTab === 'profile' && (
          <form onSubmit={handleUpdateProfile} className="p-4 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar">
            {/* Avatar Section */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Profile Avatar
              </label>
              <div className="flex items-center gap-3.5 mb-3">
                <img
                  src={avatar}
                  alt={name}
                  className="w-14 h-14 rounded-2xl object-cover ring-2 ring-blue-500/30 shadow-xs shrink-0"
                />
                <div>
                  <p className="text-xs font-bold text-slate-800">{name || 'User Profile'}</p>
                  <p className="text-[11px] text-slate-400 capitalize">{user.role} Account</p>
                  <button
                    type="button"
                    onClick={() => setShowCustomAvatarInput(!showCustomAvatarInput)}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold mt-1 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Camera className="w-3 h-3" />
                    <span>{showCustomAvatarInput ? 'Hide Custom URL' : 'Use Custom Image URL'}</span>
                  </button>
                </div>
              </div>

              {/* Preset Avatar Selection */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-500 font-medium">Choose a preset avatar:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_AVATARS.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatar(url)}
                      className={`relative rounded-xl overflow-hidden transition-all cursor-pointer ${
                        avatar === url
                          ? 'ring-3 ring-blue-600 scale-105 shadow-sm'
                          : 'opacity-70 hover:opacity-100 hover:scale-105'
                      }`}
                    >
                      <img src={url} alt={`Preset ${idx + 1}`} className="w-9 h-9 object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Image URL Field */}
              {showCustomAvatarInput && (
                <div className="mt-2.5 flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/photo.jpg"
                    value={customAvatarUrl}
                    onChange={e => setCustomAvatarUrl(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customAvatarUrl.trim()) {
                        setAvatar(customAvatarUrl.trim());
                        setCustomAvatarUrl('');
                        setShowCustomAvatarInput(false);
                      }
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer shrink-0"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>

            {/* Profile Fields */}
            <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-hidden font-medium text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Official Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="user@smartbill.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-hidden font-medium text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-hidden font-medium text-slate-800 font-mono"
                  />
                </div>
              </div>

              {/* Role Info Box */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2.5">
                {isAdmin ? (
                  <ShieldCheck className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                )}
                <div>
                  <span className="font-bold text-slate-800 text-[11px] block">
                    Account Role: {user.role.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-slate-500 leading-tight">
                    {isAdmin
                      ? 'Full administrative control over settings, users, catalog, invoices, and financial reports.'
                      : 'Standard staff operator permissions for POS checkout, customer directory, and inventory entries.'}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Profile Changes</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Reset / Change Password Content */}
        {activeTab === 'password' && (
          <form onSubmit={handleChangePassword} className="p-4 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar">
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold mb-0.5">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                <span>Security Notice</span>
              </div>
              <p className="text-[11px] text-blue-800">
                You can change your password anytime. If this is a demo environment or you forgot your password, you can directly specify and confirm a new password below.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              {/* Current Password Field */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Current Password (Optional if performing direct reset)
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password (default: admin123 / staff123)"
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-hidden text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password Field */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-hidden text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Must be minimum 6 characters long
                </span>
              </div>

              {/* Confirm New Password Field */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-type your new password"
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-hidden text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <KeyRound className="w-3.5 h-3.5" />
                <span>Save New Password</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
