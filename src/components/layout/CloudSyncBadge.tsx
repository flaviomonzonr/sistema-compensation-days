import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, UploadCloud, CheckCircle2, HelpCircle } from 'lucide-react';
import { db } from '../../storage';
import { useToast } from '../../context/ToastContext';

export const CloudSyncBadge: React.FC = () => {
  const [isConnected, setIsConnected] = useState(db.isCloudConnected());
  const [isSyncing, setIsSyncing] = useState(db.isCloudSyncing());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    const unsub = db.subscribe(() => {
      setIsConnected(db.isCloudConnected());
      setIsSyncing(db.isCloudSyncing());
    });
    return () => unsub();
  }, []);

  const handleManualSync = async () => {
    if (!isConnected) return;
    setIsActionLoading(true);
    try {
      await db.syncWithSupabase();
      success('Datos sincronizados con Supabase correctamente', 'Sincronización');
    } catch (e: any) {
      error(e?.message || 'Error al sincronizar con la nube', 'Fallo de Sincronización');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUploadLocal = async () => {
    if (!isConnected) return;
    setIsActionLoading(true);
    try {
      const res = await db.pushAllToSupabase();
      if (res.success) {
        success('Todos los registros locales fueron subidos a Supabase con éxito', 'Migración Completa');
      } else {
        error(res.message || 'No se pudieron subir los datos', 'Error de Migración');
      }
    } catch (e: any) {
      error(e?.message || 'Ocurrió un problema inesperado', 'Error');
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="btn"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          fontSize: '0.8rem',
          fontWeight: 600,
          padding: '0.35rem 0.75rem',
          borderRadius: '9999px',
          border: isConnected ? '1px solid #10b981' : '1px solid #94a3b8',
          background: isConnected ? '#ecfdf5' : '#f8fafc',
          color: isConnected ? '#065f46' : '#475569',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        title="Estado de sincronización de la base de datos"
      >
        {isSyncing ? (
          <RefreshCw size={14} className="spin" style={{ color: '#059669' }} />
        ) : isConnected ? (
          <Cloud size={14} style={{ color: '#059669' }} />
        ) : (
          <CloudOff size={14} style={{ color: '#64748b' }} />
        )}
        <span>{isSyncing ? 'Sincronizando...' : isConnected ? 'Supabase Conectado' : 'Modo Local (IndexedDB)'}</span>
      </button>

      {isModalOpen && (
        <div
          className="modal-overlay"
          style={{ zIndex: 9999 }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="modal-card"
            style={{ maxWidth: '480px', width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isConnected ? <Cloud size={20} color="#059669" /> : <CloudOff size={20} color="#64748b" />}
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Estado de Base de Datos</h3>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  background: isConnected ? '#f0fdf4' : '#fffbeb',
                  border: isConnected ? '1px solid #bbf7d0' : '1px solid #fde68a',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem'
                }}
              >
                {isConnected ? (
                  <CheckCircle2 size={20} style={{ color: '#16a34a', flexShrink: 0, marginTop: '2px' }} />
                ) : (
                  <HelpCircle size={20} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
                )}
                <div style={{ fontSize: '0.875rem' }}>
                  <div style={{ fontWeight: 600, color: isConnected ? '#15803d' : '#b45309' }}>
                    {isConnected ? 'Conexión a Supabase Activa' : 'Almacenamiento Local Activo'}
                  </div>
                  <div style={{ color: '#4b5563', marginTop: '0.25rem', lineHeight: '1.4' }}>
                    {isConnected
                      ? 'Los cambios se sincronizan en tiempo real con tu proyecto PostgreSQL en Supabase. También tienes respaldo local en IndexedDB.'
                      : 'Actualmente el sistema está usando la base de datos local del navegador (IndexedDB). Para conectar Supabase, ingresa tus credenciales en el archivo .env.local.'}
                  </div>
                </div>
              </div>

              {isConnected ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', gap: '0.5rem' }}
                    onClick={handleManualSync}
                    disabled={isActionLoading || isSyncing}
                  >
                    <RefreshCw size={16} className={isSyncing || isActionLoading ? 'spin' : ''} />
                    <span>Descargar/Sincronizar cambios de Supabase</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: '100%', justifyContent: 'center', gap: '0.5rem' }}
                    onClick={handleUploadLocal}
                    disabled={isActionLoading || isSyncing}
                  >
                    <UploadCloud size={16} />
                    <span>Subir datos locales actuales a Supabase</span>
                  </button>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0, textAlign: 'center' }}>
                    * Utiliza "Subir datos locales" para poblar tu base de datos nueva en Supabase con los empleados y registros actuales.
                  </p>
                </div>
              ) : (
                <div style={{ fontSize: '0.825rem', color: '#374151', background: '#f8fafc', padding: '0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <strong>Pasos para conectar:</strong>
                  <ol style={{ paddingLeft: '1.2rem', margin: '0.4rem 0 0 0', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <li>Abre el archivo <code>.env.local</code> en la raíz del proyecto.</li>
                    <li>Copia y pega tu <code>VITE_SUPABASE_URL</code> y tu <code>VITE_SUPABASE_ANON_KEY</code>.</li>
                    <li>Ejecuta el script <code>supabase_schema.sql</code> en el SQL Editor de tu consola de Supabase.</li>
                    <li>Reinicia el servidor de desarrollo (<code>npm run dev</code>).</li>
                  </ol>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsModalOpen(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
