# Categorías, presupuestos y reportes: recorrido explícito

Actualización validada el 30 de octubre de 2026.

## Qué cambia en la aplicación

- Presupuestos: primero se elige una **categoría padre**. Después se define el límite de **una subcategoría** o, de forma explícita, un **techo para todo el grupo**. Cada selector muestra solo las opciones que corresponden. La creación rápida de un hijo mantiene fijo el padre seleccionado.
- Un presupuesto existente para esa categoría y mes se reutiliza mediante su edición; no se propone crear un duplicado. El listado ofrece Resumen por padre y Detallado por subcategoría, con grupos que se despliegan o contraen.
- Gastos, ingresos y programaciones recurrentes usan un selector compartido de categoría padre y subcategoría. La revisión de comprobantes de gasto utiliza la misma organización. Los borradores siguen guardando un único `categoryId`.
- Las categorías existentes que no tienen padre siguen disponibles. Registrar directamente en un padre se muestra como `Sin subcategoría`. La administración permite convertir, mover y editar categorías conservando su ID; avisa que cambiar el padre también reorganiza los reportes históricos.
- La administración y la creación rápida permiten elegir icono y color. Los iconos guardados se reutilizan en los selectores, presupuestos y reportes. Sus colores ajustan el contraste en tema claro y oscuro.

## Gráficas y navegación

Los reportes de gastos e ingresos muestran **Resumen** por categoría padre y **Detalle** por subcategoría. Cada vista contiene una distribución circular y barras; se puede entrar desde un padre a sus hijos y desde un hijo a los movimientos que explican su total. Las series repetidas reciben colores distintos para distinguirse en la gráfica, manteniendo el icono y color personalizados de la categoría.

Si hay importes negativos por reversos, se presentan barras con signo y se omite la distribución circular. Las monedas permanecen separadas y el modo privacidad oculta importes, porcentajes y geometría de las gráficas.

El reporte presupuestado frente a gastado usa barras comparativas de límite y gasto, tanto por padre como por subcategoría. Muestra diferencia, disponible/exceso y utilización. El techo del padre se cuenta una sola vez; los límites de sus hijos son asignaciones dentro de él. Sin techo, solo se suman los límites individuales. Los gastos sin presupuesto permanecen visibles.

Se añadió el endpoint compatible `GET /api/v1/reports/categories/uncategorized/transactions`, con los filtros de mes, moneda y tipo, para consultar también movimientos de ingreso o gasto sin categoría. Reutiliza las especificaciones del historial y sus reglas de aislamiento y reversos.

## Validación

- Backend: **158 pruebas** aprobadas, sin fallos, errores ni omisiones; incluye PostgreSQL real en un clúster temporal separado de la base personal. Empaquetado correcto.
- Mobile: **80 archivos / 680 pruebas** aprobadas. Incluye selección padre/hijo, cambio de padre, creación rápida bajo padre fijo, presupuestos existentes, límites agregados, borradores, accesos rápidos, ingresos recurrentes, gráficas con signo, privacidad y contraste de iconos. TypeScript y ESLint pasan.
- Android: ejecución real con el cliente de desarrollo instalado y JavaScript actualizado por Metro, sin necesitar una nueva compilación nativa para estos cambios.
- Se guardó desde el emulador un presupuesto de 15.000 COP para `Alimentación QA → Antiguos QA`: el techo del padre siguió en 500.000 y el presupuesto global en 700.000, sin sumar el límite hijo por segunda vez.
- Se registró un ingreso de 5.000 COP en `Ingresos laborales QA → Nómina QA`, se comprobó su total de grupo y se abrió su detalle de movimientos. Se guardó el icono Viajes y el color Violeta de esa subcategoría, y se comprobaron en los temas claro y oscuro y en el reporte.
- Comprobación API de los datos ficticios: gasto COP 601.500; ingreso COP 4.630.000; gasto sin presupuesto 200.000; utilización de Alimentación 80,3%; gasto USD 25 separado. Transferencias, desembolsos y pagos de crédito no duplican ingresos o gastos.

Los datos de la prueba interactiva están en una base temporal distinta. Las categorías, cuentas, movimientos y ledger de la base personal conservan sus huellas originales. La base personal recibió adiciones en presupuestos, sesiones y estados de alertas durante su uso; no se recreó ni se ejecutaron borrados de datos. El respaldo previo de la migración permanece en el backend, en `target/category-hierarchy-qa/`.

Evidencias locales, fuera de Git: `finance-personal-mobile/.tmp/category-hierarchy-20261030/`. Incluyen capturas `v2-budget-parent-child-dark.png`, `v2-expense-summary-dark.png`, `v2-budget-chart-detail-dark.png`, `v2-income-detail-light.png` y los registros de pruebas `vitest-final-v2.log`, `typecheck-final-v2.log`, `lint-final-v2.log`.
