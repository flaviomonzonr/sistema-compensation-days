import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  CalendarDays,
  RotateCcw,
  Sparkles,
  Database,
  Printer,
  LogOut
} from 'lucide-react';
import { useApp, NavigationTab } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { dashboardService } from '../../services';
import { useToast } from '../../context/ToastContext';
import { DataManagementModal } from '../common/DataManagementModal';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { currentTab, setCurrentTab, clearAllData } = useApp();
  const { user, logout } = useAuth();
  const { success } = useToast();
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);

  const metrics = dashboardService.getMetrics();

  const navItems: { id: NavigationTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={20} />
    },
    {
      id: 'empleados',
      label: 'Empleados',
      icon: <Users size={20} />,
      badge: metrics.trabajadoresActivos
    },
    {
      id: 'compensaciones',
      label: 'Compensaciones',
      icon: <CalendarClock size={20} />,
      badge: metrics.totalDiasPendientes > 0 ? metrics.totalDiasPendientes : undefined
    },
    {
      id: 'feriados',
      label: 'Feriados',
      icon: <CalendarDays size={20} />
    },
    {
      id: 'licencias',
      label: 'Permisos y licencias',
      icon: <Printer size={20} />
    },
{
      id: 'permisos',
      label: 'Hoja de Permiso',
      icon: <Printer size={20} />
    }
  ];

  const handleNavClick = (tabId: NavigationTab) => {
    setCurrentTab(tabId);
    onClose();
  };

  const handleClearData = async () => {
    if (
      window.confirm(
        '¿Desea vaciar todos los empleados y compensaciones? Esta acción dejará el sistema en limpio (0 empleados y 0 compensaciones) tanto localmente como en Supabase, listo para cargar su personal real desde Excel.'
      )
    ) {
      await clearAllData(true);
      success('Base de datos vaciada por completo. Ahora puede cargar sus empleados desde Excel.', 'Base de Datos Limpia');
    }
  };

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Sidebar Header / Brand */}
        <div className="sidebar-header">
          <div className="sidebar-logo-icon">
            <Sparkles size={22} />
          </div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-title">ADPmodul</span>
            <span className="sidebar-brand-subtitle">Compensaciones</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="nav-section-label">Módulos Principales</div>
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
              >
                <span className="nav-item-icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.badge !== undefined && item.id === 'compensaciones' && (
                  <span className="nav-item-badge" title="Días pendientes">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            type="button"
            className="db-reset-button"
            onClick={() => setIsDataModalOpen(true)}
            style={{
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2) 0%, rgba(37, 99, 235, 0.05) 100%)',
              color: '#93c5fd',
              borderColor: 'rgba(59, 130, 246, 0.3)'
            }}
            title="Importar Excel/CSV o descargar copia de seguridad"
          >
            <Database size={14} />
            <span>Carga Masiva / Backup</span>
          </button>

          <button
            type="button"
            className="db-reset-button"
            onClick={handleClearData}
            title="Vaciar todos los empleados y compensaciones (no volverán a restaurarse)"
          >
            <RotateCcw size={14} />
            <span>Vaciar Todos los Datos</span>
          </button>

          {/* User Session Profile & Logout */}
          {user && (
            <div
              style={{
                marginTop: '0.4rem',
                padding: '0.65rem 0.75rem',
                borderRadius: '8px',
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid rgba(148, 163, 184, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    flexShrink: 0
                  }}
                >
                  FM
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.nombre}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    RRHH Admin
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                title="Cerrar Sesión Segura"
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  borderRadius: '6px',
                  padding: '0.35rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#ef4444';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                  e.currentTarget.style.color = '#f87171';
                }}
              >
                <LogOut size={15} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Data Management & Bulk Import Modal - Modo Completo / Backup */}
      <DataManagementModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        mode="all"
      />
    </>
  );
};

