# iPhone y Atajos: guía de la primera prueba

> Registro histórico de la prueba por enlaces. La guía dentro de la app fue reemplazada por ajustes de tarjetas. La implementación nativa y su validación pendiente se documentan en [App Intents y EAS](apple-intents-eas-2026-10-24.md).

Un atajo es una secuencia de acciones del iPhone. En nuestra primera prueba solo abrirá una compra ficticia para revisar. No cobrará dinero, no consultará el banco y no registrará ningún gasto.

El emulador Android sigue sirviendo para revisar pantallas y cálculos compartidos. Atajos, Wallet, permisos y apertura desde iOS deben validarse en el iPhone real. La exportación de código iOS no sustituye esa prueba.

## 1. Abrir la app en tu iPhone

1. Inicia sesión en Expo Go con la misma cuenta Expo que usa el computador. Esta cuenta sirve para abrir el proyecto; después iniciarás sesión aparte en Finance Personal.
2. Conecta el iPhone a la misma red del computador. El computador puede estar por cable Ethernet y el iPhone por Wi‑Fi del mismo router.
3. Mantén abiertos Expo y el servidor. Escanea el QR de Expo con la Cámara del iPhone y abre el proyecto en Expo Go.
4. Entra a Finance Personal y comprueba que aparecen tus cuentas.

En este equipo se comprobó el 23 de octubre que Expo responde en `192.168.1.55:8081` y la API en `192.168.1.55:8080`. La configuración local de la API se cambió de `10.0.2.2` a `http://192.168.1.55:8080/api/v1`. `10.0.2.2` es la dirección especial del emulador, no la del computador para el iPhone. La dirección LAN puede cambiar al cambiar de red. No se modificó el firewall ni se publicó el servidor en Internet.

Si el aviso de Expo dice que falta iniciar sesión, resuelve la cuenta Expo. Si dice que el SDK es incompatible, comprueba qué versión exacta pide y la versión de Expo Go; actualizar iOS no sustituye esa comprobación. Un túnel de Expo tampoco expone automáticamente la API local.

## 2. Crear el primer atajo, sin compras reales

1. Dentro de Finance Personal abre **Movimientos → Por revisar → Usar Atajos en iPhone**.
2. Abre el apartado **Crear el atajo de prueba**. Mantén pulsado el enlace para copiarlo. Lleva una compra ficticia y la marca de prueba.
3. Abre la app **Atajos** de Apple. Pulsa **+** y ponle el nombre **Probar Finance Personal**.
4. Busca y añade la acción **URL** o **Dirección URL**. Pega ahí el enlace copiado.
5. Añade la acción **Abrir direcciones URL**. Su entrada debe ser la URL del paso anterior.
6. Pulsa **▶** para ejecutar. Debe abrir Finance Personal en **Prueba de Atajos**, con Café de prueba por 12.500 COP y la fecha del ejemplo.
7. Comprueba que no aparece un botón para guardar o registrar. Vuelve a la guía desde el botón al final del formulario.

Si Finance Personal pide iniciar sesión, entra y vuelve a ejecutar el atajo. El enlace no se reanuda automáticamente en otra sesión. Esta primera prueba no necesita pagar con Apple Pay ni importar compras anteriores.

Los nombres y posiciones de las acciones pueden variar entre iOS 26 e iOS 27. El atajo usa acciones normales; no necesita Apple Intelligence. El enlace de Expo Go depende del computador y es para pruebas con datos ficticios. Al usar una versión propia instalada, se genera el enlace con el esquema de la app.

## 3. Preparar el siguiente envío manual

Después de validar la prueba, prepararemos un atajo que pida o reciba estos campos: importe, moneda, comercio y fecha. El receptor de la app ya acepta estos datos estructurados, pero no envía el texto completo de SMS/correo ni credenciales mediante el enlace.

Para el montaje del atajo, el importe se entrega sin separadores de miles y con punto decimal (por ejemplo `12500.50`). La fecha usa `yyyy-MM-dd`; la moneda usa tres letras (`COP`). El texto del comercio se codifica como componente de URL. Si un dato no está disponible, se deja pendiente de completar. No se inventa la fecha ni la moneda.

La cuenta y categoría se eligen dentro de Finance Personal. Los pagos de créditos, ingresos y transferencias pasan por su módulo. Una compra recibida se guarda primero como borrador, comprueba posibles coincidencias y solo afecta las cuentas al confirmar.

## 4. Conectar Apple Pay después de la prueba

En Atajos abre **Automatización → + → Transacción** y selecciona la tarjeta. Apple documenta el activador **Cuando use sin contacto**. A continuación debemos inspeccionar en tu iPhone qué variables entrega esa operación. No damos por garantizados importe, moneda, comercio, hora, ubicación ni disponibilidad para cada tipo de compra.

