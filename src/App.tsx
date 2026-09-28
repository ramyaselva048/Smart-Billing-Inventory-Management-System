import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { Sidebar, TabType } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { BillingPage } from './pages/BillingPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { ProductsPage } from './pages/ProductsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { CustomersPage } from './pages/CustomersPage';
import { InventoryPage } from './pages/InventoryPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { UsersPage } from './pages/UsersPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { InvoiceModal } from './components/invoice/InvoiceModal';
import { Invoice, Product, BusinessSettings, Notification } from './types';
import { api } from './services/api';

const AppShell: React.FC = () => {
  const { user, loading, isAdmin } = useAuth();
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [tabSearchQuery, setTabSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Global Invoice Preview Modal
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Restock link state for Inventory page
  const [pendingRestockProduct, setPendingRestockProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (user) {
      loadInitialAppData();
    }
  }, [user]);

  const loadInitialAppData = async () => {
    try {
      const [st, notifs] = await Promise.all([
        api.settings.get(),
        api.notifications.getAll(),
      ]);
      setSettings(st);
      setNotifications(notifs);
    } catch (err) {
      console.error('Error loading initial app config:', err);
    }
  };

  const handleRefreshNotifications = async () => {
    const notifs = await api.notifications.getAll();
    setNotifications(notifs);
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
          <p className="text-slate-400 text-xs font-medium">Starting SMART BILL Enterprise...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const unreadNotifsCount = notifications.filter(n => !n.read).length;

  const handleOpenNewBill = () => {
    setCurrentTab('billing');
  };

  const handleInvoiceCreated = (newInv: Invoice) => {
    setPreviewInvoice(newInv);
    handleRefreshNotifications();
  };

  const handleOpenRestock = (product: Product) => {
    setPendingRestockProduct(product);
    setCurrentTab('inventory');
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
          unreadNotifsCount={unreadNotifsCount}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          onOpenNewBill={handleOpenNewBill}
          onNavigateTab={tab => setCurrentTab(tab)}
          onSelectInvoice={inv => setPreviewInvoice(inv)}
          notifications={notifications}
          onRefreshNotifications={handleRefreshNotifications}
          onToggleMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardPage
              onNavigateTab={tab => setCurrentTab(tab)}
              onOpenNewBill={handleOpenNewBill}
              onSelectInvoice={inv => setPreviewInvoice(inv)}
              onOpenRestockModal={handleOpenRestock}
            />
          )}

          {currentTab === 'billing' && (
            <BillingPage
              onInvoiceCreated={handleInvoiceCreated}
              onNavigateTab={tab => setCurrentTab(tab)}
            />
          )}

          {currentTab === 'invoices' && (
            <InvoicesPage
              onSelectInvoice={inv => setPreviewInvoice(inv)}
              onOpenNewBill={handleOpenNewBill}
            />
          )}

          {currentTab === 'products' && (
            <ProductsPage onOpenRestockModal={handleOpenRestock} />
          )}

          {currentTab === 'categories' && <CategoriesPage />}

          {currentTab === 'customers' && (
            <CustomersPage
              onSelectInvoice={inv => setPreviewInvoice(inv)}
              onOpenNewBill={handleOpenNewBill}
            />
          )}

          {currentTab === 'inventory' && (
            <InventoryPage
              initialRestockProduct={pendingRestockProduct}
              onClearInitialRestock={() => setPendingRestockProduct(null)}
            />
          )}

          {currentTab === 'payments' && <PaymentsPage />}

          {currentTab === 'reports' && <ReportsPage />}

          {currentTab === 'notifications' && (
            <NotificationsPage
              notifications={notifications}
              onRefreshNotifications={handleRefreshNotifications}
              onNavigateTab={tab => setCurrentTab(tab)}
            />
          )}

          {currentTab === 'users' && (isAdmin ? <UsersPage /> : <DashboardPage onNavigateTab={setCurrentTab} onOpenNewBill={handleOpenNewBill} onSelectInvoice={setPreviewInvoice} onOpenRestockModal={handleOpenRestock} />)}

          {currentTab === 'settings' && (isAdmin ? <SettingsPage /> : <DashboardPage onNavigateTab={setCurrentTab} onOpenNewBill={handleOpenNewBill} onSelectInvoice={setPreviewInvoice} onOpenRestockModal={handleOpenRestock} />)}

          {currentTab === 'audit' && (isAdmin ? <AuditLogsPage /> : <DashboardPage onNavigateTab={setCurrentTab} onOpenNewBill={handleOpenNewBill} onSelectInvoice={setPreviewInvoice} onOpenRestockModal={handleOpenRestock} />)}
        </main>
      </div>

      {/* Global Invoice Preview Modal */}
      {previewInvoice && settings && (
        <InvoiceModal
          invoice={previewInvoice}
          settings={settings}
          onClose={() => setPreviewInvoice(null)}
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
