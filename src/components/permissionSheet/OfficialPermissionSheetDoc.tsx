import React from 'react';
import { formatDateDisplay } from '../../utils/dateUtils';

export type SedeType =
  | 'FUNDO IV PALOS'
  | 'PLANTA IV PALOS'
  | 'PLANTA SECHIN FRESCO'
  | 'PLANTA SECHIN CONGELADO'
  | 'OFICINA CASMA'
  | 'OFICINA SECHIN'
  | 'OFICINA LIMA';

export type MotivoType = 'SALUD' | 'PERSONAL' | 'CAPACITACION' | 'ESTUDIOS' | 'OTROS';

export interface OfficialSheetData {
  id?: string;
  fechaEmision: string;
  sede: SedeType;
  tipoDocumento: string;
  numeroDocumento: string;
  apellidosNombres: string;
  condicionLaboral: 'OBRERO' | 'EMPLEADO';
  labor: string;
  responsableInmediato: string;
  tiempoSolicitado: string;
  motivo: MotivoType;
  motivoOtroEspecifique?: string;
  aprobadoPor: string;
  cargoAprobador: string;
  inicia: string;
  finaliza: string;
  diaRetorno: string;
  observaciones: string;
}

export const SEDES_LIST: SedeType[] = [
  'FUNDO IV PALOS',
  'PLANTA IV PALOS',
  'PLANTA SECHIN FRESCO',
  'PLANTA SECHIN CONGELADO',
  'OFICINA CASMA',
  'OFICINA SECHIN',
  'OFICINA LIMA'
];

interface OfficialPermissionSheetDocProps {
  data: OfficialSheetData;
  className?: string;
  isPrintable?: boolean;
  showRrhhSignature?: boolean;
  rrhhSignatureUrl?: string;
}

