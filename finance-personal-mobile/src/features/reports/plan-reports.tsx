import { Text, View } from 'react-native';
import { router } from 'expo-router';
import type { DashboardMonth } from '@/api/dashboard-api';
import type { Budget, Credit } from '@/features/secondary/secondary-api';
import { creditMoney, creditProgress, creditStatus } from '@/features/credits/credit-presentation';
import type { DashboardPeriod } from '@/features/dashboard/dashboard-period';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { formatLocalDate } from '@/utils/local-date';
import { colors } from '@/theme';
import { Button } from '@/ui/primitives';
import { Progress } from '@/ui/progress';
import { MotionPressable } from '@/ui/motion';
import { ReportEmpty, ReportNotice, ReportPanel, reportStyles as s } from './report-ui';

const money = (value: number | undefined, currency: string, hidden: boolean) =>
  value !== undefined && Number.isFinite(value)
    ? formatPrivateMoney(value, currency, hidden)
    : 'No disponible';

export function BudgetReport({
  budgets,
  period,
  currency,
  hidden,
}: {
  budgets: Budget[];
  period: DashboardPeriod;
  currency: string;
  hidden: boolean;
}) {
  if (currency !== 'COP')
    return (
      <ReportPanel title="Tus límites por categoría" icon="speedometer-outline">
        <ReportNotice>
          Los presupuestos de la app están definidos en COP. Selecciona COP para revisarlos; los gastos en{' '}
          {currency} se consultan en Gastos.
        </ReportNotice>
      </ReportPanel>
    );
  const items = budgets
    .filter((item) => item.year === period.year && item.month === period.month)
    .sort((a, b) => (b.percentageUsed ?? -1) - (a.percentageUsed ?? -1));
  const exceeded = items.filter((item) => item.status === 'EXCEEDED').length;
  const warning = items.filter((item) => item.status === 'WARNING').length;
  return (
    <ReportPanel
      title="¿Cómo van tus límites?"
      subtitle="Primero aparecen las categorías más utilizadas."
      icon="speedometer-outline"
    >
      {items.length ? (
        <>
          <ReportNotice>
            {items.length} categorías con presupuesto{exceeded ? ` · ${exceeded} sobre el límite` : ''}
            {warning ? ` · ${warning} cerca del límite` : ''}. Los límites son una guía; no separan dinero de
            tus cuentas.
          </ReportNotice>
          {items.map((item, index) => (
            <View key={item.id ?? index} style={s.item}>
              <View style={s.between}>
                <Text style={[s.label, { flex: 1 }]}>{item.categoryName ?? 'Categoría'}</Text>
                <Text
                  style={[s.caption, { color: item.status === 'EXCEEDED' ? colors.warning : colors.success }]}
                >
                  {item.status === 'EXCEEDED'
                    ? 'Sobre el límite'
                    : item.status === 'WARNING'
                      ? 'Cerca del límite'
                      : 'Dentro del límite'}
                </Text>
              </View>
              {!hidden && item.percentageUsed !== undefined ? (
                <>
                  <Text style={s.caption}>
                    {item.percentageUsed.toLocaleString('es-CO', { maximumFractionDigits: 1 })}% utilizado
                  </Text>
                  <Progress
                    value={item.percentageUsed}
                    color={item.status === 'OK' ? colors.success : colors.warning}
                    label={item.categoryName}
                  />
                </>
              ) : null}
              <View style={s.between}>
                <Text style={s.caption}>Gastado</Text>
                <Text style={s.label}>{money(item.spentAmount, 'COP', hidden)}</Text>
              </View>
              <View style={s.between}>
                <Text style={s.caption}>Límite</Text>
                <Text style={s.label}>{money(item.limitAmount, 'COP', hidden)}</Text>
              </View>
              <View style={s.between}>
                <Text style={s.caption}>
                  {(item.remainingAmount ?? 0) < 0 ? 'Por encima del límite' : 'Margen del presupuesto'}
                </Text>
                <Text style={s.label}>
                  {money(
                    item.remainingAmount === undefined ? undefined : Math.abs(item.remainingAmount),
                    'COP',
                    hidden,
                  )}
                </Text>
              </View>
              {item.id ? (
                <Button
                  variant="ghost"
                  size="compact"
                  onPress={() =>
                    router.push({ pathname: '/(app)/budget-detail', params: { id: item.id!, ...period } })
                  }
                >
                  Revisar presupuesto
                </Button>
              ) : null}
            </View>
          ))}
        </>
      ) : (
        <ReportEmpty
          title="Este mes no tiene presupuestos"
          action="Organizar presupuestos"
          onPress={() => router.push({ pathname: '/(app)/budgets', params: period })}
        >
          Puedes empezar por una categoría que quieras seguir de cerca, como alimentación o transporte.
        </ReportEmpty>
      )}
    </ReportPanel>
  );
}

