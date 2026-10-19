import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '380px',
            padding: '2rem 1.5rem',
            margin: '1rem 0',
            background: '#ffffff',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            fontFamily: 'inherit'
          }}
        >
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: '#fef2f2',
              border: '2px solid #fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              color: '#dc2626'
            }}
          >
            <AlertTriangle size={28} />
          </div>

          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
            {this.props.fallbackTitle || 'Ocurrió un error al cargar esta sección'}
          </h3>

          <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '520px', lineHeight: 1.5, marginBottom: '1.25rem' }}>
            Se presentó una incidencia inesperada al procesar los datos de este módulo. Puede reintentar la carga o actualizar la página.
          </p>

          {this.state.error && (
            <details
              style={{
                width: '100%',
                maxWidth: '650px',
                textAlign: 'left',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem',
                fontSize: '0.75rem',
                color: '#334155'
              }}
            >
              <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#dc2626' }}>
                Ver detalles técnicos del error: {this.state.error.message}
              </summary>
              <pre
                style={{
                  marginTop: '0.5rem',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: '#475569',
                  fontFamily: 'monospace',
                  fontSize: '0.72rem'
                }}
              >
                {this.state.error.stack}
              </pre>
            </details>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={this.handleReset}
              icon={<RefreshCw size={14} />}
            >
              Reintentar Vista
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={this.handleReload}
              icon={<Home size={14} />}
            >
              Recargar Aplicación
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
