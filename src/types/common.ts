export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string>;
};

export type FilterOptions = {
  search?: string;
  area?: string;
  tipoTrabajador?: string;
  categoria?: string;
  estado?: string;
  year?: number;
  month?: number;
};

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}
