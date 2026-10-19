import React from 'react';

export interface BadgeProps {
  status: string;
  label?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ status, label, size = 'md' }) => {
  const normalized = status.toUpperCase();

  let badgeClass = 'badge-annulled';
  let displayLabel = label || status;

  switch (normalized) {
    case 'PENDIENTE':
      badgeClass = 'badge-pending';
      displayLabel = label || 'Pendiente';
      break;
    case 'PROGRAMADO':
      badgeClass = 'badge-scheduled';
      displayLabel = label || 'Programado';
      break;
    case 'COMPENSADO':
      badgeClass = 'badge-compensated';
      displayLabel = label || 'Compensado';
      break;
    case 'ANULADO':
      badgeClass = 'badge-annulled';
      displayLabel = label || 'Anulado';
      break;
    case 'ACTIVO':
      badgeClass = 'badge-active';
      displayLabel = label || 'Activo';
      break;
    case 'CESADO':
      badgeClass = 'badge-cesado';
      displayLabel = label || 'Cesado';
      break;
    case 'INACTIVO':
      badgeClass = 'badge-inactive';
      displayLabel = label || 'Inactivo';
      break;
    default:
      badgeClass = 'badge-annulled';
      break;
  }

  return (
    <span
      className={`badge ${badgeClass}`}
      style={size === 'sm' ? { fontSize: '0.7rem', padding: '0.15rem 0.5rem' } : undefined}
    >
      <span className="badge-dot" />
      {displayLabel}
    </span>
  );
};
