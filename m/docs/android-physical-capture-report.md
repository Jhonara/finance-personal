# Informe de pruebas: captura inteligente en Android físico

Fecha: __________ Dispositivo/Android: __________ Tipo de APK y versión: __________ Backend QA: __________

Usa solo identificadores de prueba y códigos del diagnóstico. **No adjuntes textos bancarios completos, importes reales, OTP, credenciales, tokens ni números de tarjeta.** Marca `Pendiente` cuando no se haya ejecutado.

| Caso                                        | Resultado esperado                                                                                         | Resultado obtenido | Estado    | Error o motivo seguro |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------ | --------- | --------------------- |
| D01 · conexión y permisos                   | El diagnóstico distingue servidor, permiso para mostrar y acceso de lectura; muestra última sincronización |                    | Pendiente |                       |
| S01 · ejemplos bancarios                    | Cada formato se clasifica como compra, otro movimiento o ignorado según el escenario                       |                    | Pendiente |                       |
| S02 · duplicado exacto                      | Una sola clave y un solo pendiente tras envío explícito                                                    |                    | Pendiente |                       |
| S03 · mismo importe/comercio, distinta hora | Dos claves y dos pendientes independientes                                                                 |                    | Pendiente |                       |
| S04 · moneda diferente o datos incompletos  | Moneda correcta cuando existe; campos faltantes quedan por completar                                       |                    | Pendiente |                       |
| S05 · promoción u OTP                       | Se ignora; no se guarda texto sensible ni movimiento                                                       |                    | Pendiente |                       |
| N01 · app abierta                           | Un pendiente y máximo un aviso local; tocar abre su revisión                                               |                    | Pendiente |                       |
| N02 · segundo plano                         | El aviso abre el pendiente correcto                                                                        |                    | Pendiente |                       |
| N03 · pantalla bloqueada                    | Importe y comercio ocultos por defecto                                                                     |                    | Pendiente |                       |
| N04 · permiso de mostrar denegado           | Pendiente guardado sin aviso local                                                                         |                    | Pendiente |                       |
| N05 · aviso de Finance Personal             | El lector no lo vuelve a importar como compra                                                              |                    | Pendiente |                       |
| O01 · sin conexión y recuperación           | Candidato cifrado conservado; un solo pendiente al sincronizar                                             |                    | Pendiente |                       |
| O02 · respuesta perdida tras guardar        | Reintento con la misma clave; sin duplicado                                                                |                    | Pendiente |                       |
| O03 · app cerrada                           | Cola conservada y sincronización al reabrir; aviso inmediato no prometido                                  |                    | Pendiente |                       |
| A01 · sesión vencida                        | Login y continuación solo para el mismo usuario                                                            |                    | Pendiente |                       |
| A02 · cambio de usuario                     | Sin detalle, cola, avisos ni diagnóstico de otra cuenta                                                    |                    | Pendiente |                       |
| C01 · descartar                             | El pendiente sale de Por revisar; saldo y ledger sin cambios                                               |                    | Pendiente |                       |
| C02 · imagen/PDF/texto                      | Sugerencias revisables; sin asiento antes de confirmar                                                     |                    | Pendiente |                       |

Defectos encontrados (pasos para repetir, resultado y código del diagnóstico, sin datos sensibles):

1. ***

Pruebas automatizadas ejecutadas y fecha: __________

Conclusión: **pendiente de pruebas en Android físico**. No convertir esta plantilla en un resultado aprobado sin completar los casos reales.

Preparación automática del 28/10/2026: móvil 76/76 archivos y 645/645 pruebas; backend 20/20 pruebas; Kotlin `compileDebugKotlin` correcto; TypeScript, lint y formato correctos. Estos resultados no sustituyen ninguna fila física pendiente de la tabla.