Si ves un editor con **Buscar acciones**, estás en el editor de pasos. Vuelve a la pantalla principal de Atajos, entra en la pestaña inferior **Automatización** y usa su botón **+** o la opción para crear una nueva automatización. Busca **Transacción** en la lista de eventos, donde también aparecen opciones como Hora del día o Alarma. No es una acción que se añada desde el buscador del editor.

Primero se puede ejecutar el atajo de prueba. Para compras reales se sustituirá el ejemplo por los campos disponibles. Mantendremos la revisión manual y la detección de coincidencias. No hay que realizar una compra solo para esta prueba; se puede comprobar con la próxima compra que ya fueras a hacer.

La automatización no recupera por sí sola el historial anterior de Wallet y dispararse no demuestra que el banco haya liquidado un cargo. No está instalada ni activada todavía en tu iPhone. Debe quedar visible qué tarjeta y automatización elegiste, y poder desactivarse desde Atajos.

## Contrato implementado y protección

- Ruta `/shortcut`, disponible en iOS y Android para compartir la lógica. Solo monta el formulario financiero con una sesión autenticada.
- Versión `v=1`; campos admitidos: `kind`, `description`, `amount`, `currency`, `date`, `id`, `demo`. `kind` admite `EXPENSE` y `OTHER`. Sin tipo explícito se mantiene `OTHER`. No se admiten cuenta, categoría, token, texto original ni instrucciones de confirmación.
- Datos incompletos se muestran para completar. Datos malformados, parámetros repetidos, fechas imposibles, importes negativos, notación científica y campos desconocidos se rechazan antes de guardar.
- `demo=1` habilita una vista que no permite persistir. El ejemplo de la guía siempre incluye esa marca.
- `id` opcional de 16–64 caracteres alfanuméricos/guiones identifica el mismo evento. Se conserva como clave del intento de creación, con prefijo `shortcut-`. Una futura automatización debe generarlo una vez por operación y conservarlo en sus reintentos. Sin él sigue habiendo revisión de coincidencias, pero no se afirma deduplicación automática entre aperturas.
- Un nuevo enlace no reemplaza silenciosamente los cambios del formulario abierto. El usuario decide si cambia de compra.
- No se registran parámetros del enlace en logs de la app ni se guarda el texto completo de mensajes. Los enlaces pueden aparecer en el historial del sistema o en herramientas de desarrollo: usar solo ejemplos ficticios en Expo Go; ningún secreto va en enlaces.
- V20 agrega el origen `SHORTCUT`, separado de `PASTED_TEXT`, preservándolo al editar. El origen describe cómo llegó, no certifica que Apple o el banco lo hayan verificado. No se concede acceso externo al servidor ni una clave de API al atajo.

## Fuentes oficiales consultadas

- [Expo: abrir el proyecto en un dispositivo y requisitos de sesión](https://docs.expo.dev/get-started/start-developing/).
- [Expo: enlaces de desarrollo y de la app instalada](https://docs.expo.dev/versions/v57.0.0/sdk/linking/).
- [Apple: crear un atajo personalizado](https://support.apple.com/guide/shortcuts/create-a-custom-shortcut-apd84c576f8c/ios).
- [Apple: abrir otra app desde Atajos](https://support.apple.com/es-co/guide/shortcuts/apd68802640c/ios).
- [Apple: activadores de transacción](https://support.apple.com/es-co/guide/shortcuts/apd65c67538a/ios).

## Estado de validación

El 24 de octubre el usuario confirmó que, al ejecutar el atajo en su iPhone físico, aparece **Prueba de Atajos** con **12.500 COP**. Esto valida la apertura desde Atajos hacia la app en Expo Go; todavía no valida la entrega de datos de una compra desde Apple Pay.

El servidor reiniciado expone los dos orígenes `PASTED_TEXT` y `SHORTCUT`. Las 42 pruebas del flujo de bandeja y enlaces pasan, incluidas las comprobaciones de sesión, modo de ejemplo, datos rechazados, repetición de enlaces y conservación de cambios al recibir otra compra. También pasaron las 10 pruebas de integración del servidor con base aislada, la suite móvil de 521 pruebas, tipos y lint. Tras el último ajuste de validación de caracteres se repitieron las 42 pruebas afectadas.

La exportación final de iOS, Android y web terminó correctamente en `.expo/export-shortcuts-final`. Esto verifica la generación de la app, no sustituye la comprobación del activador de Wallet en el dispositivo.

Siguiente comprobación en el iPhone: localizar **Automatización → + → Transacción**, seleccionar la tarjeta y revisar las variables disponibles. Se conserva el ejemplo ficticio mientras se comprueba el activador. No se requiere hacer una compra para configurar esta prueba ni se afirma que la automatización de Apple Pay esté activa.

El usuario indicó que estaba viendo **Buscar acciones**; se le orientó a volver a la lista de activadores. La presencia de Transacción y sus campos todavía no está confirmada en su iPhone.
