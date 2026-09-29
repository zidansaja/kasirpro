'use client'

import { useAppStore } from '@/lib/store'
import LoginView from '@/components/pos/login-view'
import AppLayout from '@/components/pos/app-layout'
import DashboardView from '@/components/pos/dashboard-view'
import PosView from '@/components/pos/pos-view'
import ProductsView from '@/components/pos/products-view'
import CategoriesView from '@/components/pos/categories-view'
import UsersView from '@/components/pos/users-view'
import StockOpnameView from '@/components/pos/stock-opname-view'
import ReturnsView from '@/components/pos/returns-view'
import ReportsView from '@/components/pos/reports-view'
import TransactionHistoryView from '@/components/pos/transaction-history-view'
import ExpensesView from '@/components/pos/expenses-view'
import ShiftsView from '@/components/pos/shifts-view'
import CustomersView from '@/components/pos/customers-view'
import SuppliersView from '@/components/pos/suppliers-view'
import BackupView from '@/components/pos/backup-view'
import PurchaseOrdersView from '@/components/pos/purchase-orders-view'
import SettingsView from '@/components/pos/settings-view'
import AuditLogsView from '@/components/pos/audit-logs-view'

export default function Home() {
  const { isAuthenticated, currentView } = useAppStore()

  if (!isAuthenticated) {
    return <LoginView />
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />
      case 'pos':
        return <PosView />
      case 'products':
        return <ProductsView />
      case 'categories':
        return <CategoriesView />
      case 'users':
        return <UsersView />
      case 'stock-opname':
        return <StockOpnameView />
      case 'returns':
        return <ReturnsView />
      case 'expenses':
        return <ExpensesView />
      case 'shifts':
        return <ShiftsView />
      case 'customers':
        return <CustomersView />
      case 'suppliers':
        return <SuppliersView />
      case 'purchase-orders':
        return <PurchaseOrdersView />
      case 'reports':
        return <ReportsView />
      case 'transactions':
        return <TransactionHistoryView />
      case 'backup':
        return <BackupView />
      case 'settings':
        return <SettingsView />
      case 'audit-logs':
        return <AuditLogsView />
      default:
        return <DashboardView />
    }
  }

  return <AppLayout>{renderView()}</AppLayout>
}