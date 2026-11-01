# Revisión funcional y organización de la app — 31 de octubre de 2026

Esta revisión cubre navegación móvil, formularios, apariencia, privacidad y la organización de Menú y Perfil. Los cambios aprovechan los componentes, estilos, rutas y servicios existentes. No cambian cálculos del ledger, relaciones financieras ni datos de usuario.

La comprobación interactiva del emulador y el teléfono, los casos por API y la instalación pertenecen al recorrido general de QA. Los resultados automatizados de este documento no sustituyen esa comprobación.

## Problemas resueltos

| Prioridad | Problema                                                                                                                                                                                    | Corrección y evidencia                                                                                                                                                                                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1        | Cambiar Claro/Oscuro o seguir un cambio del sistema desmontaba todas las pantallas. Se perdían valores de formularios, el bloqueo de una operación pendiente y las confirmaciones abiertas. | Se eliminó la clave que reconstruía el árbol al cambiar de tema. Pantallas, formularios y paneles actualizan sus colores conservando su estado. Las pruebas reprodujeron la pérdida antes del cambio y ahora verifican valores, operación pendiente, colores y confirmación única. |
| P1        | La actualización en segundo plano del perfil desmontaba un gasto o ingreso ya verificado. Volver a primer plano podía forzar la recuperación del borrador.                                  | La misma cuenta ya verificada mantiene su formulario durante una actualización o fallo temporal de conexión. La primera verificación, un propietario distinto y una sesión rechazada siguen bloqueando o reiniciando el formulario correspondiente.                                |
| P2        | Al arrancar, los importes podían aparecer brevemente antes de cargar una preferencia guardada de ocultarlos.                                                                                | Los importes empiezan ocultos hasta leer la preferencia. Se cubren carga pendiente, preferencia visible/oculta, primera instalación, error de lectura y revelado explícito.                                                                                                        |
| P3        | Atajos y tarjetas mostraba instrucciones de iPhone en Android.                                                                                                                              | Android explica los accesos rápidos del icono; iPhone conserva su explicación de Atajos según disponibilidad. Los pendientes usan «dispositivo» en lugar de «iPhone».                                                                                                              |
| P3        | Un grupo con una hija mostraba «1 subcategorías».                                                                                                                                           | El contador usa el singular o plural correspondiente.                                                                                                                                                                                                                              |

## Contraste corregido durante el recorrido

La inspección de `profile-updated-light.png` mostró un problema adicional: el texto del perfil seguía el tema claro, pero su degradado y los acordeones conservaban los colores oscuros anteriores. `income-system-dark-retained.png` mostró el mismo patrón en los títulos, la introducción y los paneles de un formulario de ingreso retenido.

Los componentes reutilizados ahora consumen explícitamente el contexto de apariencia: superficies de marca, acordeones, identidad y avatar, encabezados y secciones de movimientos, selectores de categoría, moneda, fecha y creación rápida. Se conserva el sistema existente de estilos por revisión; no se añadió otro sistema de tokens ni se volvió a montar el formulario. La paleta clara del contexto ahora es un objeto estable, sin depender del proxy mutable del tema activo.

Dos regresiones específicas verifican un árbol de elementos retenidos: los cuatro tonos de superficies actualizan sus degradados y mantienen el contraste de su identidad, un acordeón abierto conserva su nota, y un ingreso mantiene importe, subcategoría y selector abierto al alternar Claro, Oscuro y Sistema. El mismo componente corrige sus otros usos en metas, créditos, configuración inicial y avisos de Inicio. Los paneles de panorama conservan su diseño oscuro con tinta clara explícita.

La captura posterior `recurrence-system-dark.png` reveló una segunda causa: React Compiler conservaba el JSX que leía `typography` global aunque cambiara el contexto. El proyecto utiliza colores mutables y estilos por proxy, cuya revisión no es una dependencia que el compilador pueda seguir. Se desactivó `expo.experiments.reactCompiler` en `app.json` y se conservaron las suscripciones al tema, sin reconstruir el árbol ni cambiar los datos del formulario. El encabezado del selector de categorías también declara su color de paleta explícitamente.

