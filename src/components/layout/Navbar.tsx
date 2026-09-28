import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Clock,
  ChevronDown,
  Menu,
  X,
  ArrowRight,
  User as UserIcon,
  KeyRound,
  LogOut,
  Receipt,
  Lock,
  Database
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Invoice } from '../../types';
import { api, DatabaseStatus } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { TabType } from './Sidebar';
import { ProfileModal } from '../profile/ProfileModal';

interface RouteItem {
  tab: TabType;
  title: string;
  subtitle: string;
  keywords: string[];
}

const SYSTEM_ROUTES: RouteItem[] = [
  { tab: 'dashboard', title: 'Dashboard', subtitle: 'Sales summary & revenue statistics', keywords: ['dashboard', 'home', 'stats', 'sales', 'bills'] },
  { tab: 'billing', title: 'New Bill', subtitle: 'Create Bill & POS checkout', keywords: ['billing', 'new bill', 'pos', 'create bill', 'counter'] },
  { tab: 'invoices', title: 'Sales History', subtitle: 'View, search & print invoices', keywords: ['sales history', 'invoices', 'bills', 'orders', 'history'] },
  { tab: 'reports', title: 'Reports', subtitle: 'Daily & monthly revenue reports', keywords: ['reports', 'analytics', 'revenue', 'summary', 'charts'] },
  { tab: 'users', title: 'User Management', subtitle: 'Staff and administrator accounts', keywords: ['users', 'staff', 'admin', 'accounts'] },
  { tab: 'settings', title: 'Business Settings', subtitle: 'Company information & GST configuration', keywords: ['settings', 'business', 'company', 'gst'] },
];

