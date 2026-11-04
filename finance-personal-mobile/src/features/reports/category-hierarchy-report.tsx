import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { DashboardPeriod } from '@/features/dashboard/dashboard-period';
import { categoryAppearance, savedCategoryAppearance } from '@/features/categories/category-appearance';
import { useCategories } from '@/features/categories/use-categories';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { colors, spacing } from '@/theme';
import { Button } from '@/ui/primitives';
import { MotionPressable } from '@/ui/motion';
import { ModalSelector } from '@/ui/modal-selector';
import { reportPalette, ReportAmountBars, ReportRing } from './report-charts';
import { ReportChoice, ReportEmpty, ReportNotice, ReportPanel, reportStyles as s } from './report-ui';
import type { CategoryReport, CategoryReportGroup, ReportCategoryType } from './reports-api';

const groupKey = (group: CategoryReportGroup) => String(group.categoryId ?? 'uncategorized');

export function CategoryHierarchyReport({
  data,
  period,
  currency,
  type,
  hidden,
}: {
  data: CategoryReport;
  period: DashboardPeriod;
  currency: string;
  type: ReportCategoryType;
  hidden: boolean;
}) {
  const [level, setLevel] = useState<'summary' | 'detail'>('summary');
  const [visual, setVisual] = useState<'mosaic' | 'distribution' | 'ranking'>();
  const [selectedKey, setSelectedKey] = useState<string>();
  const [choosingGroup, setChoosingGroup] = useState(false);
  const categories = useCategories(type, null);
  const expense = type === 'EXPENSE';
  const noun = expense ? 'gastos' : 'ingresos';
  const money = (amount: number) => formatPrivateMoney(amount, currency, hidden);
  const groups = [...data.groups].sort((a, b) => b.amount - a.amount);
  const selected = groups.find((group) => groupKey(group) === selectedKey) ?? groups[0];
  const appearance = (id: number | null, name: string) => {
    const saved = categories.data?.find((category) => category.id === id);
    return saved ? savedCategoryAppearance(saved) : categoryAppearance(name, type);
  };
  const icon = (id: number | null, name: string, color: string) => {
    const look = appearance(id, name);
    return (
      <View
        style={[
          s.icon,
          { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.surfaceSecondary },
        ]}
      >
        <Ionicons name={look.icon} size={17} color={color} />
      </View>
    );
  };
  const openTransactions = (categoryId: number | null, name: string) => {
    router.push({
      pathname: '/(app)/report-transactions',
      params: {
        ...period,
        currency,
        type,
        categoryId: categoryId == null ? 'uncategorized' : String(categoryId),
        category: name,
      },
    });
  };
  const selectGroup = (group: CategoryReportGroup) => {
    setSelectedKey(groupKey(group));
    setLevel('detail');
  };
  const detailItems = selected
    ? [
        ...selected.subcategories.map((item) => ({
          key: String(item.categoryId),
          categoryId: item.categoryId,
          name: item.categoryName,
          value: item.amount,
          caption: 'Subcategoría · Ver movimientos →',
          accessibilityLabel: `Ver movimientos de ${item.categoryName}`,
          onPress: () => openTransactions(item.categoryId, `${selected.categoryName} › ${item.categoryName}`),
        })),
        ...(selected.directAmount !== 0 || selected.subcategories.length === 0
          ? [
              {
                key: 'direct',
                categoryId: selected.categoryId,
                name: selected.categoryId == null ? 'Sin categoría' : 'Sin subcategoría',
                value: selected.directAmount,
                caption:
                  selected.categoryId == null
                    ? 'Movimientos que aún no tienen categoría asignada.'
                    : `Registrados directamente en ${selected.categoryName}.`,
                onPress: undefined,
                accessibilityLabel: undefined,
              },
            ]
          : []),
      ].sort((a, b) => b.value - a.value)
    : [];
  const rawItems =
    level === 'summary'
      ? groups.map((group) => ({
          key: groupKey(group),
          categoryId: group.categoryId,
          name: group.categoryName,
          value: group.amount,
          caption:
            group.categoryId == null
              ? 'Movimientos sin categoría asignada · Ver detalle →'
              : group.subcategories.length
                ? `${group.subcategories.length} ${group.subcategories.length === 1 ? 'subcategoría' : 'subcategorías'} · Ver detalle →`
                : 'Movimientos sin subcategoría · Ver detalle →',
          accessibilityLabel: `Ver detalle de ${group.categoryName}`,
          onPress: () => selectGroup(group),
        }))
      : detailItems;
  const palette = reportPalette(rawItems.map((item) => item.key));
  const items = rawItems.map((item) => {
    const color = palette.get(item.key)!;
    return { ...item, color, icon: icon(item.categoryId, item.name, color) };
  });
  const hasNegative = items.some((item) => item.value < 0);
  const total = level === 'summary' ? data.totalAmount : (selected?.amount ?? 0);
  const canShowShares = total > 0 && !hasNegative;
  const singleDetail = level === 'detail' && items.length === 1 && !hasNegative;
  const mosaicItems = items.filter((item) => item.value / total >= 0.1).slice(0, 4);
  const mosaicTotal = mosaicItems.reduce((sum, item) => sum + item.value, 0);
  const fitsMosaic = expense && canShowShares && mosaicItems.length >= 2;
  const visualMode =
    visual === 'mosaic' && !fitsMosaic
      ? 'ranking'
      : (visual ?? (items.length > 5 ? 'ranking' : fitsMosaic ? 'mosaic' : 'distribution'));
  const showRanking = !singleDetail && (visualMode === 'ranking' || hasNegative || !canShowShares);
  const share = (amount: number) =>
    `${((amount / total) * 100).toLocaleString('es-CO', { maximumFractionDigits: 1 })}%`;

  return (
    <ReportPanel
      title={expense ? '¿En qué gastaste?' : '¿De dónde vienen tus ingresos?'}
      subtitle={`Resumen por categoría padre y detalle por subcategoría, en ${currency}.`}
      icon={expense ? 'pie-chart-outline' : 'trending-up-outline'}
    >
      <ReportChoice
        label={`Vista de ${noun}`}
        choices={[
          { value: 'summary', label: 'Resumen' },
          { value: 'detail', label: 'Detalle' },
        ]}
        selected={level}
        onSelect={setLevel}
      />
      {groups.length ? (
        <>
          <View style={s.note}>
            <Text style={s.eyebrow}>
              {level === 'summary' ? `TOTAL DE ${noun.toUpperCase()}` : 'CATEGORÍA PADRE'}
            </Text>
            {level === 'detail' ? <Text style={s.title}>{selected?.categoryName}</Text> : null}
            <Text style={s.value}>{money(total)}</Text>
            <Text style={s.caption}>
              {level === 'summary'
                ? 'Cada grupo se cuenta una sola vez, incluyendo sus subcategorías.'
                : 'Este total reúne las subcategorías y los movimientos directos del grupo.'}
            </Text>
          </View>
          {level === 'detail' ? (
            <Button variant="secondary" onPress={() => setChoosingGroup(true)}>
              Cambiar categoría padre
            </Button>
          ) : null}
          {!singleDetail && !hasNegative ? (
            <ReportChoice
              label={`Gráfica de ${noun}`}
              choices={[
                ...(fitsMosaic ? [{ value: 'mosaic' as const, label: 'Mosaico' }] : []),
                { value: 'distribution', label: 'Distribución' },
                { value: 'ranking', label: 'Ranking' },
              ]}
              selected={visualMode}
              onSelect={setVisual}
            />
          ) : null}
          {hasNegative ? (
            <ReportNotice>
              Hay reversiones o ajustes. Las barras conservan su signo y el total neto; no se dibuja una
              distribución circular con importes negativos.
            </ReportNotice>
          ) : visualMode === 'mosaic' && !hidden ? (
            <View style={{ gap: spacing.xs }}>
              {mosaicItems.length < items.length && (
                <Text style={s.caption}>Grupos principales · desglose completo debajo</Text>
              )}
              {[mosaicItems.slice(0, 2), mosaicItems.slice(2)]
                .filter((row) => row.length)
                .map((row) => {
                  const rowTotal = row.reduce((sum, item) => sum + item.value, 0);
                  return (
                    <View
                      key={row[0]!.key}
                      style={{
                        flexDirection: 'row',
                        gap: spacing.xs,
                        minHeight: (250 * rowTotal) / mosaicTotal,
                      }}
                    >
                      {row.map((item) => {
                        const look = appearance(item.categoryId, item.name);
                        return (
                          <MotionPressable
                            key={item.key}
                            accessibilityRole={item.onPress ? 'button' : undefined}
                            accessibilityLabel={item.name + ', ' + money(item.value)}
                            onPress={item.onPress}
                            style={{
                              flex: item.value / rowTotal,
                              minWidth: 0,
                              minHeight: 48,
                              padding: spacing.xs,
                              borderRadius: 8,
                              backgroundColor: look.soft,
                              justifyContent: 'flex-end',
                              borderLeftWidth: 3,
                              borderLeftColor: item.color,
                            }}
                          >
                            <Text style={[s.caption, { color: look.ink }]}>{item.name}</Text>
                            <Text style={[s.label, { color: look.ink }]}>{money(item.value)}</Text>
                          </MotionPressable>
                        );
                      })}
                    </View>
                  );
                })}
            </View>
          ) : canShowShares && visualMode === 'distribution' && !singleDetail ? (
            <ReportRing
              parts={items.map(({ key, name, value, color }) => ({ key, name, value, color }))}
              hidden={hidden}
              title={level === 'summary' ? 'Por grupo' : 'Subcategorías'}
              value={money(total)}
              showLegend={false}
              onSelectKey={(key) => items.find((item) => item.key === key)?.onPress?.()}
            />
          ) : null}
          <Text accessibilityRole="header" style={s.label}>
            {level === 'summary' ? 'Categorías padre' : 'Detalle de subcategorías'}
          </Text>
          {singleDetail ? (
            <View style={[s.note, { backgroundColor: colors.surfaceSecondary, gap: spacing.sm }]}>
              <View style={s.row}>
                {items[0]!.icon}
                <Text style={[s.label, { flex: 1 }]}>{items[0]!.name}</Text>
                {!hidden && total > 0 ? <Text style={s.label}>100%</Text> : null}
              </View>
              <Text style={s.amount}>{money(items[0]!.value)}</Text>
              <Text style={s.caption}>{items[0]!.caption}</Text>
              <Text style={s.caption}>
                {total > 0
                  ? 'Todo el importe de este grupo está en esta categoría.'
                  : 'Esta categoría no tiene movimientos netos en el período.'}
              </Text>
              {items[0]!.onPress ? (
                <Button
                  variant="secondary"
                  accessibilityLabel={items[0]!.accessibilityLabel}
                  onPress={items[0]!.onPress}
                >
                  Ver movimientos de la subcategoría
                </Button>
              ) : null}
            </View>
          ) : showRanking ? (
            <>
              <Text style={s.caption}>
                Compara los importes en una misma escala. Toca una categoría para ver su detalle.
              </Text>
              <ReportAmountBars
                items={items.map((item) => ({
                  ...item,
                  caption:
                    !hidden && canShowShares
                      ? `${share(item.value)} del ${level === 'summary' ? 'total' : 'grupo'} · ${item.caption}`
                      : item.caption,
                }))}
                currency={currency}
                hidden={hidden}
              />
            </>
          ) : (
            <View>
              {items.map((item) => (
                <MotionPressable
                  key={item.key}
                  accessibilityRole={item.onPress ? 'button' : undefined}
                  accessibilityLabel={item.accessibilityLabel}
                  disabled={!item.onPress}
                  onPress={item.onPress}
                  style={s.item}
                >
                  <View style={s.between}>
                    <View style={[s.row, { flex: 1 }]}>
                      <View style={[s.dot, { backgroundColor: item.color }]} />
                      {item.icon}
                      <Text style={[s.label, { flex: 1 }]}>{item.name}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
                      <Text style={s.label}>{money(item.value)}</Text>
                      {!hidden && canShowShares ? <Text style={s.caption}>{share(item.value)}</Text> : null}
                    </View>
                  </View>
                  <Text style={s.caption}>{item.caption}</Text>
                </MotionPressable>
              ))}
            </View>
          )}
          {level === 'detail' && selected ? (
            <Button
              variant="secondary"
              onPress={() => openTransactions(selected.categoryId, selected.categoryName)}
            >
              Ver movimientos del grupo
            </Button>
          ) : null}
          {level === 'detail' ? (
            <Button variant="ghost" onPress={() => setLevel('summary')}>
              Volver al resumen
            </Button>
          ) : null}
        </>
      ) : (
        <ReportEmpty title={expense ? `Sin gastos en ${currency}` : `Sin ingresos en ${currency}`}>
          Al registrar un movimiento en este mes, podrás ver su categoría padre y su subcategoría aquí.
        </ReportEmpty>
      )}
      <ModalSelector
        visible={choosingGroup}
        label="Categoría padre del reporte"
        subtitle="Elige el grupo para consultar sus subcategorías."
        options={groups.map((group) => ({
          id: group.categoryId ?? -1,
          label: group.categoryName,
          subtitle: money(group.amount),
        }))}
        selectedId={selected ? (selected.categoryId ?? -1) : undefined}
        onClose={() => setChoosingGroup(false)}
        onSelect={(id) => {
          const group = groups.find((entry) => (entry.categoryId ?? -1) === id);
          if (group) selectGroup(group);
          setChoosingGroup(false);
        }}
      />
    </ReportPanel>
  );
}
