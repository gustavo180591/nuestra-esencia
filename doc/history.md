# Sistema de Gestión Integral - Nuestra Esencia

---

## 1. Visión del Proyecto

Desarrollar un sistema web integral para la gestión del negocio "Nuestra Esencia (Sabores al Paso)" que permita controlar operaciones comerciales, inventario y tomar decisiones basadas en datos reales.

---

## 2. Objetivos del Sistema

- Centralizar la gestión de ventas, productos y stock
- Automatizar el control de inventario
- Proporcionar reportes para toma de decisiones
- Garantizar trazabilidad de operaciones
- Optimizar procesos administrativos

---

## 3. Actores del Sistema

- **Administrador**: Gestión completa del sistema
- **Vendedor**: Registro de ventas y consultas
- **Encargado de Compras**: Gestión de proveedores y stock
- **Dueño**: Acceso a reportes y análisis

---

## 4. Épicas Funcionales

### 4.1 Gestión de Ventas (E001)

**Historia de Usuario**

- **Como** vendedor
- **Quiero** registrar ventas de productos
- **Para** llevar control de ingresos y stock

**Criterios de aceptación:**

- Venta por unidad, media docena, docena, peso (kg) y porción
- Cálculo automático de totales
- Descuento automático de stock
- Soporte para múltiples productos por transacción
- Registro histórico de ventas

### 4.2 Gestión de Productos (E002)

**Historia de Usuario**

- **Como** administrador
- **Quiero** gestionar el catálogo de productos
- **Para** mantener actualizada la oferta comercial

**Criterios de aceptación:**

- Campos: nombre, tipo de venta, precio, stock actual
- Clasificación por categorías (panificados, fritos, etc.)
- Estados activo/inactivo
- Configuración de múltiples formatos de venta

### 4.3 Control de Inventario (E003)

**Historia de Usuario**

- **Como** administrador
- **Quiero** controlar el inventario
- **Para** evitar faltantes y optimizar compras

**Criterios de aceptación:**

- Actualización automática por ventas y compras
- Alertas de stock bajo
- Historial de movimientos
- Reporte de estado actual

### 4.4 Gestión de Compras (E004)

**Historia de Usuario**

- **Como** encargado de compras
- **Quiero** registrar compras a proveedores
- **Para** controlar gastos y actualizar stock

**Criterios de aceptación:**

- Selección de proveedor existente o nuevo
- Registro de productos y cantidades
- Actualización automática de stock
- Historial de compras

### 4.5 Gestión de Proveedores (E005)

**Historia de Usuario**

- **Como** administrador
- **Quiero** gestionar proveedores
- **Para** mantener control de la cadena de suministro

**Criterios de aceptación:**

- CRUD completo de proveedores
- Información: nombre, teléfono, dirección, email
- Historial de compras por proveedor
- Estado activo/inactivo

### 4.6 Reportes y Análisis (E006)

**Historia de Usuario**

- **Como** dueño
- **Quiero** acceder a reportes del negocio
- **Para** analizar rendimiento y tomar decisiones

**Criterios de aceptación:**

- Reportes de ventas por período
- Productos más vendidos
- Análisis de ganancias
- Estado de inventario
- Exportación a PDF/Excel

## 5. Requisitos No Funcionales

### 5.1 Rendimiento

- Tiempo de respuesta < 2 segundos para operaciones CRUD
- Soporte concurrente para 3-5 usuarios simultáneos

### 5.2 Seguridad

- Autenticación de usuarios
- Roles y permisos diferenciados
- Validación de datos de entrada

### 5.3 Disponibilidad

- Disponibilidad 99% durante horario comercial (8:00-22:00)
- Backup automático diario

### 5.4 Usabilidad

- Interfaz intuitiva tipo caja registradora
- Acceso rápido a funciones frecuentes
- Responsive design para tablets

---

## 6. Reglas de Negocio

### 6.1 Gestión de Productos

- Un producto puede tener múltiples formatos de venta
- El precio varía según el formato (unidad vs docena)
- Productos por peso usan medición decimal
- Control de productos perecederos con fecha de vencimiento

### 6.2 Control de Stock

- Stock actualizado en tiempo real
- Unidades de medida mixtas (kg, unidades, porciones)
- Alerta automática al alcanzar stock mínimo
- Bloqueo de venta sin stock disponible

### 6.3 Operaciones Comerciales

- Cada venta debe registrar fecha, usuario y productos
- Las compras deben vincularse a proveedor
- Cancelación de ventas con motivo obligatorio

---

## 7. Plan de Implementación (MVP)

### Fase 1 - Core Business (Sprint 1-2)

- Gestión de productos básica
- Registro de ventas simple
- Control de stock automático
- Reporte diario de ventas

### Fase 2 - Operaciones (Sprint 3-4)

- Gestión de proveedores
- Registro de compras
- Reportes avanzados
- Alertas de stock

### Fase 3 - Optimización (Sprint 5-6)

- Análisis de tendencias
- Exportación de datos
- Mejoras UX
- Testing y estabilización

---

## 8. Arquitectura Técnica

### 8.1 Stack Tecnológico

- **Frontend**: SvelteKit + TailwindCSS
- **Backend**: API Routes SvelteKit
- **Base de Datos**: PostgreSQL + Prisma ORM
- **Despliegue**: Docker + Docker Compose
- **Testing**: Vitest + Playwright

### 8.2 Estructura de Datos

- Entidades: Productos, Ventas, Compras, Proveedores, Stock
- Relaciones: Ventas → Productos, Compras → Proveedores
- Auditoría: timestamps, usuario modificación

---

## 9. Próximos Pasos

1. **Modelo de Datos**: Diseñar esquema completo con Prisma
2. **Prototipo UI**: Mockups de interfaces clave
3. **API Endpoints**: Definir contratos de servicio
4. **Configuración**: Ambiente de desarrollo y Docker
5. **Desarrollo**: Implementación iterativa por fases
