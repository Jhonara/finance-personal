# Por revisar: primera entrada voluntaria de compras

## Alcance entregado

Acceso desde Movimientos → Por revisar · avisos de compra. El usuario pega un aviso, revisa sus datos y guarda un borrador. El texto original se interpreta localmente y no se envía ni se almacena en el servidor. No hay lectura automática de SMS, correo, portapapeles ni Wallet; tampoco conexión con IA o Atajos todavía.

Se sugieren comercio, importe, moneda y fecha cuando el texto permite identificarlos. Si hay varios importes, fechas imposibles o una moneda ambigua, se pide completar los datos. No se presupone que la compra sea de hoy o en COP. El usuario elige cuenta y categoría. Si sus últimas compras con el mismo concepto tienen una sola categoría activa, el servidor ofrece usarla, sin aplicarla automáticamente.

Guardar, editar y descartar borradores no altera dinero, presupuestos ni reportes. Confirmar un gasto completo usa el registro contable existente. Los créditos, ingresos y transferencias se registran en su módulo y pueden vincularse a un movimiento existente.

## Coincidencias y reintentos

- Se comparan importe y moneda dentro de dos días antes/después de la fecha; cuenta cuando está indicada. Se muestran movimientos contabilizados, otros borradores y gastos fijos pendientes de confirmar.
- Una coincidencia no demuestra que sean la misma operación. El usuario puede ver el detalle y vincular, o confirmar expresamente que es otra compra.
- La comparación solo conoce registros de la app. No verifica cargos en el banco y no garantiza reconocer todos los duplicados.
- Crear usa una identidad de intento. Tras una respuesta incierta se recupera ese mismo borrador antes de aplicar cambios posteriores.
- Confirmar se serializa por usuario y conserva el identificador del movimiento: dos confirmaciones simultáneas del mismo borrador producen un solo gasto.
- Las ediciones tienen versión y la confirmación exige una revisión vigente de las coincidencias. Las respuestas tardías al recuperar foco no reemplazan un recibo ya confirmado.
- Todas las rutas requieren autenticación y comprueban el propietario de borrador, cuenta, categoría y movimiento.

## Persistencia y contrato

V19 agrega `purchase_drafts`; no contiene el aviso original. La lista muestra borradores pendientes en páginas de 25. Los borradores confirmados o vinculados conservan el movimiento asociado y desaparecen de pendientes. Descartar solo elimina un borrador pendiente, nunca un movimiento.

Contrato móvil regenerado desde OpenAPI. Rutas `/api/v1/inbox`, `/{id}`, `/{id}/confirm` y `/{id}/link`. El servidor reiniciado ya expone estas rutas.

## Validación

- App: 495 pruebas correctas en 57 archivos, incluyendo 16 casos nuevos de interpretación local y pantalla.
- Servidor: 113 pruebas correctas, incluidas 9 de bandeja; cero fallos de aserción. La suite completa no termina en verde: una prueba necesita Docker y no pudo iniciar; otras 24 pruebas PostgreSQL quedaron omitidas. No se presenta esa comprobación como completada.
- Tipos, lint, formato de los archivos nuevos y exportación Android correctos (`.expo/export-inbox`).
- El dinero de prueba se registró únicamente en la base aislada de pruebas.
- Android, servidor reiniciado: acceso desde Movimientos, lista vacía y formulario oscuro comprobados. Un aviso ficticio produjo comercio, 85.000 COP y 20/10/2026; el selector mostró únicamente cuentas COP. Se corrigieron márgenes interiores y se ocultó el aviso después de interpretarlo. No se guardó el ejemplo ni se registraron gastos en la cuenta del usuario.
- Atrás muestra la confirmación de salida cuando hay datos sin guardar. Se eligió Seguir editando y quedó el ejemplo ficticio en pantalla, sin persistir.

## Orden siguiente

1. Validar formatos reales de avisos con ejemplos voluntarios y datos sensibles ocultos; ampliar solo patrones comprobados.
2. Prototipo de Atajos que abra un borrador y conserve revisión explícita. Comprobar primero en un iPhone qué información entrega la tarjeta y versión de iOS elegidas. No prometer acceso al historial de Wallet.
3. Asistente opcional que consulte registros y estados de alertas, con período, moneda y fuentes claras. No ejecutar movimientos por su cuenta.

Las alertas financieras mantienen su ciclo de pendientes, vistas, pospuestas e historial. La bandeja de compras conserva un propósito diferente: decidir qué registrar.
