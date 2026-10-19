import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardView } from './components/dashboard/DashboardView';
import { EmployeeListView } from './components/employees/EmployeeListView';
import { CompensationsMainView } from './components/compensations/CompensationsMainView';
import { HolidayListView } from './components/holidays/HolidayListView';
import { PermissionSheetView } from './components/permissionSheet/PermissionSheetView';
import { WorkerLeaveView } from './components/permissionSheet/WorkerLeaveView';
import { LoginView } from './components/auth/LoginView';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const MainViewRouter: React.FC = () => {
  const { currentTab } = useApp();

  return (
    <ErrorBoundary fallbackTitle="Ocurrió un problema en la vista actual">
      {(() => {
        switch (currentTab) {
          case 'dashboard':
            return <DashboardView />;
          case 'empleados':
            return <EmployeeListView />;
          case 'compensaciones':
            return <CompensationsMainView />;
          case 'feriados':
            return <HolidayListView />;
          case 'licencias':
            return <WorkerLeaveView />;
          case 'permisos':
            return <PermissionSheetView />;
          default:
            return <DashboardView />;
        }
      })()}
    </ErrorBoundary>
  );
};

const RootGate: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f172a',
          color: '#94a3b8',
          fontFamily: 'inherit'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              border: '3px solid rgba(255,255,255,0.1)',
              borderTopColor: '#3b82f6',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }}
          />
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Verificando credenciales de seguridad...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <AppProvider>
      <AppLayout>
        <MainViewRouter />
      </AppLayout>
    </AppProvider>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <RootGate />
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
