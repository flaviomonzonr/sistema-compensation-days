import React, { useEffect, useMemo, useState } from 'react';
import { Printer, FileText } from 'lucide-react';
import { Button } from '../common/Button';
import { ApproversManagementModal } from './ApproversManagementModal';
import { employeeService, approverService } from '../../services';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { OfficialSheetData, SEDES_LIST } from './OfficialPermissionSheetDoc';
import { DualPermissionSheetDoc } from './DualPermissionSheetDoc';
import './permissionPrint.css';
import './workerLeave.css';

const REASONS = ['Motivos personales', 'Suspensión de labores', 'Licencia sin goce de haber', 'Licencia por paternidad', 'Licencia por fallecimiento', 'Salud', 'Capacitación', 'Estudios', 'Otros'];
const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function nextDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const date = new Date(value + 'T12:00:00');
  date.setDate(date.getDate() + 1);
  return localDate(date);
}

// This emitter reads employees and approvers only; it never writes compensations.
export const WorkerLeaveView: React.FC = () => {
  const { refreshKey, selectedEmployeeIdForCompensations } = useApp();
  const { warning } = useToast();
  const employees = useMemo(() => employeeService.getAll(), [refreshKey]);
  const [approversRefresh, setApproversRefresh] = useState(0);
  const [manageApprovers, setManageApprovers] = useState(false);
  const approvers = useMemo(() => approverService.getAll({ estado: 'ACTIVO' }), [refreshKey, approversRefresh]);
  const [bulk, setBulk] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [reason, setReason] = useState(REASONS[0]);
  const [detail, setDetail] = useState('');
  const [signature, setSignature] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState('');
  const [signatureApproverId, setSignatureApproverId] = useState('');
  const [fields, setFields] = useState<OfficialSheetData>({
    fechaEmision: localDate(), sede: 'PLANTA SECHIN FRESCO', tipoDocumento: 'D.N.I.',
    numeroDocumento: '', apellidosNombres: '', condicionLaboral: 'EMPLEADO', labor: '',
    responsableInmediato: 'JEFE DE ÁREA / SUPERVISOR', tiempoSolicitado: '1 DÍA (JORNADA COMPLETA)',
    motivo: 'PERSONAL', aprobadoPor: 'Lic. María Elena Ramos Paredes', cargoAprobador: 'JEFE DE RECURSOS HUMANOS',
    inicia: localDate(), finaliza: localDate(), diaRetorno: nextDay(localDate()), observaciones: ''
  });
  const [showValidation, setShowValidation] = useState(false);
  const [emitted, setEmitted] = useState(false);
  const selectApprover = (id: string) => {
    const approver = approvers.find(a => a.id === id);
    setSignatureApproverId(id);
    setSignatureUrl(approver?.firmaUrl || '');
    if (approver) setFields(f => ({ ...f, aprobadoPor: approver.nombreCompleto, cargoAprobador: approver.cargo }));
  };
  useEffect(() => {
    if (!signatureApproverId) return;
    const approver = approvers.find(a => a.id === signatureApproverId);
    if (!approver) {
      setSignatureApproverId(''); setSignatureUrl(''); setSignature(false);
      setFields(f => ({ ...f, aprobadoPor: '', cargoAprobador: '' }));
    } else {
      setSignatureUrl(approver.firmaUrl || '');
      setFields(f => ({ ...f, aprobadoPor: approver.nombreCompleto, cargoAprobador: approver.cargo }));
      if (!approver.firmaUrl) setSignature(false);
    }
  }, [approvers, signatureApproverId]);
  useEffect(() => {
    if (!bulk && !search.trim() && selected.length === 0 && selectedEmployeeIdForCompensations) {
      const employee = employees.find(e => e.id === selectedEmployeeIdForCompensations);
      if (employee) setSelected([employee.id]);
    }
  }, [employees, selectedEmployeeIdForCompensations, bulk]);
  useEffect(() => { setEmitted(false); setShowValidation(false); }, [selected, fields, reason, detail, signature, signatureUrl]);
  const update = (key: keyof OfficialSheetData, value: string) => setFields(f => ({ ...f, [key]: value }));
  const searchEmployees = (query: string) => {
    const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
    return employees.filter(e => {
      const text = normalizeSearch(`${e.codigo || ''} ${e.apellidosNombres || ''} ${e.documentoIdentidad || ''} ${e.area || ''} ${e.cargo || ''}`);
      return words.every(word => text.includes(word));
    });
  };
  const filtered = searchEmployees(search);
  const selectSearchResult = (query: string) => {
    const results = searchEmployees(query);
    const exact = results.filter(e => [e.documentoIdentidad, e.codigo].some(value => normalizeSearch(value || '') === normalizeSearch(query)));
    const match = exact.length === 1 ? exact[0] : results.length === 1 ? results[0] : undefined;
    setSelected(query.trim() && match ? [match.id] : []);
  };
  const onSearch = (query: string) => {
    setSearch(query);
    if (!bulk) selectSearchResult(query);
  };
  useEffect(() => {
    if (!bulk && search.trim()) selectSearchResult(search);
  }, [employees, search, bulk]);
  const chosen = employees.filter(e => selected.includes(e.id));
  const sheets = chosen.map(employee => ({
    ...fields, id: employee.id, numeroDocumento: employee.documentoIdentidad,
    apellidosNombres: employee.apellidosNombres, labor: employee.cargo || employee.area,
    condicionLaboral: employee.tipoTrabajador === 'OBRERO' ? 'OBRERO' as const : 'EMPLEADO' as const,
    motivo: (reason === 'Motivos personales' ? 'PERSONAL' : reason === 'Salud' ? 'SALUD' : reason === 'Capacitación' ? 'CAPACITACION' : reason === 'Estudios' ? 'ESTUDIOS' : 'OTROS') as OfficialSheetData['motivo'],
    motivoOtroEspecifique: reason === 'Otros' ? detail.trim() : `${reason}${detail.trim() ? ': ' + detail.trim() : ''}`
  }));
  const validationMessage = chosen.length === 0 ? 'Seleccione al menos un trabajador para emitir su papeleta.'
    : !fields.fechaEmision ? 'Indique la fecha de emisión.'
    : !fields.inicia || !fields.finaliza ? 'Indique las fechas de inicio y fin del permiso.'
    : fields.finaliza < fields.inicia ? 'La fecha final debe ser igual o posterior al inicio.'
    : !fields.diaRetorno || fields.diaRetorno <= fields.finaliza ? 'Indique un día de retorno posterior al fin del permiso.'
    : !fields.tiempoSolicitado.trim() ? 'Indique el tiempo solicitado.'
    : !fields.aprobadoPor.trim() ? 'Indique el nombre del aprobador.'
    : reason === 'Otros' && !detail.trim() ? 'Especifique el motivo del permiso en el campo de detalle.'
    : signature && !signatureUrl ? 'Seleccione un aprobador con firma o agregue su imagen en Administrar firmas y aprobadores.' : '';
  const emitSheets = (print = false) => {
    setShowValidation(true);
    if (validationMessage) { warning(validationMessage); return; }
    setEmitted(true);
    if (print) window.print();
  };
  const input = (label: string, key: keyof OfficialSheetData, type = 'text') => <label>{label}<input className="form-input" type={type} value={fields[key] || ''} onChange={e => update(key, e.target.value)} /></label>;
  const changeDates = (start: string, end: string) => {
    const correctedEnd = start && end && end < start ? start : end;
    const days = Math.round((Date.parse(correctedEnd + 'T00:00:00Z') - Date.parse(start + 'T00:00:00Z')) / 86400000) + 1;
    setFields(f => ({ ...f, inicia: start, finaliza: correctedEnd, diaRetorno: nextDay(correctedEnd), tiempoSolicitado: days > 0 ? `${days} DÍA${days === 1 ? '' : 'S'} (JORNADA COMPLETA)` : '' }));
  };
  return <div className="permission-sheet-page worker-leave-page">
    <div className="no-print">
      <h2>Permisos y licencias</h2>
      <p>Emisión individual o masiva en el formato oficial. Estos permisos no descuentan días de compensación.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <Button variant="secondary" icon={<FileText size={16} />} onClick={() => emitSheets()}>Emitir {bulk ? 'papeletas' : 'papeleta de permiso'}</Button>
        <Button variant="primary" icon={<Printer size={16} />} onClick={() => emitSheets(true)}>Imprimir {bulk ? `lote (${sheets.length})` : 'papeleta'} / PDF</Button>
      </div>
      {showValidation && validationMessage && <p role="alert" style={{ color: '#b91c1c', fontWeight: 600 }}>{validationMessage}</p>}
      {emitted && <p role="status">{sheets.length === 1 ? 'Papeleta lista' : `${sheets.length} papeletas listas`}. Pulse Imprimir para abrir la impresión o guardar como PDF.</p>}
      <div className="permission-mode-tabs">
        <button className={`permission-mode-tab-btn ${!bulk ? 'active' : ''}`} onClick={() => { setBulk(false); setSelected(ids => ids.slice(0, 1)); }}>Individual</button>
        <button className={`permission-mode-tab-btn ${bulk ? 'active' : ''}`} onClick={() => setBulk(true)}>Masivo</button>
      </div>
    </div>
    <div className="permission-workspace">
      <div className="permission-controls-card">
        <label>Buscar trabajador<input className="form-input" value={search} onChange={e => onSearch(e.target.value)} placeholder="DNI, código, nombre o área" /></label>
        <small>{employees.length} trabajadores del padrón · {filtered.length} coincidencia(s). Un DNI o código exacto carga la papeleta automáticamente.</small>
        {bulk && <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setSelected(ids => [...new Set([...ids, ...filtered.map(e => e.id)])])}>Seleccionar resultados</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setSelected([])}>Limpiar selección</button>
        </div>}
        <div style={{ maxHeight: 210, minHeight: 80, overflowY: 'auto', flexShrink: 0 }}>
          {filtered.map(e => <label key={e.id} style={{ display: 'flex', gap: 8, padding: '6px 0' }}>
            <input type={bulk ? 'checkbox' : 'radio'} name="leave-employee" checked={selected.includes(e.id)} onChange={event => setSelected(ids => bulk ? event.target.checked ? [...ids, e.id] : ids.filter(id => id !== e.id) : [e.id])} />
            <span>{e.apellidosNombres}<small style={{ display: 'block' }}>{e.documentoIdentidad} · {e.codigo} · {e.area} · {e.estado}</small></span>
          </label>)}
          {filtered.length === 0 && <p role="status">No se encontró ese trabajador en el padrón de Empleados. Revise el DNI, código o nombre.</p>}
        </div>
        <strong>{chosen.length} trabajador(es) seleccionado(s)</strong>
        <label>Motivo<select className="form-input" value={reason} onChange={e => setReason(e.target.value)}>{REASONS.map(r => <option key={r}>{r}</option>)}</select></label>
        <label>{reason === 'Otros' ? 'Especifique el motivo (obligatorio)' : 'Detalle del motivo (opcional)'}<input className="form-input" value={detail} onChange={e => setDetail(e.target.value)} maxLength={160} /></label>
        <label>Sede<select className="form-input" value={fields.sede} onChange={e => update('sede', e.target.value)}>{SEDES_LIST.map(s => <option key={s}>{s}</option>)}</select></label>
        {input('Fecha de emisión', 'fechaEmision', 'date')}
        <label>Inicio<input className="form-input" type="date" value={fields.inicia} onChange={e => changeDates(e.target.value, fields.finaliza)} /></label>
        <label>Fin<input className="form-input" type="date" min={fields.inicia} value={fields.finaliza} onChange={e => changeDates(fields.inicia, e.target.value)} /></label>
        {input('Día de retorno', 'diaRetorno', 'date')}
        {input('Tiempo solicitado (editable)', 'tiempoSolicitado')}
        {input('Responsable inmediato', 'responsableInmediato')}
        <label>Aprobador registrado<select className="form-input" value={signatureApproverId} onChange={e => selectApprover(e.target.value)}><option value="">Seleccionar / ingreso manual</option>{approvers.map(a => <option key={a.id} value={a.id}>{a.nombreCompleto}</option>)}</select></label>
        <Button variant="secondary" size="sm" onClick={() => setManageApprovers(true)}>Administrar firmas y aprobadores</Button>
        {input('Nombre del aprobador', 'aprobadoPor')}
        {input('Cargo del aprobador', 'cargoAprobador')}
        <label>Observaciones / sustento<textarea className="form-input" value={fields.observaciones} onChange={e => update('observaciones', e.target.value)} maxLength={400} /></label>
        <label><input type="checkbox" checked={signature} onChange={e => setSignature(e.target.checked)} /> Incluir firma de RRHH</label>
        {signature && <label>Firma<select className="form-input" value={signatureApproverId} onChange={e => selectApprover(e.target.value)}><option value="">Seleccione una firma registrada</option>{approvers.filter(a => a.firmaUrl).map(a => <option key={a.id} value={a.id}>{a.nombreCompleto}</option>)}</select></label>}
        {signature && signatureUrl && <img src={signatureUrl} alt="Firma seleccionada" style={{ maxWidth: 220, maxHeight: 80, objectFit: 'contain' }} />}
        <p style={{ fontSize: 12 }}>Las fechas y duración se indican según el permiso autorizado. El retorno debe ser posterior al último día del permiso.</p>
        <Button variant="primary" icon={<Printer size={16} />} onClick={() => emitSheets(true)}>Imprimir / guardar PDF ({sheets.length} hoja{sheets.length === 1 ? '' : 's'})</Button>
      </div>
      <div className="permission-preview-wrapper">
        {sheets.length === 0 && <p className="no-print">Selecciona uno o varios trabajadores para ver sus permisos.</p>}
        {sheets.map(data => <div className="no-print" key={data.id} style={{ width: '100%' }}><p>{data.apellidosNombres}</p><DualPermissionSheetDoc data={data} showRrhhSignature={signature} rrhhSignatureUrl={signatureUrl} /></div>)}
        <div className="print-only-container" style={{ width: '100%' }}>{sheets.map(data => <DualPermissionSheetDoc key={data.id} data={data} isPrintable showRrhhSignature={signature} rrhhSignatureUrl={signatureUrl} />)}</div>
      </div>
    </div>
    <ApproversManagementModal isOpen={manageApprovers} onClose={() => setManageApprovers(false)} onApproversChange={() => setApproversRefresh(value => value + 1)} />
  </div>;
};
