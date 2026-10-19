import React from 'react';
import { OfficialPermissionSheetDoc, OfficialSheetData } from './OfficialPermissionSheetDoc';

interface DualPermissionSheetDocProps {
  data: OfficialSheetData;
  className?: string;
  isPrintable?: boolean;
  showRrhhSignature?: boolean;
  rrhhSignatureUrl?: string;
}

export const DualPermissionSheetDoc: React.FC<DualPermissionSheetDocProps> = ({
  data,
  className = '',
  isPrintable = false,
  showRrhhSignature = false,
  rrhhSignatureUrl = ''
}) => {
  return (
    <div className={`dual-permission-sheet ${className}`}>
      {/* PARTE SUPERIOR */}
      <div className="dual-half-container dual-half-top">
        <OfficialPermissionSheetDoc
          data={data}
          isPrintable={isPrintable}
          showRrhhSignature={showRrhhSignature}
          rrhhSignatureUrl={rrhhSignatureUrl}
        />
      </div>

      {/* LÍNEA DIVISORIA DE CORTE */}
      <div className="permission-cut-divider">
        <span className="cut-icon">✂</span>
      </div>

      {/* PARTE INFERIOR (COPIA EXACTA) */}
      <div className="dual-half-container dual-half-bottom">
        <OfficialPermissionSheetDoc
          data={data}
          isPrintable={isPrintable}
          showRrhhSignature={showRrhhSignature}
          rrhhSignatureUrl={rrhhSignatureUrl}
        />
      </div>
    </div>
  );
};
