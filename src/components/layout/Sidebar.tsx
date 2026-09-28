import React, { useState } from 'react';
import {
  LayoutDashboard,
  Receipt,
  FileText,
  BarChart3,
  UserCheck,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  User as UserIcon,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ProfileModal } from '../profile/ProfileModal';

export type TabType =
  | 'dashboard'
  | 'billing'
  | 'invoices'
  | 'reports'
  | 'users'
  | 'settings';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { user, isAdmin, logout } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<'profile' | 'password'>('profile');

  // Simple sidebar navigation list
  const navItems: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }>; adminOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'billing', label: 'New Bill', icon: Receipt },
    { id: 'invoices', label: 'Sales History', icon: FileText },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: UserCheck, adminOnly: true },
    { id: 'settings', label: 'Settings', icon: Settings, adminOnly: true },
  ];

  return (
    <aside
      className={`relative flex flex-col h-full max-h-screen bg-slate-900 text-slate-200 transition-all duration-300 ease-in-out border-r border-slate-800 select-none z-30 shrink-0 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-400 text-white font-bold text-lg shadow-lg shadow-blue-500/20 shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col leading-tight truncate">
              <span className="font-extrabold text-base tracking-wide bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                SMART<span className="text-cyan-400">BILL</span>
              </span>
              <span className="text-[10px] text-slate-400 tracking-wider font-medium uppercase flex items-center gap-1">
                Billing & Invoicing <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
              </span>
            </div>
          )}
        </div>
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 min-h-0 py-3 px-2 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map(item => {
          if (item.adminOnly && !isAdmin) return null;
          const isActive = currentTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all group relative cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon
                className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />
              {!isCollapsed && (
                <span className="truncate flex-1 text-left">{item.label}</span>
              )}

              {!isCollapsed && item.adminOnly && (
                <span className="px-1.5 py-0.2 text-[9px] uppercase tracking-wider font-semibold rounded bg-slate-800 text-amber-400 shrink-0 border border-amber-500/20">
                  Admin
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* User Info & Profile / Password Controls Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 shrink-0">
        {!isCollapsed ? (
          <div className="space-y-2">
            {/* Interactive User Card */}
            <div
              onClick={() => {
                setProfileModalTab('profile');
                setIsProfileModalOpen(true);
              }}
              className="flex items-center gap-3 p-2 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/40 hover:border-slate-600 transition-all cursor-pointer group"
              title="Click to manage profile & password"
            >
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&auto=format&fit=crop&q=80'}
                alt={user?.name}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-500/30 group-hover:ring-blue-400/60 shrink-0 transition-all"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-100 group-hover:text-blue-400 transition-colors truncate">
                  {user?.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                      isAdmin
                        ? 'bg-purple-950/80 text-purple-300 border border-purple-800/50'
                        : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50'
                    }`}
                  >
                    {isAdmin ? <ShieldCheck className="w-3 h-3 mr-0.5 inline" /> : <ShieldAlert className="w-3 h-3 mr-0.5 inline" />}
                    {user?.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile & Password Action Buttons */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setProfileModalTab('profile');
                  setIsProfileModalOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white text-[11px] font-medium transition-all border border-slate-700/60 hover:border-blue-500/40 cursor-pointer"
                title="Edit Account Profile"
              >
                <UserIcon className="w-3 h-3 text-blue-400" />
                <span>Edit Profile</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setProfileModalTab('password');
                  setIsProfileModalOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white text-[11px] font-medium transition-all border border-slate-700/60 hover:border-amber-500/40 cursor-pointer"
                title="Reset / Change Password"
              >
                <KeyRound className="w-3 h-3 text-amber-400" />
                <span>Reset Pass</span>
              </button>
            </div>

            {/* Logout */}
            <button
              onClick={() => logout()}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setProfileModalTab('profile');
                setIsProfileModalOpen(true);
              }}
              className="relative group cursor-pointer"
              title={`${user?.name} (${user?.role}) - Edit Profile`}
            >
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&auto=format&fit=crop&q=80'}
                alt={user?.name}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/30 group-hover:ring-blue-400 transition-all"
              />
              <span
                className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ring-2 ring-slate-900 ${
                  isAdmin ? 'bg-purple-500' : 'bg-emerald-500'
                }`}
              />
            </button>

            <button
              type="button"
              onClick={() => {
                setProfileModalTab('profile');
                setIsProfileModalOpen(true);
              }}
              className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Edit Profile"
            >
              <UserIcon className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setProfileModalTab('password');
                setIsProfileModalOpen(true);
              }}
              className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Reset Password"
            >
              <KeyRound className="w-4 h-4" />
            </button>

            <button
              onClick={() => logout()}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Profile & Password Reset Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        defaultTab={profileModalTab}
      />
    </aside>
  );
};
