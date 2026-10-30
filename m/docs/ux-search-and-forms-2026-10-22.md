# Búsqueda, confirmaciones y formularios — 22 de octubre de 2026

## Cambios

- **Movimientos:** buscador por concepto, categoría o cuenta. El servidor busca antes de paginar, combina las palabras con los filtros existentes e ignora mayúsculas y tildes españolas. Incluye el concepto original de una reversión. Una transferencia aparece una sola vez aunque ambas cuentas coincidan. El acceso sigue limitado al propietario. `%`, `_` y `\` se buscan como caracteres literales.
- El campo permanece disponible mientras carga o falla la consulta. Espera 300 ms al escribir para no hacer una petición por letra; la tecla Buscar consulta de inmediato. Borrar el texto conserva los filtros. Un error no se presenta como cero coincidencias. No se descargan todos los movimientos para filtrar en el teléfono.
- **Confirmaciones:** cuadro común con los colores de la app, botones amplios y una acción de cancelar. Se usa al salir de formularios, pausar/reanudar programaciones, omitir pagos, revertir/eliminar créditos y cerrar sesión. Atrás de Android cancela la confirmación sin confirmar una acción; los avisos explícitamente no cancelables respetan esa opción. Se evita ejecutar dos veces una acción por doble pulsación. Se respetan las preferencias de movimiento reducido.
- **Formulario de pagos fijos:** menos instrucciones repetidas; los detalles de meses incompletos y registro automático pasan al desplegable existente. Permanecen a la vista los campos, errores, advertencia de un posible registro hoy y la vista previa de importes y fechas. No cambian los cálculos ni las programaciones guardadas.

## Validación

- Servidor: 22 pruebas correctas de búsqueda, historial y recurrencias, sobre bases de prueba. Incluyen aislamiento por usuario, paginación, filtros combinados, tildes, caracteres especiales, transferencias, reversiones y límite del texto.
- App: 473 pruebas correctas en 55 archivos. Tipos y lint correctos. Exportación Android correcta en `.expo/export-ux-search`.
- Contrato generado desde el OpenAPI producido por el servidor durante las pruebas.
- Android Pixel 10 en oscuro: aviso de salida con contraste correcto; Seguir editando conserva Total mensual; la flecha y Atrás de Android abren la confirmación; descartar el borrador temporal vuelve a la agenda. Se comprobó el calendario compacto, el desplegable de ayuda y el buscador sobre el historial existente.
- El intento inicial de aplicar el tema a los avisos nativos no cambió su apariencia en Expo Go. Se sustituyó por el cuadro propio; no se dejó ese intento en el código.

## Pendiente de comprobación con el servidor local

El servidor que está ejecutándose todavía no publica el parámetro `q`. Se pidió reiniciarlo en su terminal para activar la búsqueda y comprobar resultados reales en Android. La búsqueda completa está probada con datos de prueba; aún no se afirma que haya sido comprobada con los datos reales del emulador. No se guardaron borradores de prueba ni se modificaron movimientos, cuentas, créditos o programaciones del usuario.