interface NavbarProps {
  onOpenNewBill: () => void;
  onNavigateTab: (tab: TabType, params?: { search?: string }) => void;
  onSelectInvoice?: (invoice: Invoice) => void;
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenNewBill,
  onNavigateTab,
  onSelectInvoice,
  onToggleMobileMenu,
}) => {
  const { user, isAdmin, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<'profile' | 'password'>('profile');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    routes: RouteItem[];
    invoices: Invoice[];
  }>({ routes: [], invoices: [] });

  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Live Clock
  const [timeStr, setTimeStr] = useState('');
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);

  useEffect(() => {
    const checkDb = async () => {
      try {
        const st = await api.database.getStatus();
        setDbStatus(st);
      } catch (e) {
        // silent
      }
    };
    checkDb();
    const dbInterval = setInterval(checkDb, 30000);
    return () => clearInterval(dbInterval);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearching(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search across routes and invoices
  useEffect(() => {
    if (!searchQuery.trim()) {
      setIsSearching(false);
      setSearchResults({ routes: [], invoices: [] });
      return;
    }

    const timer = setTimeout(async () => {
      const q = searchQuery.toLowerCase().trim();

      const matchedRoutes = SYSTEM_ROUTES.filter(r => {
        if (!isAdmin && (r.tab === 'users' || r.tab === 'settings')) {
          return false;
        }
        return (
          r.title.toLowerCase().includes(q) ||
          r.subtitle.toLowerCase().includes(q) ||
          r.keywords.some(k => k.includes(q))
        );
      }).slice(0, 3);

      const allInvoices = await api.invoices.getAll();
      const matchedInvoices = allInvoices.filter(
        i => i.invoiceNumber.toLowerCase().includes(q) || i.paymentMethod.toLowerCase().includes(q)
      ).slice(0, 5);

      setSearchResults({
        routes: matchedRoutes,
        invoices: matchedInvoices,
      });
      setIsSearching(true);
    }, 120);

    return () => clearTimeout(timer);
  }, [searchQuery, isAdmin]);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
      {/* Mobile Toggle & Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
          title="Toggle Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar */}
        <div className="relative flex-1" ref={searchRef}>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search invoice number or pages..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim()) setIsSearching(true);
              }}
              className="w-full pl-9 pr-8 py-2 bg-slate-100 hover:bg-slate-50 focus:bg-white text-xs sm:text-sm text-slate-800 placeholder-slate-400 rounded-xl border border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-hidden font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setIsSearching(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Dropdown */}
          {isSearching && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[70vh] overflow-y-auto p-2 space-y-3 z-50 animate-in fade-in zoom-in-95 duration-100 custom-scrollbar">
              {searchResults.routes.length === 0 && searchResults.invoices.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No matching invoice or page found for "{searchQuery}".
                </div>
              ) : (
                <>
                  {/* Pages */}
                  {searchResults.routes.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                        Pages ({searchResults.routes.length})
                      </div>
                      <div className="space-y-0.5">
                        {searchResults.routes.map(r => (
                          <button
                            key={r.tab}
                            onClick={() => {
                              setIsSearching(false);
                              setSearchQuery('');
                              onNavigateTab(r.tab);
                            }}
                            className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-blue-50 flex items-center justify-between text-xs group cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                                <ArrowRight className="w-3.5 h-3.5" />
                              </span>
                              <div>
                                <span className="font-bold text-slate-800 group-hover:text-blue-700">
                                  {r.title}
                                </span>
                                <span className="block text-[11px] text-slate-400">
                                  {r.subtitle}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              Go →
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Invoices */}
                  {searchResults.invoices.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 border-t border-slate-100 pt-2">
                        Invoices ({searchResults.invoices.length})
                      </div>
                      <div className="space-y-0.5">
                        {searchResults.invoices.map(inv => (
                          <button
                            key={inv.id}
                            onClick={() => {
                              setIsSearching(false);
                              setSearchQuery('');
                              if (onSelectInvoice) onSelectInvoice(inv);
                              else onNavigateTab('invoices', { search: inv.invoiceNumber });
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 flex items-center justify-between text-xs cursor-pointer transition-colors"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-mono font-bold text-blue-600">{inv.invoiceNumber}</span>
                              <span className="ml-2 text-slate-500 font-mono text-[11px]">{formatDate(inv.date)}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                                PAID
                              </span>
                              <span className="font-bold text-slate-900 font-mono">
                                {formatCurrency(inv.grandTotal)}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* New Bill Button */}
        <button
          onClick={onOpenNewBill}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 active:scale-98 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden sm:inline">New Bill</span>
        </button>

        {/* Database Status Indicator */}
        {dbStatus && (
          <div
            className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-all ${
              dbStatus.connected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                : 'bg-amber-50 text-amber-700 border-amber-200/80'
            }`}
            title={
              dbStatus.connected
                ? `TiDB Cloud MySQL Connected (${dbStatus.pingMs}ms latency)\nDatabase: ${dbStatus.database || 'smartbill'}\nHost: ${dbStatus.host}`
                : `Database Offline / Using Local Storage Cache`
            }
          >
            <Database className="w-3.5 h-3.5 shrink-0 opacity-80" />
            <span
              className={`w-2 h-2 rounded-full ${
                dbStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span>{dbStatus.connected ? 'TiDB Cloud' : 'Local Mode'}</span>
          </div>
        )}

        {/* Live Clock */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-lg">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono font-medium">{timeStr}</span>
        </div>

        {/* Lock Screen / Logout Button */}
        <button
          type="button"
          onClick={() => logout()}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200/90 hover:border-rose-200 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
          title="Lock App and return to Login Screen"
        >
          <Lock className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Lock App</span>
        </button>

        {/* User Pill & Account Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 pl-2 py-1 pr-1.5 border-l border-slate-200 hover:bg-slate-50 rounded-xl transition-all cursor-pointer group"
            title="Account Menu"
          >
            <div className="relative">
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&auto=format&fit=crop&q=80'}
                alt={user?.name}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/20 group-hover:ring-blue-500/50 transition-all"
              />
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                  isAdmin ? 'bg-purple-500' : 'bg-emerald-500'
                }`}
              />
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px] group-hover:text-blue-600 transition-colors">
                {user?.name}
              </span>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider ${
                  isAdmin ? 'text-purple-600' : 'text-emerald-600'
                }`}
              >
                {user?.role}
              </span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform ml-0.5 ${
                showUserMenu ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* User Account Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
                <div className="flex items-center gap-3">
                  <img
                    src={user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&auto=format&fit=crop&q=80'}
                    alt={user?.name}
                    className="w-11 h-11 rounded-2xl object-cover ring-2 ring-blue-400/40 shadow-sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate leading-snug">{user?.name}</p>
                    <p className="text-[11px] text-slate-300 font-mono truncate">{user?.email}</p>
                    <span
                      className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isAdmin
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {isAdmin ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                      {user?.role} Account
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-2 space-y-1 bg-white text-xs">
                {/* Edit Profile */}
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    setProfileModalTab('profile');
                    setIsProfileModalOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-slate-50 transition-colors cursor-pointer text-slate-700"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <UserIcon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">Edit Profile</div>
                    <div className="text-[10px] text-slate-400">Name, email, phone & avatar</div>
                  </div>
                </button>

                {/* Reset Password */}
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    setProfileModalTab('password');
                    setIsProfileModalOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-slate-50 transition-colors cursor-pointer text-slate-700"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <KeyRound className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">Reset Password</div>
                    <div className="text-[10px] text-slate-400">Change login password</div>
                  </div>
                </button>

                <div className="my-1 border-t border-slate-100" />

                {/* Sign Out */}
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer font-semibold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile Modal */}
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          defaultTab={profileModalTab}
        />
      </div>
    </header>
  );
};
