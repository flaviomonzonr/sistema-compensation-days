import React, { useState } from 'react';
import { Layers, PlusCircle, Upload, UserCheck, CalendarDays, ListFilter } from 'lucide-react';
import { WorkerCompensationPanel } from './WorkerCompensationPanel';
import { GlobalCompensationList } from './GlobalCompensationList';
import { CompensationByDatePanel } from './CompensationByDatePanel';
import { RegisterPendingDayModal } from './RegisterPendingDayModal';
import { DataManagementModal } from '../common/DataManagementModal';
import { Button } from '../common/Button';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { useApp } from '../../context/AppContext';

type CompensationSubTab = 'worker' | 'bydate' | 'global';

export const CompensationsMainView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<CompensationSubTab>('worker');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const { triggerRefresh } = useApp();

  const tabs: {
    id: CompensationSubTab;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'worker',
      label: 'Por Trabajador',
      sublabel: 'Control 1 a 1',
      icon: <UserCheck size={16} />
    },
    {
      id: 'bydate',
      label: 'Por Fecha',
      sublabel: 'Compensación / Jornada',
      icon: <CalendarDays size={16} />
    },
    {
      id: 'global',
      label: 'Historial Global',
      sublabel: 'Todos los Registros',
      icon: <ListFilter size={16} />
    }
  ];

  return (
    <div className="flex flex-col gap-2.5">
      {/* Sub navigation bar with horizontal tabular selector */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '0.65rem',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}
      >
        {/* Selector Tabular Horizontal de Vistas */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#475569',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            <Layers size={15} style={{ color: '#2563eb' }} />
            <span>Vista / Panel:</span>
          </div>

          <div role="tablist" aria-label="Panel de Gestión" className="horizontal-nav-tabs">
            {tabs.map((tab, idx) => {
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={isActive}
                  className={`horizontal-nav-tab-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveSubTab(tab.id)}
                >
                  <span className="tab-icon">{tab.icon}</span>
                  <span>
                    <strong>{idx + 1}.</strong> {tab.label}
                  </span>
                  <span className="horizontal-nav-tab-badge">{tab.sublabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Botones de acción principales */}
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsDataModalOpen(true)}
            icon={<Upload size={13} />}
          >
            Carga Masiva Compensaciones (Excel)
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsRegisterModalOpen(true)}
            icon={<PlusCircle size={14} />}
          >
            + Generar Día Trabajado
          </Button>
        </div>
      </div>

      {/* SubTab Views protegidas con ErrorBoundary */}
      <ErrorBoundary fallbackTitle="Error al cargar el panel de compensaciones">
        {activeSubTab === 'worker' && <WorkerCompensationPanel />}
        {activeSubTab === 'bydate' && <CompensationByDatePanel />}
        {activeSubTab === 'global' && <GlobalCompensationList />}
      </ErrorBoundary>

      {/* Global Register Modal */}
      <RegisterPendingDayModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={() => triggerRefresh()}
      />

      {/* Data Management & Bulk Import Modal - Modo exclusivo Compensaciones */}
      <DataManagementModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        mode="compensations"
      />
    </div>
  );
};
