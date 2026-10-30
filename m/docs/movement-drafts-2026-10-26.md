# Borradores de ingresos y gastos — 26 de octubre de 2026

Los formularios reales de **Nuevo gasto** y **Nuevo ingreso** conservan localmente importe, identificadores de cuenta y categoría, fecha y nota. No guardan saldos, nombres de cuentas, credenciales ni respuestas del servidor. Expo SecureStore cifra los valores en Android Keystore y iOS Keychain. Cada clave incluye el ID verificado por `/me` y el tipo de movimiento.

Al entrar desde Inicio, el widget o un acceso rápido, se verifica primero la sesión y el usuario. Si hay un borrador de ese tipo, se muestra **Continuar borrador** o **Crear nuevo movimiento**; la segunda opción elimina ese borrador de forma explícita. Si el borrador local está dañado o no se puede leer, se ofrece reintentar o descartarlo explícitamente. Los formularios vacíos no crean borradores. La salida voluntaria guarda la última edición antes de navegar; si falla el almacenamiento, permanece en el formulario y muestra un aviso. Una confirmación fallida por red o validación conserva los datos. Tras la respuesta satisfactoria del servidor se elimina solo el borrador correspondiente. Si no se puede eliminar, se advierte que el movimiento ya quedó registrado y que no debe repetirse.

El contenido nunca se muestra mientras no pueda verificarse el usuario. Una sesión vencida exige iniciar sesión; volver con la misma cuenta permite recuperar su borrador. Al cambiar de usuario, el formulario se monta de nuevo y solo consulta la clave de la cuenta verificada. Cerrar sesión no borra borradores cifrados, pero tampoco los muestra a otra cuenta. El sistema no crea movimientos, no llama a ningún endpoint desde el almacenamiento de borradores y no calcula saldos.

## Comprobaciones realizadas

- Pruebas del almacenamiento: aislamiento por usuario y tipo, serialización mínima, recuperación tras remontar el formulario, descarte explícito, eliminación tras confirmación, datos dañados y protección frente a escrituras de una pantalla anterior.
- Pruebas de interfaz: la elección aparece antes de restaurar datos; continuar rellena el formulario; crear nuevo borra el anterior; otra cuenta empieza vacía; una respuesta 401 bloquea el formulario y cierra la sesión; un fallo de red bloquea el acceso sin cerrar la sesión.
- Pruebas de formularios reales: categorías obligatorias, registro confirmado que limpia el borrador correspondiente y fallo de confirmación que mantiene los campos y el borrador.
- Las rutas del widget y los accesos rápidos Android siguen llevando a los formularios reales. Durante la prueba del primer APK, una apertura desde el widget mostró de forma intermitente un error de sesión pese a que `/me` devolvió 200. Se cambió la puerta de entrada de Android para que la navegación ocurra después de verificar la sesión y no dentro del bloque que informa errores de red. El segundo APK ya abrió gasto e ingreso desde el widget y gasto desde el menú real del icono sin ese error. No se modificaron módulos nativos, iOS, backend ni ledger.
- `expo export --platform android` y `expo export --platform ios` generaron sus respectivos paquetes Hermes con Expo SDK 58. Se usó una carpeta temporal dentro del proyecto porque la ruta temporal restringida de Windows hizo fallar un primer intento de Android; el segundo terminó correctamente.
- `npm test`: 67 archivos y 594 pruebas aprobadas. `npm run typecheck`, `npm run lint` y `npm run format:check`: aprobados.

El [APK final de QA](https://expo.dev/accounts/jhonara/projects/finance-personal-mobile/builds/42da3aa3-b103-4486-8e45-471c918c3f11) se instaló sobre el [primer APK](https://expo.dev/accounts/jhonara/projects/finance-personal-mobile/builds/49e7cf03-88a6-4191-8455-cebe3aff44fc) en `emulator-5554`, conservando los borradores. Usa el servidor ficticio `10.0.2.2:8095` y no debe utilizarse con datos reales. Se comprobó visualmente:

- Desde Inicio se creó un gasto de 20.000 COP con cuenta y categoría. Salir mostró **Guardar borrador y salir** y no creó otra escritura en el servidor ficticio. Tras terminar el proceso, **+ Gasto** del widget mostró la elección sin exponer importe; **Continuar** recuperó los tres campos.
- **+ Ingreso** abrió vacío aunque existía el gasto. Un ingreso de 50.000 COP guardado apareció después como borrador propio. **Crear nuevo movimiento** lo eliminó y abrió el ingreso vacío; el borrador del gasto siguió disponible.
- La pulsación prolongada sobre el icono real de la app mostró los cuatro accesos nativos; **Registrar gasto** abrió la elección del borrador sin sobrescribirlo.
- Los accesos nativos **Transferir dinero** y **Consultar saldo** abrieron respectivamente el formulario real de transferencia y la pantalla Cuentas, sin crear movimientos.
- Al confirmar el gasto contra una respuesta **201** preparada en el servidor ficticio, hubo un solo `POST /expenses`; al abrir gasto de nuevo apareció vacío. El servidor ficticio cambió su resumen solo con esa confirmación.
- Un borrador posterior de 1.234 COP fue invisible para otra cuenta de prueba y reapareció al volver a iniciar sesión con su dueño. Una sesión vencida mostró login antes de cualquier borrador.
- Un `POST /expenses` rechazado con **409** dejó el formulario y el borrador intactos; el resumen ficticio del servidor no cambió. Terminar otra vez el proceso y abrir **+ Gasto** recuperó la elección.

## Pruebas aún pendientes

1. Reiniciar completamente el dispositivo Android y recuperar un borrador. Se verificó terminación y arranque en frío del proceso, pero no reinicio del dispositivo.
2. Cortar la conexión física en el emulador y restaurarla. La ruta sin red y el 401 están cubiertos por pruebas automatizadas; el rechazo **409** se comprobó en el APK.
3. Comprobar en un iPhone con build nativo: se exportó el paquete iOS y se usa la misma lógica de formulario, pero no se ha ejecutado esta versión en iOS físico.

Para repetir la prueba, instalar el APK final desde su enlace EAS sobre la app de QA del emulador y levantar `node scripts/qa/android-launcher-server.mjs` en el puerto 8095. Ese APK apunta solo al servidor ficticio. Para volver a usar datos reales, reinstalar una compilación normal con la configuración de API habitual.
