import React, { useState, useEffect, useMemo } from 'react';
import {
  UserCheck,
  Plus,
  Search,
  ShieldCheck,
  ShieldAlert,
  Edit,
  Trash2,
  Lock,
  Mail,
  Phone,
  X,
  Power,
  FileSpreadsheet,
  Printer,
  Download
} from 'lucide-react';
import { User, UserRole } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/formatters';
import { exportToCSV, printReport, downloadPDFReport } from '../utils/exportUtils';
import { SearchableSelect } from '../components/common/SearchableSelect';

interface UsersPageProps {
  initialSearch?: string;
}

export const UsersPage: React.FC<UsersPageProps> = ({ initialSearch = '' }) => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);

  const [roleFilter, setRoleFilter] = useState('all');

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('staff');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirm
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.users.getAll();
      setUsers(data);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['User ID', 'Name', 'Email', 'Role', 'Status', 'Phone', 'Created Date'];
    const rows = filteredUsers.map(u => [
      u.id,
      u.name,
      u.email,
      u.role.toUpperCase(),
      u.status.toUpperCase(),
      u.phone || 'N/A',
      formatDate(u.createdAt)
    ]);
    exportToCSV(`SmartBill_Users_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  const handlePrint = () => {
    const headers = ['User ID', 'Name', 'Email', 'Role', 'Status', 'Phone', 'Created Date'];
    const rows = filteredUsers.map(u => [
      u.id,
      u.name,
      u.email,
      u.role.toUpperCase(),
      u.status.toUpperCase(),
      u.phone || 'N/A',
      formatDate(u.createdAt)
    ]);
    printReport(
      'User Accounts & Access Directory',
      `Active system accounts, assigned administrative roles, and permission levels`,
      headers,
      rows,
      [
        { label: 'Total Users', value: String(users.length) },
        { label: 'Administrators', value: String(users.filter(u => u.role === 'admin').length) },
        { label: 'Staff Members', value: String(users.filter(u => u.role === 'staff').length) },
        { label: 'Active Accounts', value: String(users.filter(u => u.status === 'active').length) },
      ]
    );
  };

  const handleDownloadPDF = () => {
    const headers = ['User ID', 'Name', 'Email', 'Role', 'Status', 'Phone', 'Created Date'];
    const rows = filteredUsers.map(u => [
      u.id,
      u.name,
      u.email,
      u.role.toUpperCase(),
      u.status.toUpperCase(),
      u.phone || 'N/A',
      formatDate(u.createdAt)
    ]);
    downloadPDFReport(
      'User Accounts & Access Directory',
      `Active system accounts, assigned administrative roles, and permission levels`,
      headers,
      rows,
      [
        { label: 'Total Users', value: String(users.length) },
        { label: 'Administrators', value: String(users.filter(u => u.role === 'admin').length) },
        { label: 'Staff Members', value: String(users.filter(u => u.role === 'staff').length) },
        { label: 'Active Accounts', value: String(users.filter(u => u.status === 'active').length) },
      ],
      'users_directory_report'
    );
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPhone('');
    setRole('staff');
    setStatus('active');
    setPassword('');
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setPhone(u.phone || '');
    setRole(u.role);
    setStatus(u.status);
    setPassword('');
    setFormError(null);
    setModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Full name is required');
      return;
    }
    if (!email.trim()) {
      setFormError('Email address is required');
      return;
    }
    if (!editingUser && !password.trim()) {
      setFormError('Password is required for new users');
      return;
    }

    try {
      if (editingUser) {
        await api.users.update(editingUser.id, {
          name,
          email,
          phone,
          role,
          status,
          ...(password.trim() ? { password: password.trim() } : {}),
        });
      } else {
        await api.users.create({
          name,
          email,
          phone,
          role,
          status,
          password: password.trim() || (role === 'admin' ? 'admin123' : 'staff123'),
          avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80`,
        });
      }
      setModalOpen(false);
      await loadUsers();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save user');
    }
  };

  const handleToggleStatus = async (userToToggle: User) => {
    if (userToToggle.id === currentUser?.id) {
      return;
    }
    const newStatus = userToToggle.status === 'active' ? 'inactive' : 'active';
    await api.users.update(userToToggle.id, { status: newStatus });
    await loadUsers();
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    try {
      setDeleteError(null);
      await api.users.delete(deletingUser.id);
      setDeletingUser(null);
      await loadUsers();
    } catch (err: any) {
      setDeleteError(err.message || 'Cannot delete user');
    }
  };

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim();
    const seenIds = new Set<string>();
    return users.filter(u => {
      if (!u || !u.id || seenIds.has(u.id)) return false;
      seenIds.add(u.id);
      const matchSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.includes(q));
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const selectableUsers = useMemo(() => {
    return filteredUsers.filter(u => u.id !== currentUser?.id);
  }, [filteredUsers, currentUser]);

  const handleToggleSelectUser = (id: string) => {
    setSelectedUserIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const handleSelectAllUsers = () => {
    if (selectedUserIds.length === selectableUsers.length && selectableUsers.length > 0) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(selectableUsers.map(u => u.id));
    }
  };

  const handleDeleteSelectedUsers = async () => {
    if (selectedUserIds.length === 0) return;
    if (window.confirm(`Delete ${selectedUserIds.length} selected users? This action cannot be undone.`)) {
      try {
        setLoading(true);
        for (const uid of selectedUserIds) {
          await api.users.delete(uid);
        }
        setSelectedUserIds([]);
        await loadUsers();
      } catch (err: any) {
        setDeleteError(err?.message || 'Failed to delete selected users');
      } finally {
        setLoading(false);
      }
    }
  };

  const roleFilterOptions = [
    { value: 'all', label: 'All Roles' },
    { value: 'admin', label: 'Administrators' },
    { value: 'staff', label: 'Staff (POS)' },
  ];

  const roleModalOptions = [
    { value: 'staff', label: 'Staff (Sales / Billing POS)', sublabel: 'Standard counter checkout permissions' },
    { value: 'admin', label: 'Administrator (Full Access)', sublabel: 'Configuration, reports, user control' },
  ];

  const statusModalOptions = [
    { value: 'active', label: 'Active', badge: 'ENABLED', badgeColor: 'bg-emerald-100 text-emerald-800' },
    { value: 'inactive', label: 'Inactive', badge: 'DISABLED', badgeColor: 'bg-rose-100 text-rose-800' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">User & Role Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin privilege control, staff credentials, access permissions, and account activation
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Export CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export CSV
          </button>
          <button
            onClick={handleDownloadPDF}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            title="Download PDF"
          >
            <Download className="w-4 h-4" />
            Save PDF
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Print List"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-98 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Create User
          </button>
        </div>
      </div>

      {/* Search and Role Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search users by name, email, phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <div className="w-full sm:w-56">
          <SearchableSelect
            options={roleFilterOptions}
            value={roleFilter}
            onChange={setRoleFilter}
            placeholder="Filter by Role..."
            searchPlaceholder="Type role..."
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {selectedUserIds.length > 0 && (
          <div className="p-3 bg-blue-50/80 border-b border-blue-100 flex items-center justify-between text-xs animate-in fade-in">
            <span className="font-semibold text-blue-900">
              {selectedUserIds.length} user{selectedUserIds.length === 1 ? '' : 's'} selected
            </span>
            <button
              onClick={handleDeleteSelectedUsers}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedUserIds.length})</span>
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="w-10 px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.length === selectableUsers.length && selectableUsers.length > 0}
                    onChange={handleSelectAllUsers}
                    title="Select All"
                    aria-label="Select All"
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer align-middle"
                  />
                </th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created Date</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    No users found matching query.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, idx) => {
                  const isCurrent = u.id === currentUser?.id;
                  const isAdminRole = u.role === 'admin';
                  const isSelected = selectedUserIds.includes(u.id);

                  return (
                    <tr
                      key={`${u.id}-${idx}`}
                      className={`transition-colors ${
                        isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="w-10 px-3 py-3.5 text-center">
                        <input
                          type="checkbox"
                          disabled={isCurrent}
                          checked={isSelected}
                          onChange={() => handleToggleSelectUser(u.id)}
                          aria-label={`Select user ${u.name}`}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer align-middle disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&auto=format&fit=crop&q=80'}
                            alt={u.name}
                            className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-200"
                          />
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              {u.name}
                              {isCurrent && (
                                <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded font-semibold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isAdminRole
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {isAdminRole ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-600">
                        {u.phone || '-'}
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase transition-colors cursor-pointer ${
                            u.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                          title="Click to toggle status"
                        >
                          <Power className="w-2.5 h-2.5" />
                          {u.status}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit User"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {!isCurrent && (
                            <button
                              onClick={() => {
                                setDeletingUser(u);
                                setDeleteError(null);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingUser ? 'Edit User Credentials' : 'Create New User Account'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-2 bg-rose-50 text-rose-600 text-xs rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Arun Kumar"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="arun@smartbill.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role *</label>
                  <SearchableSelect
                    options={roleModalOptions}
                    value={role}
                    onChange={v => setRole(v as UserRole)}
                    placeholder="Select Role..."
                    searchPlaceholder="Type role..."
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <SearchableSelect
                    options={statusModalOptions}
                    value={status}
                    onChange={v => setStatus(v as any)}
                    placeholder="Select Status..."
                    searchPlaceholder="Type status..."
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {editingUser ? 'New Password (Leave blank to keep unchanged)' : 'Login Password *'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={editingUser ? 'Leave blank to keep current password' : '••••••••'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {editingUser ? 'Enter at least 4 characters to change password' : 'Minimum 4 characters'}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {deletingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Delete User Account</h3>
            <p className="text-xs text-slate-600 mt-2">
              Are you sure you want to remove <b className="text-slate-900">{deletingUser.name}</b> ({deletingUser.email})?
            </p>

            {deleteError && (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-xs shadow-xs"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