export function CreditReport({
  credits,
  currency,
  hidden,
  total,
}: {
  credits: Credit[];
  currency: string;
  hidden: boolean;
  total?: number;
}) {
  const items = credits
    .filter((item) => item.currency === currency)
    .sort(
      (a, b) =>
        Number(b.status === 'LATE') - Number(a.status === 'LATE') ||
        Number(a.status === 'PAID') - Number(b.status === 'PAID') ||
        (a.nextPaymentDate ?? '9999').localeCompare(b.nextPaymentDate ?? '9999'),
    );
  return (
    <>
      <ReportPanel title="Tus créditos, con contexto" subtitle="Capital pendiente actual" icon="card-outline">
        <Text style={s.value}>{money(total, currency, hidden)}</Text>
        <Text style={s.caption}>
          Es lo que falta del dinero prestado. Las próximas cuotas incluyen intereses y se revisan en cada
          crédito.
        </Text>
        {!items.length ? (
          <ReportEmpty
            title={`Sin créditos en ${currency}`}
            action="Ver créditos"
            onPress={() => router.push('/(app)/credits')}
          >
            Registra un crédito nuevo o uno que ya estés pagando para seguir su avance.
          </ReportEmpty>
        ) : null}
      </ReportPanel>
      {items.map((credit, index) => {
        const progress = creditProgress(credit);
        return (
          <ReportPanel
            key={credit.id ?? index}
            title={credit.name ?? 'Crédito'}
            subtitle={creditStatus(credit.status)}
            icon="layers-outline"
          >
            <Text style={s.eyebrow}>CAPITAL PENDIENTE</Text>
            <Text style={s.amount}>{creditMoney(credit.remainingBalance, currency, hidden)}</Text>
            {progress !== undefined && !hidden ? (
              <>
                <Progress value={progress} label="Capital original reducido" color={colors.info} />
                <Text style={s.caption}>
                  {progress.toLocaleString('es-CO', { maximumFractionDigits: 1 })}% del capital original
                  reducido
                </Text>
              </>
            ) : null}
            {credit.status === 'LATE' ? (
              <ReportNotice>
                Hay cuotas por revisar según tus registros. Si ya pagaste antes de usar la app, puedes
                actualizar el saldo desde un extracto en el detalle del crédito.
              </ReportNotice>
            ) : null}
            {credit.status !== 'PAID' ? (
              <View style={s.note}>
                <Text style={s.label}>
                  {credit.status === 'LATE' ? 'Primera cuota por revisar' : 'Próxima cuota del plan'}
                </Text>
                <Text style={s.caption}>{formatLocalDate(credit.nextPaymentDate)}</Text>
                <Text style={s.amount}>{creditMoney(credit.expectedPaymentAmount, currency, hidden)}</Text>
                <Text style={s.caption}>
                  Estimación del plan. Revisa con tu entidad seguros y otros cobros.
                </Text>
              </View>
            ) : null}
            <View style={s.between}>
              <Text style={s.caption}>Capital pagado en la app</Text>
              <Text style={s.label}>{creditMoney(credit.paidPrincipal, currency, hidden)}</Text>
            </View>
            <View style={s.between}>
              <Text style={s.caption}>Intereses registrados</Text>
              <Text style={s.label}>{creditMoney(credit.paidInterest, currency, hidden)}</Text>
            </View>
            <Text style={s.caption}>
              Estos pagos son acumulados desde que llevas el seguimiento. Un saldo de extracto refleja pagos
              anteriores; no incluye el detalle de esos pagos.
            </Text>
            {credit.id ? (
              <Button
                variant="secondary"
                onPress={() => router.push({ pathname: '/(app)/credit-detail', params: { id: credit.id! } })}
              >
                Ver pagos y amortización
              </Button>
            ) : null}
          </ReportPanel>
        );
      })}
    </>
  );
}

