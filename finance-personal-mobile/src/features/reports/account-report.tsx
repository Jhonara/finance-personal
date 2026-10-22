import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import type { DashboardMonth } from '@/api/dashboard-api';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { Button } from '@/ui/primitives';
import { MotionPressable } from '@/ui/motion';
import { chartColors, ReportRing } from './report-charts';
import { ReportPanel, ReportNotice, ReportEmpty, reportStyles as s } from './report-ui';

export function AccountReport({
  data,
  currency,
  hidden,
}: {
  data: DashboardMonth;
  currency: string;
  hidden: boolean;
}) {
  const [selectedId, setSelectedId] = useState<number>();
  const accounts = (data.accounts ?? [])
    .filter((account) => account.currency === currency)
    .sort((a, b) => (b.balance ?? -Infinity) - (a.balance ?? -Infinity));
  const total = data.assetsByCurrency?.[currency];
  const money = (value?: number) =>
    value === undefined || !Number.isFinite(value)
      ? 'No disponible'
      : formatPrivateMoney(value, currency, hidden);
  const colors = chartColors();
  const canChart =
    accounts.length > 0 &&
    accounts.every(
      (account) => account.balance !== undefined && Number.isFinite(account.balance) && account.balance >= 0,
    ) &&
    total !== undefined &&
    total > 0 &&
    Math.abs(accounts.reduce((sum, account) => sum + (account.balance ?? 0), 0) - total) < 0.02;
  const positive = accounts.filter((account) => (account.balance ?? 0) > 0);
  const parts = positive.map((account, index) => ({
    name: `${account.name ?? 'Cuenta'} · ${index + 1}`,
    value: account.balance!,
    color: colors[index % colors.length]!,
  }));
  const selectedIndex = positive.findIndex((account) => account.id === selectedId);
  return (
    <>
      <ReportPanel
        title="¿Dónde está tu dinero?"
        subtitle={`Saldos actuales · ${currency}`}
        icon="wallet-outline"
      >
        <Text style={s.value}>{money(total ?? (accounts.length === 0 ? 0 : undefined))}</Text>
        <Text style={s.caption}>
          Suma de las cuentas registradas en esta moneda. Incluye cuentas archivadas que aún conservan saldo.
        </Text>
        {canChart ? (
          <ReportRing
            parts={parts}
            hidden={hidden}
            title={selectedIndex >= 0 ? (positive[selectedIndex]!.name ?? 'Cuenta') : 'Distribución'}
            value={
              selectedIndex >= 0
                ? money(positive[selectedIndex]!.balance)
                : `${positive.length} ${positive.length === 1 ? 'cuenta' : 'cuentas'}`
            }
            selected={selectedIndex >= 0 ? selectedIndex : undefined}
            onSelect={(index) =>
              setSelectedId(positive[index]?.id === selectedId ? undefined : positive[index]?.id)
            }
          />
        ) : accounts.some((account) => (account.balance ?? 0) < 0) ? (
          <ReportNotice>
            Hay cuentas con saldo negativo. Se muestran por separado para que una gráfica de distribución no
            oculte esa diferencia.
          </ReportNotice>
        ) : accounts.length > 0 && total !== 0 ? (
          <ReportNotice>
            No hay un desglose completo para dibujar la distribución. Puedes consultar los saldos disponibles
            y actualizar este reporte deslizando hacia abajo.
          </ReportNotice>
        ) : null}
        {accounts.length ? (
          accounts.map((account, index) => (
            <MotionPressable
              key={account.id ?? index}
              accessibilityRole="button"
              accessibilityLabel={`Ver cuenta ${account.name ?? ''}`}
              onPress={() =>
                account.id && router.push({ pathname: '/(app)/account-detail', params: { id: account.id } })
              }
              disabled={!account.id}
              style={s.item}
            >
              <View style={s.between}>
                <View style={[s.row, { flex: 1 }]}>
                  <View style={[s.dot, { backgroundColor: colors[index % colors.length] }]} />
                  <Text style={[s.label, { flex: 1 }]}>{account.name ?? 'Cuenta'}</Text>
                </View>
                <Text style={s.amount}>{money(account.balance)}</Text>
              </View>
              <Text style={s.caption}>
                {account.active === false ? 'Archivada · ' : ''}Ver saldo y movimientos →
              </Text>
            </MotionPressable>
          ))
        ) : (
          <ReportEmpty
            title={`No tienes cuentas en ${currency}`}
            action="Ver cuentas"
            onPress={() => router.push('/(app)/accounts')}
          >
            Registra dónde guardas tu dinero para ver aquí su distribución.
          </ReportEmpty>
        )}
      </ReportPanel>
      <ReportPanel title="Tu deuda va por separado" icon="layers-outline">
        <Text style={s.eyebrow}>CAPITAL PENDIENTE ACTUAL</Text>
        <Text style={s.value}>{money(data.liabilitiesByCurrency?.[currency] ?? 0)}</Text>
        <Text style={s.caption}>
          No restamos toda la deuda a tu dinero de hoy. Sus pagos se distribuyen en el tiempo; abre cada
          crédito para revisar sus cuotas.
        </Text>
        <Button variant="secondary" onPress={() => router.push('/(app)/credits')}>
          Revisar mis créditos
        </Button>
      </ReportPanel>
      <ReportNotice>
        Este reporte muestra cuentas y créditos registrados. No es tu patrimonio completo: no incluye el valor
        de tu vivienda, vehículo u otros bienes.
      </ReportNotice>
    </>
  );
}
