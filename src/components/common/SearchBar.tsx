import React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Buscar...',
  className = '',
  autoFocus = false,
  onKeyDown,
  onFocus,
  onBlur
}) => {
  return (
    <div className={`search-input-container ${className}`}>
      <Search size={18} className="search-input-icon" />
      <input
        type="text"
        className="search-input-field"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        autoFocus={autoFocus}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          style={{
            position: 'absolute',
            right: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#94a3b8',
            padding: '2px',
            display: 'flex',
            alignItems: 'center'
          }}
          title="Limpiar búsqueda"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};