export function SavingsReport({
  data,
  currency,
  hidden,
}: {
  data: DashboardMonth;
  currency: string;
  hidden: boolean;
}) {
  const items = (data.savings ?? [])
    .filter((item) => item.currency === currency)
    .sort(
      (a, b) =>
        Number(Boolean(a.completed)) - Number(Boolean(b.completed)) ||
        (b.progressPercent ?? 0) - (a.progressPercent ?? 0),
    );
  const unknown = (data.savings ?? []).filter((item) => !item.currency).length;
  return (
    <ReportPanel
      title="¿Qué tan cerca están tus metas?"
      subtitle="Avance acumulado hasta hoy"
      icon="flag-outline"
    >
      <ReportNotice>
        Los aportes son dinero que anotaste para tus objetivos. No se suman otra vez a tus cuentas ni
        equivalen al ahorro de un mes.
      </ReportNotice>
      {items.length ? (
        items.map((goal, index) => (
          <View key={goal.id ?? index} style={s.item}>
            <View style={s.between}>
              <Text style={[s.label, { flex: 1 }]}>{goal.name ?? 'Meta'}</Text>
              <Text style={[s.caption, { color: colors.success }]}>
                {goal.completed ? 'Completada' : 'En progreso'}
              </Text>
            </View>
            {!hidden && goal.progressPercent !== undefined ? (
              <>
                <Text style={s.amount}>
                  {goal.progressPercent.toLocaleString('es-CO', { maximumFractionDigits: 1 })}%
                </Text>
                <Progress value={goal.progressPercent} label={goal.name} color={colors.success} />
              </>
            ) : null}
            <View style={s.between}>
              <Text style={s.caption}>Aportes registrados</Text>
              <Text style={s.label}>{money(goal.current, currency, hidden)}</Text>
            </View>
            <View style={s.between}>
              <Text style={s.caption}>Objetivo</Text>
              <Text style={s.label}>{money(goal.target, currency, hidden)}</Text>
            </View>
            {goal.id ? (
              <MotionPressable
                accessibilityRole="button"
                accessibilityLabel={`Ver meta ${goal.name ?? ''}`}
                onPress={() => router.push({ pathname: '/(app)/saving-detail', params: { id: goal.id! } })}
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Text style={s.selectedText}>Ver aportes y detalle →</Text>
              </MotionPressable>
            ) : null}
          </View>
        ))
      ) : (
        <ReportEmpty
          title={`Todavía no tienes metas en ${currency}`}
          action="Ver mis metas"
          onPress={() => router.push('/(app)/savings')}
        >
          Elige un objetivo y registra los aportes que ya hayas apartado para él.
        </ReportEmpty>
      )}
      {unknown ? (
        <ReportNotice>
          Hay {unknown} {unknown === 1 ? 'meta sin moneda asignada' : 'metas sin moneda asignada'}. Puedes
          completarla desde Metas para incluirla en este reporte.
        </ReportNotice>
      ) : null}
    </ReportPanel>
  );
}
