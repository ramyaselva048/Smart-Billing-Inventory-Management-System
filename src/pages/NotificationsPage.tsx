import React, { useState } from 'react';
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  Clock,
  Receipt,
  Boxes,
  ArrowRight,
  ShieldAlert,
  Trash2,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { Notification } from '../types';
import { api } from '../services/api';
import { formatDateTime } from '../utils/formatters';

interface NotificationsPageProps {
  notifications: Notification[];
  onRefreshNotifications: () => void;
  onNavigateTab: (tab: any) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  notifications,
  onRefreshNotifications,
  onNavigateTab,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'stock' | 'payment'>('all');

  const handleMarkAllRead = async () => {
    await api.notifications.markAllAsRead();
    onRefreshNotifications();
  };

  const handleNotificationClick = async (notif: Notification) => {
    await api.notifications.markAsRead(notif.id);
    onRefreshNotifications();
    if (notif.linkTab) {
      onNavigateTab(notif.linkTab);
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await api.notifications.delete(id);
    onRefreshNotifications();
  };

  const handleClearAll = async () => {
    await api.notifications.clearAll();
    onRefreshNotifications();
  };

  const handleClearRead = async () => {
    await api.notifications.clearRead();
    onRefreshNotifications();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = notifications.filter(n => {
    if (filterType === 'unread') return !n.read;
    if (filterType === 'stock') return n.type === 'low_stock' || n.type === 'out_of_stock';
    if (filterType === 'payment') return n.type === 'payment_pending' || n.type === 'payment_received';
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">System Alerts & Notifications</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time low stock triggers, customer credit limits, and billing updates
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCheck className="w-4 h-4 text-blue-600" />
              Mark All Read ({unreadCount})
            </button>
          )}

          {notifications.some(n => n.read) && (
            <button
              onClick={handleClearRead}
              className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              Clear Read
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3.5 py-2 border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto text-xs">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
            filterType === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilterType('unread')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
            filterType === 'unread'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setFilterType('stock')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
            filterType === 'stock'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Stock Alerts
        </button>
        <button
          onClick={() => setFilterType('payment')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
            filterType === 'payment'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Payment Alerts
        </button>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <Bell className="w-8 h-8 text-slate-300" />
            <span>No notifications match this filter.</span>
          </div>
        ) : (
          filteredNotifications.map(n => {
            const isUnread = !n.read;
            return (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-4 group ${
                  isUnread ? 'bg-blue-50/30' : ''
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    n.type === 'out_of_stock'
                      ? 'bg-rose-100 text-rose-600'
                      : n.type === 'low_stock'
                      ? 'bg-amber-100 text-amber-600'
                      : n.type === 'payment_pending'
                      ? 'bg-purple-100 text-purple-600'
                      : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  {n.type === 'out_of_stock' ? (
                    <ShieldAlert className="w-5 h-5" />
                  ) : n.type === 'low_stock' ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : n.type === 'payment_pending' ? (
                    <Clock className="w-5 h-5" />
                  ) : (
                    <Receipt className="w-5 h-5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-xs font-bold ${isUnread ? 'text-slate-900' : 'text-slate-700'}`}>
                      {n.title}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatDateTime(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                  {n.linkTab && (
                    <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md transition-colors">
                      <span>Jump to {n.linkTab.toUpperCase()}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isUnread && (
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0 ring-2 ring-blue-100" />
                  )}
                  {/* Delete / Dismiss button */}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteNotification(e, n.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
                    title="Dismiss notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
