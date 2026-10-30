# Widget de inicio de Android

## Alcance

El widget nativo muestra el saldo registrado en cuentas, los ingresos y gastos del mes, y la hora de la última actualización del dashboard. Sus botones abren los formularios existentes mediante la misma puerta de autenticación que los accesos rápidos del launcher. Abrir un formulario nunca crea un movimiento.

El widget se genera con un módulo Expo local (`modules/finance-home-widget`) durante Prebuild. No se edita manualmente `android/`. La integración de iOS y el servidor no cambian.

Se revisó [expo-widgets para SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/widgets/): Android se habilita con `enableAndroid` y admite vistas y botones Compose, pero su escucha de interacciones en JavaScript solo funciona mientras el proceso principal está vivo. Como estos botones deben abrir los formularios aun con la aplicación cerrada, se eligió un [módulo Expo local](https://docs.expo.dev/modules/get-started/) con `AppWidgetProvider` y `PendingIntent` nativos. El módulo permanece compatible con Prebuild y no añade una dependencia al paquete iOS.

## Privacidad y datos

- Los importes aparecen ocultos por defecto. El usuario puede habilitarlos en **Perfil y ajustes → Mostrar montos en el widget**. El ajuste general **Ocultar importes** también los oculta.
- La copia del resumen y el identificador del usuario se guardan en preferencias privadas de la aplicación Android. No se guardan tokens, contraseñas ni datos de los formularios en el widget o sus enlaces.
- Al cerrar sesión o iniciar otra, se borra la copia privada. Si el servidor rechaza una sesión vencida, se borra al intentar sincronizar.
- Las cifras provienen de `/dashboard/month`. El widget no suma movimientos ni modifica el ledger. Cuando existen cuentas de varias monedas, muestra el saldo COP (o el primer saldo disponible) identificado por moneda y evita presentar un total mensual que mezcle monedas.
- Al confirmar una operación, las mutaciones existentes invalidan el dashboard y el widget se actualiza con la siguiente respuesta confirmada. También se refresca al volver a la aplicación y cada minuto mientras permanece activa.
- Si falla la conexión, conserva temporalmente la última copia e indica **Sin conexión**. Si la copia supera dos horas o pertenece a un mes anterior, oculta los importes e indica **Datos desactualizados**. Android puede demorar la actualización periódica cuando la aplicación está cerrada.

## Desarrollo en Windows

1. Generar un APK con `npx eas-cli build --platform android --profile development` desde `finance-personal-mobile`.
2. Instalarlo con `C:\Users\JR\AppData\Local\Android\Sdk\platform-tools\adb.exe install -r <ruta-del-apk>`.
3. Iniciar el servidor API y Expo Metro para el mismo entorno que utilizará el emulador. El APK de desarrollo requiere Metro para cargar JavaScript.
4. En la pantalla de inicio del emulador, mantener pulsado un espacio vacío, abrir **Widgets** y añadir **Finance Personal → Resumen de finanzas** (4 × 3 celdas).
5. Abrir Finance Personal e iniciar sesión. Comprobar primero los montos ocultos. Activar **Mostrar montos en el widget** en Perfil y ajustes si se desea verlos.
6. Tocar **+ Gasto** y **+ Ingreso**; ambos deben abrir sus formularios reales. Con la sesión cerrada o vencida deben mostrar inicio de sesión y continuar a la acción tras autenticarse.

La prueba aislada usa `node scripts/qa/android-launcher-server.mjs` en el puerto 8095 y Expo en el 8084, con `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8095/api/v1`. **Cuenta QA Android** y **Categoría QA** identifican este entorno ficticio; ninguna operación se escribe en el ledger real. El fixture solo acepta una confirmación ficticia si antes se prepara el siguiente resultado del servidor con `POST /__qa/next-confirmation`. Si no se prepara, devuelve 409. `/__qa/status` permite contar las confirmaciones aceptadas; `/__qa/connection` simula una caída de conexión únicamente en el dashboard.

## Compilación y comprobación del 25 de octubre

El APK de desarrollo se compiló correctamente en EAS: [build Android](https://expo.dev/accounts/jhonara/projects/finance-personal-mobile/builds/6a502587-6a73-40fb-9654-0d4eedc8c5d6). Se instaló en el emulador `emulator-5554`. Android registró el proveedor del widget y conservó los cuatro accesos rápidos anteriores.

En el launcher se añadió el widget y se comprobó que los tres importes aparecían ocultos por defecto. Al activar la opción, el usuario comprobó en el emulador 350.000 COP de saldo, 1.200.000 COP de ingresos y 235.000 COP de gastos; coinciden con la respuesta ficticia del dashboard. También confirmó que **Ocultar importes** vuelve a tapar las cifras y que cerrar sesión elimina los importes y muestra la petición de inicio de sesión. Con la cuenta ficticia de QA, **+ Gasto** llevó a inicio de sesión y, tras autenticarse, al formulario real **Nuevo gasto**. **+ Ingreso** abrió el formulario real **Nuevo ingreso** con sesión activa. La API ficticia registró cero escrituras financieras.

### Validación adicional del 25 de octubre

Se usaron exclusivamente cifras y usuarios ficticios del fixture. No se cambió el backend ni el ledger.

| Escenario                  | Comprobación real en el emulador                                                                                     | Resultado                                                                                                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gasto confirmado           | Formulario real con 20.000 COP; el fixture devolvió 201 y un nuevo `/dashboard/month`.                               | El widget pasó al resumen proporcionado por el servidor ficticio: saldo 330.000 COP y gastos 255.000 COP. Una sola confirmación ficticia aceptada.                      |
| Ingreso confirmado         | Formulario real con 50.000 COP; el fixture devolvió 201 y el dashboard actualizado.                                  | El widget mostró saldo 380.000, ingresos 1.250.000 y gastos 255.000 COP. Una sola confirmación ficticia aceptada.                                                       |
| Conexión perdida           | Se cortó la respuesta de `/dashboard/month` y se cambió el resumen remoto a 777.000 COP mientras estaba inaccesible. | Conservó 350.000 COP con «Sin conexión · último dato…», sin mostrar los 777.000. Al restaurar la respuesta y volver a la app, mostró 777.000 y «Actualizado…».          |
| Sesión vencida             | La API ficticia devolvió 401 para acceso y renovación.                                                               | El widget tapó los tres importes y mostró «Inicia sesión para consultar». `+ Gasto` llevó a login y, tras entrar, al formulario real.                                   |
| Cierre y cambio de usuario | Salida de la primera cuenta; entrada de `other@example.test` con otro resumen.                                       | El widget borró el resumen anterior, ocultó importes por defecto y, al habilitarlos para la segunda cuenta, mostró 91.000/400.000/12.000 COP, sin cifras de la primera. |
| Persistencia               | Se terminó el proceso de la app, se reinició el emulador y se abrió la app otra vez.                                 | Las cifras y el ajuste visible de la segunda cuenta persistieron; el interruptor de Perfil seguía activado.                                                             |
| Botones con app cerrada    | Se comprobó `pidof` vacío antes de tocar cada botón del widget en el APK independiente.                              | `+ Ingreso` abrió Nuevo ingreso y `+ Gasto` abrió Nuevo gasto, incluso al alternarlos después de cerrar el proceso. Ningún toque generó movimientos.                    |
| Login desde el widget      | Se venció la sesión ficticia y se tocó `+ Ingreso` en el widget.                                                     | Mostró login y, al autenticarse, continuó a Nuevo ingreso.                                                                                                              |
| Widget previo a actualizar | Se instaló el APK final sobre la misma app y se abrió una vez para sincronizar el widget original.                   | El widget original conservó su posición y ambos botones abrieron el formulario correcto con el proceso muerto. Android registró el enlace nuevo en ambos casos.         |

**Defecto encontrado y corregido:** en el fixture anterior, tocar «Registrar gasto» o «Registrar ingreso» parecía no hacer nada porque el servidor de pruebas rechazaba todos los envíos con 409 y el formulario no mostraba ese error. Ahora muestra un aviso y conserva el formulario; el fixture solo simula una confirmación cuando se prepara explícitamente. Esto no autoriza ni crea movimientos reales.

**Defectos de apertura en frío corregidos:** el cliente de desarrollo abrió su selector de servidores tras `am kill`, así que se usó un APK independiente con el perfil `widget-qa`. Su primer build necesitó una excepción HTTP limitada a la URL ficticia local del emulador. En el siguiente build, dos navegaciones consecutivas podían dejar al usuario en Inicio; se sustituyeron por una sola. Android también restauraba el formulario anterior con `CLEAR_TOP`; el enlace del widget ahora inicia una tarea limpia. Por último, `UPDATE_CURRENT` conservaba los enlaces antiguos después de instalar un APK nuevo; ahora se recrean al refrescar el widget. La compilación [EAS final](https://expo.dev/accounts/jhonara/projects/finance-personal-mobile/builds/3c256a0b-6646-41bd-8245-7978d7396795) pasó y los dos botones del widget original se comprobaron en el emulador con la app cerrada.

Esta versión se considera estable para los escenarios reproducidos arriba. Queda pendiente verificar una operación contra el backend real con una cuenta de prueba separada, el vencimiento de la copia tras dos horas sin abrir la app y el cambio de mes. Una sesión revocada remotamente mientras la aplicación permanece cerrada no puede detectarse de inmediato: el widget conserva como máximo dos horas la copia local autorizada y la borra al recibir 401 durante la siguiente sincronización. Al abrir una acción del widget se inicia una tarea limpia; un formulario que se hubiese dejado sin guardar en segundo plano no se restaura. La compilación local con Gradle quedó impedida por rutas largas de CMake en Windows para `react-native-worklets`; EAS sí compiló los APK.

### Reproducción sin movimientos reales

1. Ejecutar el fixture en el PC: `node scripts/qa/android-launcher-server.mjs`. Usar un APK compilado con `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8095/api/v1` en el emulador, o Metro con esa variable para el APK de desarrollo.
2. Iniciar sesión con `launcher@example.test` / `LauncherTest2026`. Para una segunda cuenta ficticia usar `other@example.test` / `OtherTest2026`.
3. Antes de un gasto ficticio, preparar `POST http://127.0.0.1:8095/__qa/next-confirmation` con `{"kind":"expense","summary":{"balance":330000,"income":1200000,"expense":255000}}`. Registrar 20.000 COP en el formulario y consultar `/__qa/status`.
4. Para una caída y recuperación, enviar `{"lost":true}` y luego `{"lost":false}` a `POST /__qa/connection`. Cambiar el resumen con `POST /__qa/summary` y `{"balance":777000,"income":1200000,"expense":235000}`. Volver a la app para solicitar el dashboard.
5. Para sesión vencida, enviar `POST /__qa/expire` con `{}` y volver a la app. Para comprobar aislamiento, cerrar sesión e iniciar con el otro usuario.

El APK `widget-qa` instalado en este emulador apunta exclusivamente al servidor ficticio local. Para volver al entorno real, detener el fixture, reinstalar una compilación normal y reiniciar Expo sin la variable de QA.

## Archivos y comprobaciones

- Apertura y navegación: `src/app/android-shortcut.tsx`, `src/app/(app)/new-expense.tsx`, `new-income.tsx`, `new-transfer.tsx`, `src/features/launcher-shortcuts/launcher-shortcuts.test.tsx` y `src/features/state-consistency.test.tsx`.
- Botones nativos: `modules/finance-home-widget/android/src/main/java/com/jr/financewidget/FinanceHomeWidgetProvider.kt`.
- Errores de los formularios: `src/features/transactions/form-errors.ts` y `form-errors.test.ts`.
- Pruebas aisladas y configuración: `scripts/qa/android-launcher-server.mjs`, `plugins/with-android-widget-qa-network.cjs`, `app.json` y `eas.json`. El plugin de red no habilita HTTP para compilaciones normales.
- Validación automática final: `npm test` (65 archivos, 582 pruebas), `npm run typecheck`, `npm run lint`, `npm run format:check` y `npx expo-doctor` (20/20) pasaron. EAS compiló el APK final y se instaló en `emulator-5554`. No se ejecutaron pruebas contra el backend real.
