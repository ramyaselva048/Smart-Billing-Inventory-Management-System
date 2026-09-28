import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  FileSpreadsheet,
  ShieldCheck,
  Tag,
  Clock,
  User,
  Activity
} from 'lucide-react';
import { AuditLog } from '../types';
import { api } from '../services/api';
import { formatDateTime, exportToCSV } from '../utils/formatters';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const data = await api.audit.getAll();
      setLogs(data);
    } catch (err) {
      console.error('Error loading audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Log ID', 'Timestamp', 'User', 'Role', 'Action', 'Module', 'Description'];
    const rows = filteredLogs.map(l => [
      l.id,
      formatDateTime(l.timestamp),
      l.userName,
      l.role,
      l.action,
      l.module,
      l.description
    ]);
    exportToCSV(`SmartBill_Audit_Trail_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        l.userName.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q);

      const matchesModule = moduleFilter === 'all' || l.module === moduleFilter;
      return matchesSearch && matchesModule;
    });
  }, [logs, search, moduleFilter]);

  const MODULE_COLORS: Record<string, string> = {
    auth: 'bg-slate-100 text-slate-800',
    product: 'bg-blue-100 text-blue-800',
    category: 'bg-indigo-100 text-indigo-800',
    customer: 'bg-emerald-100 text-emerald-800',
    invoice: 'bg-purple-100 text-purple-800',
    payment: 'bg-teal-100 text-teal-800',
    inventory: 'bg-amber-100 text-amber-800',
    user: 'bg-rose-100 text-rose-800',
    settings: 'bg-cyan-100 text-cyan-800',
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">System Audit Trail</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable regulatory tracking of operations, billing events, inventory adjustments, and auth records
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          Export Audit Trail
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by user, action or description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <div className="w-full sm:w-auto">
          <select
            value={moduleFilter}
            onChange={e => setModuleFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
          >
            <option value="all">All Modules</option>
            <option value="invoice">Invoices & Billing</option>
            <option value="product">Products</option>
            <option value="inventory">Inventory & Stock</option>
            <option value="payment">Payments</option>
            <option value="customer">Customers</option>
            <option value="category">Categories</option>
            <option value="user">Users</option>
            <option value="settings">Settings</option>
            <option value="auth">Authentication</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-4 py-3">User & Role</th>
                <th className="px-4 py-3">Module</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-5 py-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                    Loading audit trail...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                    No audit records matching query.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                      {formatDateTime(l.timestamp)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">{l.userName}</div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        Role: {l.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          MODULE_COLORS[l.module] || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {l.module}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-800">
                      {l.action}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 max-w-md">
                      {l.description}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
