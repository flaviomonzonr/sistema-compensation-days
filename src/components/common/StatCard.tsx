import React from 'react';

export interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  colorTheme?: 'blue' | 'amber' | 'indigo' | 'emerald';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  colorTheme = 'blue',
  onClick
}) => {
  return (
    <div
      className="stat-card"
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <div className={`stat-icon-wrapper stat-icon-${colorTheme}`}>{icon}</div>
      <div className="stat-info">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{value}</span>
      </div>
    </div>
  );
};
