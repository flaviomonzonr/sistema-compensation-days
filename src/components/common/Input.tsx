import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  required?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helper,
  required,
  id,
  className = '',
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
          {required && <span className="required-mark">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={`form-input ${error ? 'has-error' : ''} ${className}`}
        {...props}
      />
      {error && <span className="form-error">{error}</span>}
      {!error && helper && <span className="form-helper">{helper}</span>}
    </div>
  );
};
