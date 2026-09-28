import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  FileText,
  Package,
  Layers,
  Users,
  Boxes,
  CreditCard,
  BarChart3,
  Bell,
  UserCheck,
  History,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type TabType =
  | 'dashboard'
  | 'billing'
  | 'invoices'
  | 'products'
  | 'categories'
  | 'customers'
  | 'inventory'
  | 'payments'
  | 'reports'
  | 'notifications'
  | 'users'
  | 'audit'
  | 'settings';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  unreadNotifsCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  unreadNotifsCount,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { user, isAdmin, logout, switchUserRole } = useAuth();

  const navItems: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }>; adminOnly?: boolean; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'billing', label: 'POS Billing', icon: Receipt },
    { id: 'invoices', label: 'Invoices & Sales', icon: FileText },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'categories', label: 'Categories', icon: Layers },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'inventory', label: 'Inventory & Stock', icon: Boxes },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifsCount },
    { id: 'users', label: 'User Management', icon: UserCheck, adminOnly: true },
    { id: 'audit', label: 'Audit Logs', icon: History, adminOnly: true },
    { id: 'settings', label: 'Business Settings', icon: Settings, adminOnly: true },
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
                POS & Inventory <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
              </span>
            </div>
          )}
        </div>
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List - with min-h-0 and smooth scrolling */}
      <div className="flex-1 min-h-0 py-2.5 px-2 space-y-0.5 overflow-y-auto custom-scrollbar overscroll-contain">
        {navItems.map(item => {
          if (item.adminOnly && !isAdmin) return null;
          const isActive = currentTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all group relative ${
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

              {/* Unread or Admin indicators */}
              {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white shrink-0">
                  {item.badge}
                </span>
              )}
              {!isCollapsed && item.adminOnly && (
                <span className="px-1.5 py-0.2 text-[9px] uppercase tracking-wider font-semibold rounded bg-slate-800 text-amber-400 shrink-0 border border-amber-500/20">
                  Admin
                </span>
              )}

              {/* Collapsed dot badge */}
              {isCollapsed && item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-slate-900" />
              )}
            </button>
          );
        })}
      </div>

      {/* User Info & Role Switcher Footer - always shrink-0 and pinned at bottom */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 shrink-0">
        {!isCollapsed ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&auto=format&fit=crop&q=80'}
                alt={user?.name}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-500/30 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-100 truncate">{user?.name}</p>
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

            {/* Quick Role Toggle for testing */}
            <div className="flex items-center justify-between gap-1 text-[11px] text-slate-400 px-1 pt-1">
              <span>Demo Role:</span>
              <button
                onClick={() => switchUserRole(isAdmin ? 'staff' : 'admin')}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 transition-colors font-medium border border-slate-700"
                title="Switch between Admin and Staff for testing"
              >
                <Sparkles className="w-3 h-3" />
                Switch to {isAdmin ? 'Staff' : 'Admin'}
              </button>
            </div>

            <button
              onClick={() => logout()}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&auto=format&fit=crop&q=80'}
              alt={user?.name}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/30"
              title={`${user?.name} (${user?.role})`}
            />
            <button
              onClick={() => logout()}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
