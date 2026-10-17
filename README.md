# Nuestra Esencia 🍽️

**Sistema de gestión integral para un local gastronómico de comidas al paso.**

![SvelteKit](https://img.shields.io/badge/SvelteKit-2-FF3E00?logo=svelte&logoColor=white)
![Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)

> Proyecto de software comercial desarrollado por [Gustavo Faccendini](https://github.com/gustavo180591).

## 🎯 Objetivo

Digitalizar la operación diaria de un comercio gastronómico: registrar ventas, organizar productos, controlar caja, gestionar abastecimiento y disponer de información para tomar decisiones.

## ✨ Funcionalidades representadas en el proyecto

| Área | Funcionalidades |
| --- | --- |
| Punto de venta (POS) | Carrito, formatos de venta, descuentos, métodos de pago y cobro |
| Productos | Categorías, combos y presentaciones / formatos de venta |
| Inventario | Movimientos y consultas de stock |
| Compras | Proveedores, órdenes / registros de compra y sus ítems |
| Caja | Aperturas, cierres, movimientos y arqueos |
| Gestión comercial | Clientes, cuenta corriente y ventas |
| Administración | Usuarios, gastos, medios de pago y reportes |

El alcance anterior se basa en rutas, componentes y entidades presentes en el repositorio. Algunas funciones pueden requerir datos, permisos o configuración adicional.

## 🧱 Tecnologías y organización

- **Frontend y servidor:** SvelteKit 2, Svelte 5, TypeScript.
- **Estilos:** Tailwind CSS 4.
- **Base de datos:** PostgreSQL, Prisma ORM 6.
- **Autenticación:** integración con Auth.js para SvelteKit.
- **Pruebas y calidad:** Vitest, Playwright, ESLint y Prettier configurados.
- **Infraestructura:** Docker y configuración de despliegue mediante Node.js.

```text
src/routes/         Página pública, login, POS, administración y APIs
src/components/     Componentes de interfaz reutilizables
prisma/             Modelos relacionales, migraciones y seed
docker-compose.yml  Servicios para el entorno de contenedores
```

## 🧑‍💼 Flujos de uso

**Operación de caja y ventas:** se prepara una venta en `/pos`, se eligen productos o combos, se calcula el importe y se registra el medio de pago.

**Administración:** el área `/admin` contiene secciones específicas para ventas, productos, compras, stock, clientes, caja, gastos, proveedores y reportes.

**Persistencia:** las transacciones se apoyan en modelos de ventas, ítems, compras, movimientos de stock y movimientos de caja.

## 🚀 Desarrollo local

**Requisitos:** Node.js compatible, npm y PostgreSQL. Usá datos ficticios de prueba.

```bash
git clone https://github.com/gustavo180591/nuestra-esencia.git
cd nuestra-esencia
npm ci
```

Creá un archivo local `.env` con las variables exigidas por la configuración del proyecto. Como mínimo, Prisma necesita `DATABASE_URL` apuntando a una base PostgreSQL de desarrollo. La autenticación puede requerir variables adicionales según el entorno. **Nunca subas secretos al repositorio.**

Luego:

```bash
npx prisma generate
npx prisma migrate dev
npm run dev
```

Antes de migrar una base existente, revisá las migraciones y realizá un respaldo. El `seed` puede modificar datos: ejecutalo únicamente después de inspeccionarlo y sobre una base descartable.

## ✅ Verificaciones disponibles

```bash
npm run check
npm run lint
npm run build
npm run test:unit -- --run
npm run test:e2e
```

Estos comandos figuran en el proyecto; **no se afirma aquí que las pruebas hayan sido ejecutadas o aprobadas**.

## 🖼️ Capturas de pantalla

Pendiente de incorporar capturas reales del **POS**, la **administración de productos** y el **control de caja**, utilizando únicamente datos ficticios o imágenes autorizadas. No se incluyen capturas inventadas.

## 🔎 Aspectos técnicos destacados

- Modelo relacional con ventas, compras y caja conectadas a productos, clientes y proveedores.
- Separación entre experiencia de punto de venta y panel administrativo.
- Manejo de distintos formatos y combos de productos.
- Herramientas de control de stock y consulta de reportes.

---

**Desarrollo:** [Gustavo Faccendini](https://github.com/gustavo180591) · [LinkedIn](https://www.linkedin.com/in/gustavo-faccendini-9a209816b/)
