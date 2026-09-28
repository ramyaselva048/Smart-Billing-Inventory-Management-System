import React, { useState, useEffect } from 'react';
import {
  Building,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  Lock,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff
} from 'lucide-react';
import { BusinessSettings } from '../types';
import { api } from '../services/api';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Basic Business Settings
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [invoicePrefix, setInvoicePrefix] = useState('INV-2026-');
  const [logoUrl, setLogoUrl] = useState('');

  // Login Password & Security State
  const [newAdminPass, setNewAdminPass] = useState('');
  const [confirmAdminPass, setConfirmAdminPass] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [passSuccessMsg, setPassSuccessMsg] = useState<string | null>(null);
  const [passErrorMsg, setPassErrorMsg] = useState<string | null>(null);

  // Reset demo modal
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await api.settings.get();
      setSettings(data);
      setBusinessName(data.businessName || '');
      setBusinessAddress(data.businessAddress || '');
      setPhone(data.phone || '');
      setEmail(data.email || '');
      setGstNumber(data.gstNumber || '');
      setInvoicePrefix(data.invoicePrefix || 'INV-2026-');
      setLogoUrl(data.logoUrl || '');
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      setErrorMsg('Business name is required');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);
      await api.settings.update({
        businessName: businessName.trim(),
        businessAddress: businessAddress.trim(),
        phone: phone.trim(),
        email: email.trim(),
        gstNumber: gstNumber.trim().toUpperCase(),
        invoicePrefix: invoicePrefix.trim(),
        logoUrl: logoUrl.trim(),
      });

      setSuccessMsg('Business settings updated successfully! Invoices will automatically reflect these details.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassErrorMsg(null);
    setPassSuccessMsg(null);

    if (!newAdminPass || newAdminPass.trim().length < 4) {
      setPassErrorMsg('New password must contain at least 4 characters.');
      return;
    }
    if (newAdminPass !== confirmAdminPass) {
      setPassErrorMsg('Passwords do not match.');
      return;
    }

    try {
      setSavingPass(true);
      await api.auth.resetPasswordByEmail('admin@smartbill.com', newAdminPass.trim());
      setPassSuccessMsg('Admin login password updated successfully! Please use this password on the login screen.');
      setNewAdminPass('');
      setConfirmAdminPass('');
      setTimeout(() => setPassSuccessMsg(null), 4000);
    } catch (err: any) {
      setPassErrorMsg(err?.message || 'Failed to update password.');
    } finally {
      setSavingPass(false);
    }
  };

  const handleResetFactory = async () => {
    try {
      await api.settings.resetToFactory();
      setShowResetConfirm(false);
      window.location.reload();
    } catch (err) {
      console.error('Error resetting database:', err);
    }
  };

  if (loading || !settings) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="text-slate-400 text-xs">Loading Settings...</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Business Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your company details, contact information, GST number, and invoice styling.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowResetConfirm(true)}
          className="px-3 py-1.5 border border-rose-300 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Sample Data</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Business Information (Appears on Invoices)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Business Name */}
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Business Name *</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                placeholder="e.g. SMART BILL ENTERPRISES"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden font-bold text-slate-900"
              />
            </div>

            {/* Business Address */}
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Business Address *</label>
              <textarea
                rows={2}
                required
                value={businessAddress}
                onChange={e => setBusinessAddress(e.target.value)}
                placeholder="e.g. Suite 402, Metro Business Park, Anna Salai, Chennai, Tamil Nadu - 600002"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden text-xs leading-relaxed"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
              <input
                type="text"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden font-mono"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="billing@smartbill.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            {/* GST Number */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">GST Number (GSTIN) *</label>
              <input
                type="text"
                required
                value={gstNumber}
                onChange={e => setGstNumber(e.target.value.toUpperCase())}
                placeholder="33AAAAA1234A1Z5"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl uppercase font-mono font-bold text-blue-700 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Invoice Prefix */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Invoice Prefix *</label>
              <input
                type="text"
                required
                value={invoicePrefix}
                onChange={e => setInvoicePrefix(e.target.value)}
                placeholder="INV-2026-"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:border-blue-500 focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Format: INV-2026-00001</span>
            </div>

            {/* Logo URL */}
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Logo URL (Optional)</label>
              <input
                type="url"
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 active:scale-98 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>

      {/* Login Password & Security Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Lock className="w-5 h-5 text-indigo-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Login Password & Security
            </h2>
            <p className="text-[11px] text-slate-500">
              Only users entering their valid password can log in to the billing app.
            </p>
          </div>
        </div>

        {passSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{passSuccessMsg}</span>
          </div>
        )}

        {passErrorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{passErrorMsg}</span>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Admin Account
              </label>
              <input
                type="text"
                disabled
                value="admin@smartbill.com (Administrator)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                New Admin Login Password *
              </label>
              <div className="relative">
                <input
                  type={showAdminPass ? 'text' : 'password'}
                  required
                  value={newAdminPass}
                  onChange={e => setNewAdminPass(e.target.value)}
                  placeholder="Enter new password (min 4 chars)"
                  className="w-full px-3 pr-10 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPass(!showAdminPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  {showAdminPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Confirm New Password *
              </label>
              <input
                type={showAdminPass ? 'text' : 'password'}
                required
                value={confirmAdminPass}
                onChange={e => setConfirmAdminPass(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-blue-500 focus:outline-hidden font-mono"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={savingPass || !newAdminPass}
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{savingPass ? 'Updating...' : 'Update Login Password'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Current Credential Guide */}
        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Registered System Passwords
            </span>
            <p className="text-[11px] text-slate-500">
              Only entering these exact passwords allows logging in to the application.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-mono text-[11px] text-slate-700">
              Admin: <strong>admin123</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-mono text-[11px] text-slate-700">
              Staff: <strong>staff123</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Reset System to Initial Demo Data?</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              This will restore all default users, business credentials, and sample invoices. Any custom edits will be reset.
            </p>
            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetFactory}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-xs shadow-xs cursor-pointer"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