Una regresión adicional transforma un encabezado con Babel y la configuración real de `app.json`, y comprueba el color del `Text` después de cambiar de tema. Esta configuración debe mantenerse hasta que los consumidores de estilos reciban dependencias de paleta explícitas y se valide nuevamente la optimización en dispositivos. Es una decisión de compatibilidad sobre una optimización opcional; la documentación de [Expo sobre React Compiler](https://docs.expo.dev/guides/react-compiler/) explica su configuración, y [React documenta la exclusión de funciones incompatibles](https://react.dev/reference/react-compiler/directives/use-no-memo).

La captura final de esas pantallas después del arreglo corresponde al recorrido interactivo principal; las capturas anteriores documentan el defecto observado, no su resolución visual final.

## Menú: funciones importantes visibles

La captura previa `menu-baseline.png` mostraba seis herramientas con la misma jerarquía en una sola tarjeta. Ahora:

1. **Reportes** y **Presupuestos** aparecen primero como dos acciones compactas, con descripción e icono.
2. **Planifica** reúne Ingresos y gastos fijos, Metas de ahorro y Créditos.
3. **Alertas** mantiene su contador y sus estados de carga/error en una tarjeta propia.
4. **Tu espacio** conserva Categorías, Perfil y ajustes y Ayuda.

Se conserva el período actual al abrir reportes y presupuestos. Las acciones principales se apilan en pantallas estrechas o con texto del sistema más grande; no dependen de un ancho fijo ni de un color claro fijo. El objetivo del recorrido de créditos se conserva.

Inicio no se redistribuyó: la captura previa ya mostraba accesos a Presupuestos, Metas, Créditos y Reportes, junto a saldos y avisos. Añadir allí más accesos duplicaría las funciones visibles.

## Perfil: apariencia y privacidad primero

**Apariencia y privacidad** aparece después de la identidad del perfil. Claro, Oscuro, Sistema, Ocultar importes y la preferencia del widget se encuentran antes de las opciones extensas.

**Opciones de Inicio** despliega las preferencias existentes de prioridad y próximos pagos. **Avisos y captura** despliega las preferencias de avisos y, en Android, un acceso directo a la lectura de avisos bancarios. Los diagnósticos continúan limitados a desarrollo/QA. No se crea un bloque de captura vacío en plataformas sin esas opciones.

Categorías, guía, recorrido interactivo, cerrar sesión y cerrar todas las sesiones siguen disponibles. Las acciones de sesión conservan su confirmación. No se eliminaron ajustes ni funcionalidades.

## Validación automatizada actual

| Comprobación         | Resultado                                                                                                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Suite móvil completa | **91 archivos y 744 pruebas aprobadas**, ejecución final tras desactivar React Compiler, 31 de octubre, 16,11 s.                                                             |
| TypeScript           | **Aprobado tras la configuración final**, `TYPECHECK_EXIT=0`.                                                                                                                |
| Lint                 | **Aprobado en todo el proyecto**, `LINT_EXIT=0`.                                                                                                                             |
| Casos de Menú/Perfil | Seis casos comprueban las rutas, el período, las paletas, la disposición con texto grande, el plegado de ajustes, privacidad, widget, guías y cierre confirmado de sesiones. |

La regresión existente de personalización de Inicio sigue comprobando que un fallo al guardar conserva la preferencia anterior. Ahora entra mediante el grupo desplegable correspondiente.

ESLint excluye `.tmp/**` y `**/build/reports/**`: son archivos temporales e informes HTML/JavaScript generados por QA y Gradle, no código fuente de la aplicación. Los informes se conservan y el lint completo vuelve a terminar correctamente.

Evidencia local: `.tmp/qa31-compiler-final-tests.log`, `.tmp/qa31-compiler-compatibility-tests.log`, `.tmp/qa31-theme-final-tests.log`, `.tmp/qa31-theme-surface-tests.log`, `.tmp/qa31-menu-full-tests.log`, `.tmp/qa31-menu-tests.log`, `.tmp/full-qa-20261031/home-baseline.png` y `.tmp/full-qa-20261031/menu-baseline.png`.

## Comprobaciones y mejoras pendientes

- Confirmar en el recorrido interactivo final la distribución de Menú y Perfil en Claro, Oscuro y Sistema. Las pruebas de componentes verifican estado y estilos, pero no prueban la legibilidad de cada píxel ni cada tamaño de pantalla.
- Completar una pasada dedicada con texto del sistema grande y lector de pantalla en los formularios y selectores. La adaptación del par de acciones está cubierta por componentes; no equivale a esa auditoría de accesibilidad completa.
- Evaluar animaciones, uniformidad visual de controles y detalles de apariencia como fase posterior, una vez cerrado el recorrido funcional. No hay un rediseño general de Inicio dentro de estos cambios.

No se afirma que «todos los escenarios posibles» estén probados. Los resultados anteriores corresponden a casos ejecutados y a la cobertura descrita; el informe general debe incorporar por separado la evidencia real de dispositivos y operaciones por API.
