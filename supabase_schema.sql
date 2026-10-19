-- ==============================================================================
-- SISTEMA DE GESTIÓN DE COMPENSACIONES - ESQUEMA PARA SUPABASE (POSTGRESQL)
-- ==============================================================================
-- Copia y pega este script completo en el SQL Editor de tu consola de Supabase
-- y presiona "RUN".
-- ==============================================================================

-- 1. TABLA: empleados
CREATE TABLE IF NOT EXISTS public.empleados (
    id TEXT PRIMARY KEY,
    codigo TEXT NOT NULL,
    apellidos_nombres TEXT NOT NULL,
    documento_identidad TEXT NOT NULL,
    fecha_ingreso DATE NOT NULL,
    fecha_cese DATE,
    tipo_trabajador TEXT NOT NULL DEFAULT 'EMPLEADO',
    area TEXT NOT NULL,
    cargo TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'ACTIVO',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABLA: feriados
CREATE TABLE IF NOT EXISTS public.feriados (
    id TEXT PRIMARY KEY,
    fecha DATE NOT NULL,
    descripcion TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'ACTIVO',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABLA: compensaciones
CREATE TABLE IF NOT EXISTS public.compensaciones (
    id TEXT PRIMARY KEY,
    empleado_id TEXT NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
    fecha_generada DATE NOT NULL,
    fecha_compensacion DATE,
    estado TEXT NOT NULL DEFAULT 'PENDIENTE',
    observacion TEXT DEFAULT '',
    motivo_anulacion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABLA: aprobadores (para la hoja de autorización / papeleta)
CREATE TABLE IF NOT EXISTS public.aprobadores (
    id TEXT PRIMARY KEY,
    nombre_completo TEXT NOT NULL,
    cargo TEXT NOT NULL,
    area TEXT NOT NULL,
    documento_identidad TEXT,
    estado TEXT NOT NULL DEFAULT 'ACTIVO',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- ÍNDICES DE RENDIMIENTO
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_empleados_codigo ON public.empleados(codigo);
CREATE INDEX IF NOT EXISTS idx_empleados_doc ON public.empleados(documento_identidad);
CREATE INDEX IF NOT EXISTS idx_empleados_estado ON public.empleados(estado);

CREATE INDEX IF NOT EXISTS idx_feriados_fecha ON public.feriados(fecha);

CREATE INDEX IF NOT EXISTS idx_compensaciones_empleado ON public.compensaciones(empleado_id);
CREATE INDEX IF NOT EXISTS idx_compensaciones_fecha_gen ON public.compensaciones(fecha_generada);
CREATE INDEX IF NOT EXISTS idx_compensaciones_estado ON public.compensaciones(estado);

-- ==============================================================================
-- SEGURIDAD (ROW LEVEL SECURITY - RLS)
-- Habilita el acceso completo para la clave anónima del proyecto
-- ==============================================================================
ALTER TABLE public.empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feriados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compensaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aprobadores ENABLE ROW LEVEL SECURITY;

-- Políticas para empleados
DROP POLICY IF EXISTS "Acceso total empleados anon" ON public.empleados;
CREATE POLICY "Acceso total empleados anon" ON public.empleados FOR ALL USING (true) WITH CHECK (true);

-- Políticas para feriados
DROP POLICY IF EXISTS "Acceso total feriados anon" ON public.feriados;
CREATE POLICY "Acceso total feriados anon" ON public.feriados FOR ALL USING (true) WITH CHECK (true);

-- Políticas para compensaciones
DROP POLICY IF EXISTS "Acceso total compensaciones anon" ON public.compensaciones;
CREATE POLICY "Acceso total compensaciones anon" ON public.compensaciones FOR ALL USING (true) WITH CHECK (true);

-- Políticas para aprobadores
DROP POLICY IF EXISTS "Acceso total aprobadores anon" ON public.aprobadores;
CREATE POLICY "Acceso total aprobadores anon" ON public.aprobadores FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- HABILITAR REALTIME (Para sincronización en vivo entre usuarios)
-- ==============================================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.empleados;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.feriados;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.compensaciones;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.aprobadores;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;
