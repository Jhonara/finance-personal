# Reportes

## Diseño y fuentes

Se conservan los reportes de ingresos, gastos y categorías. La navegación separa seis preguntas: cómo va mi mes, en qué gasto, cómo van mis límites, dónde tengo dinero, cómo van mis créditos y cómo avanzan mis metas.

Referencias revisadas (inspiración, sin copiar componentes ni una aplicación):

- https://ui.watermelon.sh/dashboards — jerarquía de tarjetas y paneles.
- https://ui.shadcn.com/docs/components/base/chart — leyendas, escala común y selección de datos.
- https://ui.spectrumhq.in/blocks/charts — agrupación de gráficas y filtros de intervalo.
- https://www.devl.dev/c/charts/donut — distribución con leyenda legible.

Implementación nativa propia con `react-native-svg` 15.15.4, versión recomendada para Expo SDK 57 e incluida en Expo Go: https://docs.expo.dev/versions/v57.0.0/sdk/svg/. Usa el tema, animaciones con movimiento reducido, privacidad y controles existentes de la app.

## Semántica de datos

- `/reports/month` suministra ingresos y gastos por moneda, incluidos ajustes por reversión. No cuenta transferencias, apertura ni pagos de créditos como ingresos/gastos.
- Un mes cargado sin registros equivale a cero; una solicitud pendiente o fallida no equivale a cero. Los errores históricos no bloquean el mes disponible.
- Las comparaciones son entre registros de meses completos; el mes en curso se identifica como parcial. No se extrapola ni recomienda dinero disponible para gastar.
- Las categorías con ajustes negativos conservan su signo y no se dibujan como porciones positivas. El gráfico circular requiere que el desglose coincida con el total.
- Presupuestos usa `/budgets` del mes elegido y solo COP, como define actualmente el servicio. No se atribuye un presupuesto COP a otra moneda.
- Cuentas, créditos y metas son instantáneas actuales. El selector mensual no se muestra en esas vistas. Los saldos y totales provienen del servidor.
- Cuentas incluye archivadas, igual que el total del dashboard; cuentas negativas o incompletas no generan una distribución engañosa.
- Créditos usa `/credits` para moneda, estado, pagos, próxima cuota y progreso, con los mismos helpers del módulo. Metas usa el progreso del dashboard; no se suma de nuevo al saldo de cuentas.
- No se simulan inversiones ni evolución del patrimonio sin datos históricos de esos módulos.
- La privacidad oculta importes, porcentajes y geometría de gráficos financieros. Los controles nativos conservan etiquetas para lectura accesible.

## Validación

Las pruebas de reportes cubren múltiples monedas, calendario, historia parcial, recuperación de errores, navegación a registros, presupuestos COP, privacidad, reversiones y cuentas archivadas/negativas. Los imports SVG se sustituyen solo por hosts en las pruebas; consultas y componentes de reportes siguen siendo reales.

Comprobación del 17 de octubre de 2026:

- 49 archivos y 429 pruebas aprobadas. Tipos, lint y formato correctos; exportación Android completada.
- Expo Doctor: 20/21 controles. Señala seis versiones de parche anteriores en dependencias ya existentes; `react-native-svg` coincide con la versión requerida. No se actualizó el conjunto de Expo durante este cambio de reportes.
- Se observó la vista inicial de Reportes con datos reales en el emulador. La revisión interactiva completa quedó pendiente: la entrada de ratón falló y después el control de ventanas fue detenido con Escape. No se modificaron registros financieros durante esta revisión.

Actualización del 19 de octubre: se comprobó en Android oscuro la selección de intervalos de la gráfica de ingresos y gastos, sus importes y su escala final. Se incorporaron animaciones SVG con Reanimated, cancelación al salir, repetición al volver o cambiar datos y respeto de movimiento reducido. Se animan las formas, no los importes. La validación actual está registrada en `ux-review.md`.
