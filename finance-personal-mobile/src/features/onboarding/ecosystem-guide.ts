export const guideTopics = [
  {
    id: 'accounts',
    title: 'Cuentas y saldo inicial',
    short: 'Tu punto de partida',
    icon: 'wallet-outline',
    tone: 'mint',
    intro: 'Una cuenta representa dónde tienes tu dinero: banco, billetera o efectivo.',
    steps: [
      'Abre Cuentas y pulsa Añadir. Escribe un nombre que reconozcas y elige tipo y moneda.',
      'Abre la cuenta creada y registra el saldo que tienes al comenzar, antes del primer movimiento.',
      'Crea una cuenta por cada lugar donde manejas dinero. COP, USD y EUR se muestran por separado.',
    ],
    tip: 'El saldo inicial no es un sueldo nuevo. Si ya registraste movimientos, revisa el saldo antes de añadir más dinero para no contarlo dos veces.',
    action: 'Abrir Cuentas',
    route: '/(app)/accounts',
  },
  {
    id: 'movements',
    title: 'Tu primer movimiento',
    short: 'Lo que entra y sale',
    icon: 'swap-vertical-outline',
    tone: 'coral',
    intro: 'Registra lo que ya pasó. El botón + siempre está a mano.',
    steps: [
      'Pulsa + y elige Gasto si pagaste algo, o Ingreso si recibiste dinero.',
      'Escribe el importe, elige la cuenta y una categoría. Revisa la fecha y añade una nota si te ayuda.',
      'Guarda una sola vez. En Movimientos puedes revisar, filtrar y abrir el detalle del registro.',
    ],
    tip: 'La categoría es obligatoria: permite entender en qué gastas. Puedes gestionar tus categorías desde Perfil y ajustes.',
    action: 'Registrar movimiento',
    route: 'quick-action',
  },
  {
    id: 'categories',
    title: 'Categorías',
    short: 'Cada movimiento tiene un lugar',
    icon: 'pricetags-outline',
    tone: 'coral',
    intro: 'Las categorías agrupan tus ingresos y gastos. Las eliges al registrar y al crear presupuestos.',
    steps: [
      'En Perfil y ajustes, abre Categorías y elige Gastos o Ingresos.',
      'Pulsa Crear categoría. Elige una sugerencia o escribe un nombre propio y confirma.',
      'Usa esa categoría en tus movimientos. Puedes desactivarla si ya no la necesitas y reactivarla después.',
    ],
    tip: 'Las sugerencias no crean registros hasta que confirmas. Desactivar una categoría conserva tus movimientos anteriores.',
    action: 'Abrir Categorías',
    route: '/(app)/categories',
  },
  {
    id: 'transfers',
    title: 'Mover dinero entre cuentas',
    short: 'Sin duplicar ingresos',
    icon: 'swap-horizontal-outline',
    tone: 'blue',
    intro: 'Una transferencia mueve tu dinero; no es un gasto ni un ingreso nuevo.',
    steps: [
      'Crea primero las dos cuentas que usarás.',
      'Pulsa +, elige Transferir y selecciona la cuenta de origen y la de destino.',
      'Escribe el importe, revisa la fecha y confirma. Consulta el resultado en Movimientos.',
    ],
    tip: 'Usa cuentas de la misma moneda. Por ahora no hay cambio automático de COP a USD o EUR.',
    action: 'Abrir transferencias',
    route: '/(app)/new-transfer',
  },
  {
    id: 'budgets',
    title: 'Presupuestos',
    short: 'Decide cuánto gastar',
    icon: 'pie-chart-outline',
    tone: 'coral',
    intro: 'Un presupuesto es un límite mensual para una categoría de gasto.',
    steps: [
      'En Plan, entra en Presupuestos y elige el mes que quieres organizar.',
      'Crea un presupuesto: selecciona la categoría y escribe su límite.',
      'Registra tus gastos con esa categoría. El consumo del presupuesto se actualiza con tus movimientos.',
    ],
    tip: 'Crear un presupuesto no retira dinero de tus cuentas. Solo te ayuda a comparar lo gastado con tu límite.',
    action: 'Abrir Presupuestos',
    route: '/(app)/budgets',
  },
  {
    id: 'savings',
    title: 'Ahorros y metas',
    short: 'Dale un destino a tu ahorro',
    icon: 'flag-outline',
    tone: 'mint',
    intro: 'Una meta es un objetivo de ahorro, como un viaje o un fondo de reserva.',
    steps: [
      'En Plan, abre Ahorros y crea una meta con nombre, importe objetivo y moneda.',
      'Entra en la meta para registrar un aporte. Revisa la cuenta de origen cuando corresponda.',
      'Consulta cuánto has reunido y lo que te falta antes de añadir otro aporte.',
    ],
    tip: 'Una cuenta dice dónde está el dinero; una meta dice para qué lo separas. No registres el mismo aporte dos veces.',
    action: 'Abrir Ahorros',
    route: '/(app)/savings',
  },
  {
    id: 'credits',
    title: 'Créditos y préstamos',
    short: 'Lo que debes, claro',
    icon: 'card-outline',
    tone: 'lavender',
    intro: 'Aquí van tu hipoteca, préstamo de vehículo y otros créditos con sus condiciones reales.',
    steps: [
      'En Plan, entra en Créditos y préstamos y pulsa Agregar crédito.',
      'Si ya lo pagabas, elige Ya lo venía pagando. Copia del extracto saldo pendiente, fecha de corte, cuotas restantes y próximo pago.',
      'Completa monto original, tasa EA, plazo y día de pago. Después registra cada pago real desde el detalle del crédito.',
    ],
    tip: 'El corte corresponde al saldo del extracto, no al próximo pago. La importación supone que estabas al día en ese corte; no reconstruye atrasos previos.',
    action: 'Abrir Créditos',
    route: '/(app)/credits',
  },
  {
    id: 'amortization',
    title: 'Amortización y abonos',
    short: 'Prueba antes de decidir',
    icon: 'calculator-outline',
    tone: 'lavender',
    intro: 'La amortización muestra cómo cada cuota paga intereses y reduce tu deuda.',
    steps: [
      'Abre un crédito y pulsa Ver amortización para consultar sus cuotas.',
      'Elige Terminar antes o Bajar la cuota. Añade un importe extra y la cuota donde lo aportarías; puedes añadir varios.',
      'Pulsa Calcular impacto y compara Actual, Original y Con abonos. Para un pago que ya hiciste, vuelve al crédito y usa Registrar pago.',
    ],
    tip: 'Simular no realiza ni programa pagos y no cambia tu deuda. Los resultados son estimados y el escenario no se guarda al salir.',
    action: 'Elegir un crédito',
    route: '/(app)/credits',
  },
  {
    id: 'home',
    title: 'Entender tu Inicio',
    short: 'Una mirada a tu dinero',
    icon: 'home-outline',
    tone: 'blue',
    intro: 'Inicio reúne tu panorama, el resumen del mes, tu plan y los movimientos recientes.',
    steps: [
      'Usa el selector de mes para revisar ingresos y gastos de otro período.',
      'Balance registrado compara el dinero en cuentas con el capital pendiente de tus créditos, por moneda.',
      'En Tu plan abre presupuestos, ahorros, créditos o alertas. Para ti destaca una señal de tus datos.',
    ],
    tip: 'El balance no incluye el valor de una casa o vehículo. Las cuotas vencidas se muestran aparte y no se descuentan dos veces. Para ti aún no es un asistente de IA.',
    action: 'Volver a Inicio',
    route: '/(app)',
  },
  {
    id: 'alerts',
    title: 'Alertas y revisión',
    short: 'Lo que merece atención',
    icon: 'notifications-outline',
    tone: 'amber',
    intro: 'Las alertas te ayudan a revisar lo que está pasando en tus datos.',
    steps: [
      'Abre Alertas desde Plan o desde Tu plan en Inicio.',
      'Lee el motivo de cada aviso y abre el módulo relacionado para revisar sus datos.',
      'Comprueba tus cuentas y movimientos con tus extractos de vez en cuando. Corrige registros equivocados desde sus opciones disponibles.',
    ],
    tip: 'Un aviso no mueve dinero ni paga una deuda. Revisa siempre la información antes de actuar.',
    action: 'Abrir Alertas',
    route: '/(app)/alerts',
  },
  {
    id: 'profile',
    title: 'Privacidad y tus ajustes',
    short: 'A tu manera',
    icon: 'shield-checkmark-outline',
    tone: 'blue',
    intro: 'Tu avatar en Inicio abre el perfil, las preferencias y las categorías.',
    steps: [
      'Pulsa el ojo de Inicio para ocultar importes cuando estés acompañado.',
      'En Perfil y ajustes puedes gestionar categorías y volver a abrir esta guía.',
      'Si usaste un dispositivo compartido, cierra sesión. También puedes cerrar tus sesiones en todos los dispositivos.',
    ],
    tip: 'La guía no modifica tus finanzas. Su avance de lectura se guarda por usuario en este dispositivo; puedes repasar cualquier tema.',
    action: 'Abrir Perfil y ajustes',
    route: '/(app)/more',
  },
] as const;

export type GuideTopicId = (typeof guideTopics)[number]['id'];
export type GuideProgress = { reviewed: GuideTopicId[]; lastTopic: GuideTopicId };
export const guideKey = (userId: number) => `finance-start-guide-v1.${userId}`;
export const emptyGuideProgress = (): GuideProgress => ({ reviewed: [], lastTopic: 'accounts' });
export function isGuideTopic(value: unknown): value is GuideTopicId {
  return guideTopics.some((topic) => topic.id === value);
}
export function parseGuideProgress(raw: string | null): GuideProgress {
  try {
    const value = JSON.parse(raw ?? 'null');
    if (!value || typeof value !== 'object') return emptyGuideProgress();
    return {
      reviewed: Array.isArray(value.reviewed)
        ? ([...new Set(value.reviewed.filter(isGuideTopic))] as GuideTopicId[])
        : [],
      lastTopic: isGuideTopic(value.lastTopic) ? value.lastTopic : 'accounts',
    };
  } catch {
    return emptyGuideProgress();
  }
}
