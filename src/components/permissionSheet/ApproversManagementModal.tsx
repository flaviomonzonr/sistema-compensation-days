import React, { useState, useMemo } from 'react';
import {
  Users,
  PlusCircle,
  Save,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  Search
} from 'lucide-react';
import { AprobadorPermiso, CreateAprobadorDto } from '../../types';
import { approverService } from '../../services';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

interface ApproversManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApproversChange?: () => void;
}

export const ApproversManagementModal: React.FC<ApproversManagementModalProps> = ({
  isOpen,
  onClose,
  onApproversChange
}) => {
  const { success, error } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [editingApprover, setEditingApprover] = useState<AprobadorPermiso | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [cargo, setCargo] = useState('');
  const [area, setArea] = useState('');
  const [documentoIdentidad, setDocumentoIdentidad] = useState('');
  const [firmaUrl, setFirmaUrl] = useState('');
  const [isReadingSignature, setIsReadingSignature] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [refreshToggle, setRefreshToggle] = useState(0);

  const approvers = useMemo(() => {
    return approverService.getAll({ search: searchTerm });
  }, [searchTerm, isOpen, refreshToggle]);

  const handleStartCreate = () => {
    setEditingApprover(null);
    setNombreCompleto('');
    setCargo('');
    setArea('');
    setDocumentoIdentidad('');
    setFirmaUrl('');
    setFormErrors({});
    setIsCreating(true);
  };

  const handleStartEdit = (app: AprobadorPermiso) => {
    setIsCreating(false);
    setEditingApprover(app);
    setNombreCompleto(app.nombreCompleto);
    setCargo(app.cargo);
    setArea(app.area);
    setDocumentoIdentidad(app.documentoIdentidad || '');
    setFirmaUrl(app.firmaUrl || '');
    setFormErrors({});
  };

  const handleCancelForm = () => {
    setIsCreating(false);
    setEditingApprover(null);
    setFormErrors({});
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};
    if (!nombreCompleto.trim()) errors.nombreCompleto = 'El nombre es obligatorio.';
    if (!cargo.trim()) errors.cargo = 'El cargo es obligatorio.';
    if (!area.trim()) errors.area = 'El área es obligatoria.';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (editingApprover) {
      // Update
      const res = approverService.update(editingApprover.id, {
        nombreCompleto: nombreCompleto.trim(),
        cargo: cargo.trim(),
        area: area.trim(),
        documentoIdentidad: documentoIdentidad.trim(),
        firmaUrl
      });

      if (res.success) {
        success('Aprobador actualizado correctamente.', 'Cambios Guardados');
        handleCancelForm();
        setRefreshToggle((prev) => prev + 1);
        onApproversChange?.();
      } else {
        error(res.error || 'Error al actualizar el aprobador.');
      }
    } else {
      // Create
      const dto: CreateAprobadorDto = {
        nombreCompleto: nombreCompleto.trim(),
        cargo: cargo.trim(),
        area: area.trim(),
        documentoIdentidad: documentoIdentidad.trim(),
        firmaUrl
      };

      const res = approverService.create(dto);
      if (res.success) {
        success(`Aprobador ${dto.nombreCompleto} registrado exitosamente.`, 'Aprobador Creado');
        handleCancelForm();
        setRefreshToggle((prev) => prev + 1);
        onApproversChange?.();
      } else {
        error(res.error || 'Error al registrar el aprobador.');
      }
    }
  };

  const handleToggleStatus = (app: AprobadorPermiso) => {
    const nextState = app.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    const res = approverService.changeStatus(app.id, nextState);
    if (res.success) {
      success(`Estado cambiado a ${nextState}.`, 'Actualizado');
      setRefreshToggle((prev) => prev + 1);
      onApproversChange?.();
    } else {
      error(res.error || 'Error al cambiar estado.');
    }
  };

  const handleDelete = (app: AprobadorPermiso) => {
    if (window.confirm(`¿Está seguro de eliminar a ${app.nombreCompleto} de la lista de aprobadores?`)) {
      const res = approverService.delete(app.id);
      if (res.success) {
        success('Aprobador eliminado.', 'Eliminado');
        setRefreshToggle((prev) => prev + 1);
        onApproversChange?.();
      } else {
        error(res.error || 'Error al eliminar aprobador.');
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={20} style={{ color: '#2563eb' }} />
          <span>Gestión de Aprobadores de Permisos (Jefaturas / Gerencia)</span>
        </div>
      }
      footer={
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Header Actions & Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              className="form-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar aprobador, cargo o área..."
              style={{ paddingLeft: '2rem', fontSize: '0.775rem' }}
            />
          </div>

          {!isCreating && !editingApprover && (
            <Button variant="primary" size="sm" onClick={handleStartCreate} icon={<PlusCircle size={14} />}>
              + Agregar Aprobador
            </Button>
          )}
        </div>

        {/* Form to Create or Edit */}
        {(isCreating || editingApprover) && (
          <form
            onSubmit={handleSave}
            style={{
              background: '#f8fafc',
              border: '1.5px solid #93c5fd',
              borderRadius: '8px',
              padding: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '0.825rem', color: '#1e40af' }}>
                {editingApprover ? 'Modificar Datos de Aprobador' : 'Registrar Nuevo Aprobador'}
              </strong>
              <Button type="button" variant="ghost" size="sm" onClick={handleCancelForm}>
                Cancelar
              </Button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                  Nombre Completo y Grado <span className="required-mark">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. Ing. Roberto Chang Morales"
                  value={nombreCompleto}
                  onChange={(e) => {
                    setNombreCompleto(e.target.value);
                    setFormErrors({});
                  }}
                  style={{ fontSize: '0.8rem' }}
                />
                {formErrors.nombreCompleto && <span className="form-error">{formErrors.nombreCompleto}</span>}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                  Cargo Institucional <span className="required-mark">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. GERENTE DE OPERACIONES"
                  value={cargo}
                  onChange={(e) => {
                    setCargo(e.target.value);
                    setFormErrors({});
                  }}
                  style={{ fontSize: '0.8rem' }}
                />
                {formErrors.cargo && <span className="form-error">{formErrors.cargo}</span>}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                  Área / Departamento <span className="required-mark">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. OPERACIONES / RECURSOS HUMANOS"
                  value={area}
                  onChange={(e) => {
                    setArea(e.target.value);
                    setFormErrors({});
                  }}
                  style={{ fontSize: '0.8rem' }}
                />
                {formErrors.area && <span className="form-error">{formErrors.area}</span>}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                  DNI / Documento <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opcional)</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. 41209845"
                  value={documentoIdentidad}
                  onChange={(e) => setDocumentoIdentidad(e.target.value)}
                  style={{ fontSize: '0.8rem' }}
                />
              </div>
            </div>

            <label className="form-label">Imagen de firma (opcional)
              <input type="file" accept="image/png,image/jpeg,image/webp" disabled={isReadingSignature} onChange={e => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
                  error('Seleccione una imagen PNG, JPG o WebP de hasta 2 MB.'); return;
                }
                setIsReadingSignature(true);
                const reader = new FileReader();
                reader.onload = () => { setFirmaUrl(String(reader.result || '')); setIsReadingSignature(false); };
                reader.onerror = () => { error('No se pudo leer la imagen de firma.'); setIsReadingSignature(false); };
                reader.readAsDataURL(file);
              }} />
            </label>
            {isReadingSignature && <span>Cargando firma...</span>}
            {firmaUrl && <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src={firmaUrl} alt="Firma del aprobador" style={{ maxWidth: 220, maxHeight: 90, objectFit: 'contain', background: '#fff' }} />
              <Button type="button" variant="danger" size="sm" onClick={() => setFirmaUrl('')}>Eliminar firma</Button>
            </div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.25rem' }}>
              <Button type="button" variant="secondary" size="sm" onClick={handleCancelForm}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isReadingSignature} icon={<Save size={14} />}>
                Guardar Aprobador
              </Button>
            </div>
          </form>
        )}

        {/* Approvers Table */}
        <div className="table-responsive" style={{ maxHeight: '350px', overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Aprobador (Nombre y Apellidos)</th>
                <th>Cargo</th>
                <th>Área</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {approvers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                    No se encontraron aprobadores registrados.
                  </td>
                </tr>
              ) : (
                approvers.map((app) => (
                  <tr key={app.id}>
                    <td>
                      <strong style={{ color: '#0f172a', fontSize: '0.825rem' }}>{app.nombreCompleto}</strong>
                      {app.documentoIdentidad && (
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>DNI: {app.documentoIdentidad}</div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 600 }}>{app.cargo}</td>
                    <td>
                      <span
                        style={{
                          background: '#f1f5f9',
                          padding: '0.15rem 0.4rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 600
                        }}
                      >
                        {app.area}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '9999px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          background: app.estado === 'ACTIVO' ? '#dcfce7' : '#f1f5f9',
                          color: app.estado === 'ACTIVO' ? '#15803d' : '#64748b'
                        }}
                      >
                        {app.estado === 'ACTIVO' ? <CheckCircle size={11} /> : <XCircle size={11} />}
                        {app.estado}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.3rem', alignItems: 'center' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(app)}
                          title={app.estado === 'ACTIVO' ? 'Desactivar aprobador' : 'Activar aprobador'}
                          style={{ fontSize: '0.725rem' }}
                        >
                          {app.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'}
                        </Button>

                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleStartEdit(app)}
                          title="Modificar aprobador"
                          style={{ color: '#2563eb' }}
                        >
                          <Edit2 size={13} />
                        </button>

                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDelete(app)}
                          title="Eliminar aprobador"
                          style={{ color: '#ef4444' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
};
