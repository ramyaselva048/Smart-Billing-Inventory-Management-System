import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { Sidebar, TabType } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { BillingPage } from './pages/BillingPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { SettingsPage } from './pages/SettingsPage';
import { InvoiceModal } from './components/invoice/InvoiceModal';
import { Invoice, BusinessSettings } from './types';
import { api } from './services/api';

const AppShell: React.FC = () => {
  const { user, loading, isAdmin } = useAuth();
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [tabSearchQuery, setTabSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Global Invoice Preview Modal
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [autoPrintInvoice, setAutoPrintInvoice] = useState<boolean>(false);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);

  useEffect(() => {
    if (user) {
      loadInitialAppData();
    }
  }, [user]);

  const loadInitialAppData = async () => {
    try {
      const st = await api.settings.get();
      setSettings(st);
    } catch (err) {
      console.error('Error loading initial app config:', err);
    }
  };

  const handleNavigateTab = (tab: TabType, params?: { search?: string }) => {
    setCurrentTab(tab);
    setTabSearchQuery(params?.search || '');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-xs font-medium">Starting SMART BILL...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const handleOpenNewBill = () => {
    setCurrentTab('billing');
  };

  const handleInvoiceCreated = (newInv: Invoice, autoPrint: boolean = false) => {
    setPreviewInvoice(newInv);
    setAutoPrintInvoice(autoPrint);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800">
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-30 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Main Sidebar */}
      <div
        className={`fixed md:static inset-y-0 left-0 z-40 md:z-auto transition-transform md:translate-x-0 h-full shrink-0 flex flex-col min-h-0 ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <Sidebar
          currentTab={currentTab}
          onSelectTab={tab => {
            setCurrentTab(tab);
            setIsMobileSidebarOpen(false);
          }}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          onOpenNewBill={handleOpenNewBill}
          onNavigateTab={handleNavigateTab}
          onSelectInvoice={inv => setPreviewInvoice(inv)}
          onToggleMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardPage
              onNavigateTab={handleNavigateTab}
              onOpenNewBill={handleOpenNewBill}
              onSelectInvoice={inv => setPreviewInvoice(inv)}
            />
          )}

          {currentTab === 'billing' && (
            <BillingPage
              onInvoiceCreated={handleInvoiceCreated}
              onNavigateTab={handleNavigateTab}
            />
          )}

          {currentTab === 'invoices' && (
            <InvoicesPage
              onSelectInvoice={inv => setPreviewInvoice(inv)}
              onOpenNewBill={handleOpenNewBill}
              initialSearch={tabSearchQuery}
            />
          )}

          {currentTab === 'reports' && <ReportsPage />}

          {currentTab === 'users' &&
            (isAdmin ? (
              <UsersPage initialSearch={tabSearchQuery} />
            ) : (
              <DashboardPage
                onNavigateTab={handleNavigateTab}
                onOpenNewBill={handleOpenNewBill}
                onSelectInvoice={setPreviewInvoice}
              />
            ))}

          {currentTab === 'settings' &&
            (isAdmin ? (
              <SettingsPage />
            ) : (
              <DashboardPage
                onNavigateTab={handleNavigateTab}
                onOpenNewBill={handleOpenNewBill}
                onSelectInvoice={setPreviewInvoice}
              />
            ))}
        </main>
      </div>

      {/* Global Invoice Details & Printable Receipt Modal */}
      {previewInvoice && settings && (
        <InvoiceModal
          invoice={previewInvoice}
          settings={settings}
          autoPrint={autoPrintInvoice}
          onClose={() => {
            setPreviewInvoice(null);
            setAutoPrintInvoice(false);
          }}
          onCreateNewBill={() => {
            setPreviewInvoice(null);
            setAutoPrintInvoice(false);
            setCurrentTab('billing');
          }}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