export const OfficialPermissionSheetDoc: React.FC<OfficialPermissionSheetDocProps> = ({
  data,
  className = '',
  isPrintable = false,
  showRrhhSignature = false,
  rrhhSignatureUrl = ''
}) => {

  return (
    <div
      className={`official-permission-doc ${isPrintable ? 'official-permission-doc-printable' : ''} ${className}`}
    >
      {/* 1. ENCABEZADO INSTITUCIONAL */}
      <div className="doc-header-block">
        <table className="doc-header-table">
          <tbody>
            <tr>
              {/* LOGO CHAVIN Y DIRECCIÓN */}
              <td className="doc-hdr-left">
                <div className="doc-hdr-logo-container">
                  <img
                    src="/logo-chavin.png"
                    alt="Chavín"
                    className="chavin-hdr-logo"
                  />
                  <div className="chavin-hdr-address">
                    Car. Carretera Casma - Huaraz<br />
                    Nro. S/N Monte Grande (Sector Sechín Alto)<br />
                    Ancash, Casma, Buena Vista Alta, Perú.
                  </div>
                </div>
              </td>

              {/* TÍTULO CENTRAL */}
              <td className="doc-hdr-center">
                <div className="doc-hdr-company">
                  AGRICOLA Y GANADERA CHAVIN DE HUANTAR S.A.
                </div>
                <div className="doc-hdr-title">
                  HOJA DE PERMISO DEL PERSONAL
                </div>
              </td>

              {/* METADATA OFICIAL */}
              <td className="doc-hdr-right">
                <div className="doc-meta-row">
                  <span className="doc-meta-lbl">Código:</span> AGCH-R-RH-770-02
                </div>
                <div className="doc-meta-row">
                  <span className="doc-meta-lbl">Versión:</span> 02
                </div>
                <div className="doc-meta-row doc-meta-row-last">
                  <span className="doc-meta-lbl">Fecha Aprob.:</span> 01/08/2025
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 2. CUERPO PRINCIPAL DEL FORMATO (TABLA INSTITUCIONAL FIJA DE 9 COLUMNAS) */}
      <table className="doc-main-table">
        <colgroup>
          <col style={{ width: '9.75%' }} />
          <col style={{ width: '9.75%' }} />
          <col style={{ width: '11.5%' }} />
          <col style={{ width: '11.5%' }} />
          <col style={{ width: '11.5%' }} />
          <col style={{ width: '11.5%' }} />
          <col style={{ width: '11.5%' }} />
          <col style={{ width: '11.5%' }} />
          <col style={{ width: '11.5%' }} />
        </colgroup>
        <tbody>
          {/* FILA 1: FECHA */}
          <tr>
            <td colSpan={2} className="doc-lbl-cell">
              FECHA:
            </td>
            <td colSpan={7} className="doc-val-cell">
              {formatDateDisplay(data.fechaEmision) || '-'}
            </td>
          </tr>

          {/* FILA 2 & 3: SEDE */}
          <tr>
            <td rowSpan={2} colSpan={2} className="doc-lbl-cell">
              SEDE:
            </td>
            <td className="doc-sede-hdr">
              FUNDO IV<br />PALOS
            </td>
            <td className="doc-sede-hdr">
              PLANTA IV<br />PALOS
            </td>
            <td className="doc-sede-hdr">
              PLANTA<br />SECHIN<br />FRESCO
            </td>
            <td className="doc-sede-hdr">
              PLANTA<br />SECHIN<br />CONGELADO
            </td>
            <td className="doc-sede-hdr">
              OFICINA<br />CASMA
            </td>
            <td className="doc-sede-hdr">
              OFICINA<br />SECHIN
            </td>
            <td className="doc-sede-hdr">
              OFICINA LIMA
            </td>
          </tr>
          <tr>
            {SEDES_LIST.map((s) => (
              <td key={s} className="doc-sede-check-cell">
                {data.sede === s ? 'X' : ''}
              </td>
            ))}
          </tr>

          {/* FILA 4, 5, 6: DATOS DEL TRABAJADOR Y CONDICION LABORAL */}
          <tr>
            <td className="doc-col-hdr">
              TIPO<br />DOCUMENTO
            </td>
            <td className="doc-col-hdr">
              NUMERO<br />DOCUMENTO
            </td>
            <td colSpan={5} className="doc-col-hdr">
              APELLIDOS Y NOMBRES
            </td>
            <td colSpan={2} className="doc-col-hdr">
              CONDICION LABORAL
            </td>
          </tr>
          <tr>
            <td className="doc-val-cell-center" style={{ height: '17px' }}>
              {data.tipoDocumento || 'D.N.I.'}
            </td>
            <td className="doc-val-cell-center">
              {data.numeroDocumento || '-'}
            </td>
            <td rowSpan={2} colSpan={5} className="doc-worker-name-cell">
              {data.apellidosNombres || '-'}
            </td>
            <td colSpan={2} className="doc-condicion-item-cell">
              OBRERO {data.condicionLaboral === 'OBRERO' ? ' [ X ]' : ' [   ]'}
            </td>
          </tr>
          <tr>
            <td className="doc-val-cell-center doc-sub-label" style={{ height: '17px' }}>
              OBRERO
            </td>
            <td className="doc-val-cell-center doc-sub-label">
              SECHIN
            </td>
            <td colSpan={2} className="doc-condicion-item-cell">
              EMPLEADO {data.condicionLaboral === 'EMPLEADO' ? ' [ X ]' : ' [   ]'}
            </td>
          </tr>

          {/* FILA 7: LABOR Y RESPONSABLE INMEDIATO */}
          <tr>
            <td colSpan={2} className="doc-lbl-cell">
              LABOR:
            </td>
            <td colSpan={3} className="doc-val-cell">
              {data.labor || '-'}
            </td>
            <td colSpan={2} className="doc-lbl-cell" style={{ fontSize: '7.5px' }}>
              RESPONSABLE INMEDIATO:
            </td>
            <td colSpan={2} className="doc-val-cell">
              {data.responsableInmediato || '-'}
            </td>
          </tr>

          {/* FILA 8: TIEMPO SOLICITADO */}
          <tr>
            <td colSpan={2} className="doc-lbl-cell">
              TIEMPO SOLICITADO:
            </td>
            <td colSpan={7} className="doc-val-cell" style={{ textTransform: 'uppercase' }}>
              {data.tiempoSolicitado || '1 DÍA (JORNADA COMPLETA)'}
            </td>
          </tr>

          {/* FILA 9 & 10: MOTIVOS DEL PERMISO */}
          <tr>
            <td rowSpan={2} colSpan={2} className="doc-lbl-cell">
              PERMISO POR MOTIVOS DE:
            </td>
            <td className="doc-motivo-hdr">SALUD</td>
            <td className="doc-motivo-hdr">PERSONAL</td>
            <td className="doc-motivo-hdr">CAPACITACION</td>
            <td className="doc-motivo-hdr">ESTUDIOS</td>
            <td colSpan={3} className="doc-motivo-hdr">OTROS (Especifique)</td>
          </tr>
          <tr>
            <td className="doc-motivo-check-cell">{data.motivo === 'SALUD' ? 'X' : ''}</td>
            <td className="doc-motivo-check-cell">{data.motivo === 'PERSONAL' ? 'X' : ''}</td>
            <td className="doc-motivo-check-cell">{data.motivo === 'CAPACITACION' ? 'X' : ''}</td>
            <td className="doc-motivo-check-cell">{data.motivo === 'ESTUDIOS' ? 'X' : ''}</td>
            <td colSpan={3} className="doc-motivo-otros-cell">
              {data.motivo === 'OTROS'
                ? `[ X ] ${data.motivoOtroEspecifique || 'COMPENSACIÓN DE DÍA TRABAJADO'}`
                : '[   ]'}
            </td>
          </tr>

          {/* FILA 11: APROBADO POR Y CARGO */}
          <tr>
            <td colSpan={2} className="doc-lbl-cell">
              APROBADO POR:
            </td>
            <td colSpan={3} className="doc-val-cell">
              {data.aprobadoPor || '-'}
            </td>
            <td colSpan={2} className="doc-lbl-cell">
              CARGO:
            </td>
            <td colSpan={2} className="doc-val-cell">
              {data.cargoAprobador || '-'}
            </td>
          </tr>

          {/* FILA 12: INICIA Y FINALIZA */}
          <tr>
            <td colSpan={2} className="doc-lbl-cell">
              INICIA:
            </td>
            <td colSpan={3} className="doc-val-cell">
              {data.inicia ? formatDateDisplay(data.inicia) : '-'}
            </td>
            <td colSpan={2} className="doc-lbl-cell">
              FINALIZA:
            </td>
            <td colSpan={2} className="doc-val-cell">
              {data.finaliza ? formatDateDisplay(data.finaliza) : '-'}
            </td>
          </tr>

          {/* FILA 13: DIA DE RETORNO */}
          <tr>
            <td colSpan={2} className="doc-lbl-cell">
              DIA DE RETORNO:
            </td>
            <td colSpan={7} className="doc-val-cell">
              {data.diaRetorno ? formatDateDisplay(data.diaRetorno) : '-'}
            </td>
          </tr>

          {/* FILA 14: OBSERVACIONES */}
          <tr>
            <td colSpan={9} className="doc-observaciones-cell">
              <div className="doc-observaciones-title">OBSERVACIONES:</div>
              <div className="doc-observaciones-content">
                {data.observaciones || '-'}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* 3. RECUADROS DE FIRMAS (5 RECUADROS EXACTOS) */}
      <div className="doc-signatures-grid">
        {/* 1. TRABAJADOR */}
        <div className="doc-sig-box">
          <div className="doc-sig-content"></div>
          <div className="doc-sig-line"></div>
          <div className="doc-sig-label">TRABAJADOR</div>
        </div>

        {/* 2. JEFE DE AREA */}
        <div className="doc-sig-box">
          <div className="doc-sig-content"></div>
          <div className="doc-sig-line"></div>
          <div className="doc-sig-label">JEFE DE AREA</div>
        </div>

        {/* 3. JEFE DE RRHH */}
        <div className={`doc-sig-box doc-sig-box-rrhh ${showRrhhSignature && rrhhSignatureUrl ? 'doc-sig-box-has-stamp' : ''}`}>
          {showRrhhSignature && rrhhSignatureUrl ? (
            <div className="doc-sig-stamp-full">
              <img
                src={rrhhSignatureUrl}
                alt="Firma y Sello RRHH"
                className="doc-sig-rrhh-img"
              />
            </div>
          ) : (
            <>
              <div className="doc-sig-content"></div>
              <div className="doc-sig-line"></div>
              <div className="doc-sig-label">JEFE DE RRHH</div>
            </>
          )}
        </div>

        {/* 4. GERENCIA DE OPER. */}
        <div className="doc-sig-box">
          <div className="doc-sig-content"></div>
          <div className="doc-sig-line"></div>
          <div className="doc-sig-label">GERENCIA DE OPER.</div>
        </div>

        {/* 5. GERENCIA GENERAL */}
        <div className="doc-sig-box">
          <div className="doc-sig-content"></div>
          <div className="doc-sig-line"></div>
          <div className="doc-sig-label">GERENCIA GENERAL</div>
        </div>
      </div>
    </div>
  );
};
