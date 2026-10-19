# ADPmodul - Sistema de Gestión de Empleados y Control de Días de Compensación

Sistema web administrativo diseñado para gestionar empleados, catálogo de feriados y el ciclo de vida estricto de días pendientes de compensación (**1 día trabajado = 1 día pendiente = 1 compensación**).

---

## 🚀 Inicio Rápido

### 1. Requisitos Previos
* **Node.js**: v18 o superior
* **NPM**: v9 o superior

### 2. Comandos Principales

```bash
# Iniciar servidor de desarrollo en http://localhost:5173
npm run dev

# Ejecutar batería completa de pruebas de reglas de negocio
npm test

# Construir para producción (TypeScript + Bundle optimizado)
npm run build

# Previsualizar build de producción
npm run preview
```

---

## 🏛️ Arquitectura del Sistema

El proyecto sigue una arquitectura desacoplada en capas:

```
adpmodul/
├── src/
│   ├── types/                  # Modelos e interfaces del dominio (TypeScript)
│   ├── validators/             # Reglas de validación pura e integridad
│   ├── storage/                # Persistencia reactiva tipada y datos semilla (Feriados Perú 2026)
│   │   ├── db.ts               # Driver LocalStorage con sincronización y listeners
│   │   └── seedData.ts         # Feriados oficiales 2026 y empleados demo
│   ├── services/               # Lógica de negocio (Empleados, Feriados, Compensaciones, Dashboard)
│   ├── context/                # Contextos React (App y Toasts Notificaciones)
│   ├── components/
│   │   ├── common/             # Componentes UI reutilizables (Badge, Modal, ConfirmModal, SearchBar, StatCard, Button, Input, Select)
│   │   ├── layout/             # Sidebar lateral, Header, AppLayout
│   │   ├── dashboard/          # Dashboard con KPIs y ranking de trabajadores con pendientes
│   │   ├── employees/          # Lista con buscador en tiempo real, modales de creación, edición e historial
│   │   ├── holidays/           # Catálogo de feriados oficiales con filtro por año
│   │   └── compensations/      # Panel operativo por empleado, programación modal 1:1, registro rápido y listado global
│   ├── styles/                 # Sistema de diseño con Vanilla CSS profesional y tokens modulares
│   ├── App.tsx                 # Enrutamiento modular de vistas
│   └── main.tsx                # Entrada React
├── test_suite.mjs              # Suite automatizada de pruebas de reglas de negocio (100% cobertura)
├── package.json
└── tsconfig.json
```

---

## 📋 Módulos Implementados

### 1. Dashboard General
* **Tarjetas KPI**: Trabajadores Activos, Total Días Pendientes, Compensaciones Programadas, Compensaciones Realizadas.
* **Tabla de Acción Rápida**: "Trabajadores con más días pendientes" con botón `Administrar` que abre directamente el panel del trabajador.

### 2. Módulo de Empleados
* **Buscador dinámico en tiempo real**: Filtra instantáneamente mientras escribe por Código, DNI o Apellidos y nombres.
* **Filtros combinados**: Por Área, Tipo de trabajador y Estado (`ACTIVO`, `CESADO`).
* **Acciones**: Registrar, Editar, Ver Historial Completo, Cambiar Estado (`ACTIVO` / `CESADO`).
* **Protección**: Bloqueo de eliminación física para empleados con registros históricos.

### 3. Módulo de Feriados
* Catálogo oficial precargado con los **16 feriados oficiales de Perú para el año 2026**.
* Filtro por año.
* Registro de nuevos feriados con validación para **evitar fechas duplicadas**.
* Activación / desactivación de feriados.

### 4. Módulo de Compensaciones (Núcleo Operativo 1:1)
* **Panel por Trabajador**:
  * Buscador rápido por DNI, código o nombre con sugerencias desplegables inmediatas.
  * Tarjeta Hero con datos del trabajador y resumen numérico (Generados, Pendientes, Programados, Compensados, Anulados).
  * Tabla con flujo de estados y acciones directas:
    * `PENDIENTE`: Botón **Compensar** (Abre modal para asignar `FechaCompensacion` ➔ Pasa a `PROGRAMADO`).
    * `PROGRAMADO`: Botón **Marcar como Compensado** (Pasa a `COMPENSADO`) | Botón **Editar Fecha** | Botón **Anular**.
    * `COMPENSADO`: Badge verde y visualización de detalle.
    * `ANULADO`: Badge gris con registro del motivo de anulación.
* **Botón `+ Generar Día Trabajado`**: Selección guiada con sugerencias de feriados para registrar en 2 clics.
* **Listado General / Historial Global**: Filtros por año, mes, estado, área y trabajador.

---

## 🔒 Reglas de Negocio Estrictas
1. **Relación Estricta 1 a 1**: `1 día trabajado que genera compensación = 1 día pendiente = 1 fecha de compensación`.
2. **Unicidad**:
   * No se permite duplicar códigos ni números de documento de identidad.
   * No se permite duplicar fechas en feriados.
   * No se permite registrar dos veces el mismo día generado para el mismo empleado (salvo si el anterior fue `ANULADO`).
3. **Integridad de Estados**:
   * No se puede compensar un registro `ANULADO`.
   * Un registro `COMPENSADO` no puede ser reprogramado directamente.
   * La anulación requiere confirmación y registro obligatorio de motivo.
