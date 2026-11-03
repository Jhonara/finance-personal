# Segunda etapa de Reportes y Cuentas

## Auditoría y decisiones de diseño

Reportes tenía siete opciones visibles al mismo nivel. El resumen, los desgloses y los estados actuales competían por espacio antes de mostrar la primera cifra. Se conservan las siete vistas y sus rutas. Mi mes, Gastos e Ingresos quedan a un toque. Presupuestos, Cuentas, Créditos y Metas están en el selector de vistas. Los separadores permiten leer el reporte de arriba abajo con menos tarjetas anidadas.

Mi mes destaca el flujo neto del periodo y deja el calendario junto a sus cifras. El calendario codifica magnitud y señala los días cuyo gasto neto se redujo por reversos. El importe exacto y el acceso a los movimientos aparecen al seleccionar un día. Las tendencias de 3, 6 y 12 meses conservan la selección de cada punto. Las comparaciones porcentuales y los hallazgos de crecimiento se limitan a meses cerrados.

Gastos e Ingresos conservan el resumen por grupo, el desglose por subcategoría y el acceso a los movimientos. La dona sirve para pocas categorías y las barras permiten comparar conjuntos más grandes. Se descartó el treemap porque las categorías pequeñas dejan poco espacio para etiquetas y áreas táctiles.

Presupuestos presenta el consumo y el avance del mes como referencias separadas. Los grupos desde el 80 % aparecen en el hallazgo del periodo. Los totales respetan el techo del padre, los límites vigentes, los gastos sin presupuesto y los casos con límite cero.

Cuentas conserva el reparto por moneda y las acciones existentes. El color de identidad se previsualiza durante la edición y queda guardado en la cuenta. La paleta de 14 colores utiliza pares para ambos temas, con contraste comprobado mediante pruebas. El historial se despliega en la cuenta y permite consultar el saldo de cierre, el movimiento neto de la fecha y los movimientos que lo componen.

Inicio usa una lista abierta para actividad reciente. Créditos presenta el plan de amortización como sección propia y conserva los importes registrados y los proyectados. Metas usa una línea de tiempo para aportes y retiros y los identifica como anotaciones de dinero apartado.

## Investigación y prototipo

- [Watermelon](https://ui.watermelon.sh/), [Spectrum](https://ui.spectrumhq.in/), [shadcn](https://ui.shadcn.com/) y [devl](https://devl.dev/) sirvieron como referencia para la jerarquía de lectura, la selección contextual y las transiciones. La implementación usa los componentes de React Native del proyecto.
- [Gifted Charts](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts) 1.4.81 y [React Native SVG](https://docs.expo.dev/versions/v58.0.0/sdk/svg/) 15.16.0, ambos MIT, ya forman parte del proyecto. Gifted Charts se conserva para la tendencia mensual. SVG cubre el historial de cuenta con una sola línea y puntos seleccionables.
- [Victory Native](https://nearform.com/open-source/victory-native/docs/) requeriría integrar Skia, además de Reanimated y Gesture Handler. El prototipo en el catálogo confirmó en el emulador que la combinación instalada resuelve la selección de barras y puntos. Se evitó añadir otra dependencia nativa.
- [Reanimated](https://swmansion.com/changelog/reanimated-4-7-0/) 4.7.1 y [Expo LinearGradient](https://docs.expo.dev/versions/latest/sdk/linear-gradient/) 58.0.3, ambos MIT, se mantienen en sus versiones instaladas. Las nuevas gráficas de calendario y saldo son estáticas hasta que el usuario selecciona un dato. La tendencia conserva el soporte de movimiento reducido.

## Integridad y compatibilidad

- El calendario desglosa por fecha efectiva los mismos asientos firmados que forman el total de gastos. Una reversión resta el gasto en su fecha efectiva. El filtro diario reutiliza la consulta de movimientos del reporte.
- El saldo histórico usa la suma de asientos válidos hasta la fecha anterior al periodo y los movimientos efectivos de cada día. Incluye transferencias y reversos según su impacto real en esa cuenta. El reporte de ingresos y gastos conserva sus exclusiones. Cada consulta comprueba la propiedad de la cuenta.
- El cierre histórico y el saldo actual tienen alcances diferentes. El primero respeta el corte de fecha efectiva y excluye anulados. El segundo conserva el comportamiento de la consulta de saldos del inicio.
- V29 agrega una columna nullable para el color de cuenta. Se conserva el aspecto por tipo cuando el valor está vacío. El cambio usa el control de versión de la edición de cuenta. Se respaldó la base local antes de migrarla.
- Las vistas usan una moneda a la vez. La opción de privacidad oculta tanto las cifras como las formas que revelarían sus valores relativos.

## Alcance

Las vistas operan por mes y la tendencia muestra ventanas de 3, 6 y 12 meses. No hay totales trimestrales ni agregación por rangos arbitrarios. El historial de saldo se consulta dentro de la cuenta. Los pagos de créditos y las anotaciones de metas conservan sus cronologías existentes. No se estiman curvas históricas que el modelo actual no sustenta.

## Validación local

- App móvil con 795 pruebas aprobadas, TypeScript, ESLint y exportación de Expo para Android, iOS y web.
- Backend con 197 pruebas aprobadas en una ejecución completa con PostgreSQL aislado. Una ejecución anterior reprodujo una condición de carrera en la prueba de dos reversos concurrentes. PostgreSQL rechazó el duplicado y la ejecución siguiente pasó. El flujo de escritura del ledger queda fuera de este cambio.
- Conciliación en la base local. El calendario y el reporte mensual coincidieron en octubre para 590.098 COP y 25 USD, y en noviembre para 29.993 COP. Los tres puntos del historial de la cuenta verificada coincidieron con su saldo de apertura más los movimientos acumulados. Se comprobó la persistencia del color y se restauró el valor original.
- En Android, el calendario abrió los movimientos del 24 de octubre por 78.000 COP. El historial de Bancolombia abrió el listado con la cuenta y el día seleccionados. Se comprobaron las etiquetas de día y el acceso al importe exacto en la jerarquía de accesibilidad.
- Una medición exploratoria durante el recorrido en el emulador de desarrollo registró 222 fotogramas y un percentil 95 de 101 ms. La medición incluye navegación y desplazamiento y no caracteriza el rendimiento de una versión Release.
