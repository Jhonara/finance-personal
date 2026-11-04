import { useState } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { Budget } from '@/features/secondary/secondary-api';
import type { DashboardPeriod } from '@/features/dashboard/dashboard-period';
import { categoryAppearance, savedCategoryAppearance } from '@/features/categories/category-appearance';
import { useCategories } from '@/features/categories/use-categories';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { colors } from '@/theme';
import { Button } from '@/ui/primitives';
import { Progress } from '@/ui/progress';
import { ModalSelector } from '@/ui/modal-selector';
import { ReportAmountBars } from './report-charts';
import { BudgetUtilizationCards } from './budget-utilization-cards';
import { ReportChoice, ReportEmpty, ReportNotice, ReportPanel, reportStyles as s } from './report-ui';
import type { BudgetComparison, BudgetComparisonGroup, BudgetComparisonItem } from './reports-api';

export function BudgetComparisonReport({
  data,
  budgets,
  period,
  hidden,
}: {
  data: BudgetComparison;
  budgets: Budget[];
  period: DashboardPeriod;
  hidden: boolean;
}) {
  const [level, setLevel] = useState<'summary' | 'detail'>('summary');
  const [selectedId, setSelectedId] = useState<number>();
  const [choosingGroup, setChoosingGroup] = useState(false);
  const categories = useCategories('EXPENSE', null);
  const money = (value: number) => formatPrivateMoney(value, data.currency, hidden);
  const groups = [...data.groups].sort((a, b) => b.spentAmount - a.spentAmount);
  const selected = groups.find((group) => group.categoryId === selectedId) ?? groups[0];
  const look = (id: number, name: string) => {
    const category = categories.data?.find((entry) => entry.id === id);
    return category ? savedCategoryAppearance(category) : categoryAppearance(name, 'EXPENSE');
  };
  const icon = (id: number, name: string) => {
    const appearance = look(id, name);
    return (
      <View style={[s.icon, { width: 30, height: 30, borderRadius: 10, backgroundColor: appearance.soft }]}>
        <Ionicons name={appearance.icon} color={appearance.ink} size={17} />
      </View>
    );
  };
  const openTransactions = (id: number | null, name: string) =>
    router.push({
      pathname: '/(app)/report-transactions',
      params: {
        ...period,
        currency: data.currency,
        type: 'EXPENSE',
        categoryId: id == null ? 'uncategorized' : String(id),
        category: name,
      },
    });
  const selectGroup = (group: BudgetComparisonGroup) => {
    setSelectedId(group.categoryId);
    setLevel('detail');
  };
  const outcome = (entry: BudgetComparisonGroup | BudgetComparisonItem) => (
    <View style={s.stack}>
      <View style={s.between}>
        <Text style={s.caption}>{entry.excessAmount > 0 ? 'Exceso de presupuesto' : 'Disponible'}</Text>
        <Text style={[s.label, entry.excessAmount > 0 && { color: colors.warning }]}>
          {money(entry.excessAmount > 0 ? entry.excessAmount : entry.remainingAmount)}
        </Text>
      </View>
      <View style={s.between}>
        <Text style={s.caption}>Diferencia</Text>
        <Text style={s.caption}>{money(entry.differenceAmount)}</Text>
      </View>
      {!hidden ? (
        <Text style={s.caption}>
          {entry.percentageUsed == null
            ? 'Utilización: no se calcula con un límite cero.'
            : `${entry.percentageUsed.toLocaleString('es-CO', { maximumFractionDigits: 1 })}% utilizado`}
        </Text>
      ) : null}
    </View>
  );
  const groupDescription = (group: BudgetComparisonGroup) =>
    group.hasParentBudget
      ? 'Techo del grupo'
      : group.hasBudget
        ? 'Suma de límites individuales'
        : 'Sin presupuesto';
  const groupFooter = (group: BudgetComparisonGroup) => (
    <View style={s.stack}>
      {group.hasBudget ? outcome(group) : null}
      {group.budgetedSpentAmount !== group.spentAmount ? (
        <View style={s.between}>
          <Text style={s.caption}>Gastado total del grupo</Text>
          <Text style={s.label}>{money(group.spentAmount)}</Text>
        </View>
      ) : null}
      {group.directSpentAmount !== 0 && !group.hasParentBudget ? (
        <Text style={s.caption}>Gasto directo sin presupuesto: {money(group.directSpentAmount)}</Text>
      ) : null}
    </View>
  );
  const groupItems = groups.map((group) => ({
    key: String(group.categoryId),
    name: group.categoryName,
    value: group.hasBudget ? group.budgetedSpentAmount : group.spentAmount,
    reference: group.hasBudget ? group.limitAmount : undefined,
    color: group.excessAmount > 0 ? colors.warning : look(group.categoryId, group.categoryName).ink,
    icon: icon(group.categoryId, group.categoryName),
    caption: `${groupDescription(group)} · Ver subcategorías →`,
    footer: groupFooter(group),
    accessibilityLabel: `Ver comparación de ${group.categoryName}`,
    onPress: () => selectGroup(group),
  }));
  const detailItems =
    selected?.subcategories.map((item) => ({
      key: String(item.categoryId),
      name: item.categoryName,
      value: item.spentAmount,
      reference: item.hasBudget ? item.limitAmount : undefined,
      percentageUsed: item.percentageUsed,
      color: item.excessAmount > 0 ? colors.warning : look(item.categoryId, item.categoryName).ink,
      icon: icon(item.categoryId, item.categoryName),
      caption: item.hasBudget
        ? 'Límite de la subcategoría · Ver movimientos →'
        : item.coveredByParentBudget
          ? 'Incluida en el techo del grupo · Ver movimientos →'
          : 'Sin presupuesto · Ver movimientos →',
      footer: item.hasBudget ? outcome(item) : undefined,
      accessibilityLabel: `Ver movimientos de ${item.categoryName}`,
      onPress: () => openTransactions(item.categoryId, `${selected.categoryName} › ${item.categoryName}`),
    })) ?? [];
  const selectedBudget = budgets.find((budget) => budget.categoryId === selected?.categoryId);
  const now = new Date();
  const monthStart = new Date(period.year, period.month - 1, 1);
  const daysInMonth = new Date(period.year, period.month, 0).getDate();
  const sameMonth = now.getFullYear() === period.year && now.getMonth() + 1 === period.month;
  const elapsed = sameMonth ? now.getDate() - 1 : now < monthStart ? 0 : daysInMonth;
  const used =
    data.totalBudgetedAmount > 0
      ? (data.totalSpentOnBudgetedCategories / data.totalBudgetedAmount) * 100
      : undefined;
  const nearLimit = data.groups.filter(
    (group) => group.hasBudget && (group.percentageUsed ?? 0) >= 80,
  ).length;

  return (
    <ReportPanel
      title="Presupuestado frente a gastado"
      subtitle="Consulta los grupos o entra al detalle de sus subcategorías."
      icon="git-compare-outline"
    >
      <ReportChoice
        label="Vista de presupuestos"
        choices={[
          { value: 'summary', label: 'Resumen' },
          { value: 'detail', label: 'Detalle' },
        ]}
        selected={level}
        onSelect={setLevel}
      />
      {level === 'summary' ? (
        <>
          <View style={s.note}>
            <Text style={s.eyebrow}>PRESUPUESTO DEL MES · {data.currency}</Text>
            <Text style={s.value}>{money(data.totalBudgetedAmount)}</Text>
            <View style={s.between}>
              <Text style={s.caption}>Gastado total</Text>
              <Text style={s.label}>{money(data.totalSpentAmount)}</Text>
            </View>
            <View style={s.between}>
              <Text style={s.caption}>Gastado con presupuesto</Text>
              <Text style={s.label}>{money(data.totalSpentOnBudgetedCategories)}</Text>
            </View>
            <View style={s.between}>
              <Text style={s.caption}>Sin presupuesto</Text>
              <Text style={s.label}>{money(data.totalUnbudgetedAmount)}</Text>
            </View>
          </View>
          {used !== undefined && !hidden && (
            <View style={s.stack}>
              <Text accessibilityRole="header" style={s.label}>
                Ritmo del mes
              </Text>
              <Text style={s.caption}>
                {elapsed} de {daysInMonth} días completos
              </Text>
              <Progress
                value={(elapsed / daysInMonth) * 100}
                label="Avance del calendario"
                animated={false}
              />
              <Text style={s.caption}>
                {used.toLocaleString('es-CO', { maximumFractionDigits: 1 })}% del presupuesto utilizado
              </Text>
              <Progress value={used} color={colors.expense} label="Uso del presupuesto" animated={false} />
              {nearLimit > 0 && (
                <Text style={s.label}>
                  {nearLimit} {nearLimit === 1 ? 'grupo llegó' : 'grupos llegaron'} al 80% de su límite.
                </Text>
              )}
              <Text style={s.caption}>
                El uso compara solo gasto cubierto por el presupuesto. El calendario es una referencia, no una
                proyección.
              </Text>
            </View>
          )}
          <ReportNotice>
            El techo de una categoría padre incluye sus subcategorías. Los límites individuales no se vuelven
            a sumar a ese techo.
          </ReportNotice>
          {groupItems.length ? (
            <ReportAmountBars
              items={groupItems}
              currency={data.currency}
              hidden={hidden}
              referenceLabel="Presupuestado"
              valueLabel="Gastado con presupuesto"
              scale="individual"
            />
          ) : null}
        </>
      ) : selected ? (
        <>
          <View style={s.note}>
            <Text style={s.eyebrow}>CATEGORÍA PADRE</Text>
            <Text style={s.title}>{selected.categoryName}</Text>
            <Text style={s.caption}>{groupDescription(selected)}</Text>
          </View>
          <Button variant="secondary" onPress={() => setChoosingGroup(true)}>
            Cambiar categoría padre
          </Button>
          <ReportAmountBars
            items={[
              {
                ...groupItems.find((item) => item.key === String(selected.categoryId))!,
                onPress: undefined,
                accessibilityLabel: undefined,
                caption: groupDescription(selected),
              },
            ]}
            currency={data.currency}
            hidden={hidden}
            referenceLabel="Presupuestado"
            valueLabel="Gastado con presupuesto"
            scale="individual"
          />
          <Text style={s.label}>Detalle de subcategorías</Text>
          {detailItems.length ? (
            <>
              <Text style={s.caption}>
                Cada indicador compara el gasto con el límite de esa subcategoría. El tamaño del presupuesto
                de otra categoría no cambia esta escala.
              </Text>
              <BudgetUtilizationCards items={detailItems} currency={data.currency} hidden={hidden} />
            </>
          ) : (
            <Text style={s.caption}>Este grupo todavía no tiene subcategorías.</Text>
          )}
          {selected.directSpentAmount !== 0 ? (
            <View style={s.note}>
              <Text style={s.label}>Sin subcategoría: {money(selected.directSpentAmount)}</Text>
              <Text style={s.caption}>
                {selected.hasParentBudget
                  ? 'Estos movimientos directos están incluidos en el techo del grupo.'
                  : 'Gastos directos sin presupuesto. No se ocultan del total.'}
              </Text>
            </View>
          ) : null}
          <Button
            variant="secondary"
            onPress={() => openTransactions(selected.categoryId, selected.categoryName)}
          >
            Ver movimientos del grupo
          </Button>
          {selectedBudget?.id ? (
            <Button
              variant="ghost"
              onPress={() =>
                router.push({
                  pathname: '/(app)/budget-detail',
                  params: { id: selectedBudget.id!, ...period },
                })
              }
            >
              Revisar presupuesto
            </Button>
          ) : null}
          <Button variant="ghost" onPress={() => setLevel('summary')}>
            Volver al resumen
          </Button>
        </>
      ) : null}
      {level === 'summary' && data.unbudgetedCategories.length ? (
        <View style={s.stack}>
          <Text style={s.label}>Gastos sin presupuesto</Text>
          <ReportAmountBars
            items={data.unbudgetedCategories.map((item, index) => ({
              key: `${item.categoryId ?? 'none'}-${index}`,
              name: item.parentCategoryName
                ? `${item.parentCategoryName} › ${item.categoryName}`
                : item.categoryName,
              value: item.spentAmount,
              color: colors.textMuted,
              caption: 'Sin presupuesto · Ver movimientos →',
              accessibilityLabel: `Ver gasto sin presupuesto de ${item.categoryName}`,
              onPress: () => openTransactions(item.categoryId, item.categoryName),
            }))}
            currency={data.currency}
            hidden={hidden}
          />
        </View>
      ) : null}
      {!budgets.length ? (
        <ReportEmpty
          title="Este mes no tiene presupuestos"
          action="Organizar presupuestos"
          onPress={() => router.push({ pathname: '/(app)/budgets', params: period })}
        >
          Los gastos siguen visibles. Puedes agregar un techo general o límites por subcategoría.
        </ReportEmpty>
      ) : null}
      <Text style={s.caption}>
        Los importes y porcentajes provienen de los gastos registrados del período. Un límite cero conserva el
        gasto y no genera una división entre cero.
      </Text>
      <ModalSelector
        visible={choosingGroup}
        label="Comparar categoría padre"
        subtitle="Selecciona un grupo para ver presupuesto y gasto por subcategoría."
        options={groups.map((group) => ({ id: group.categoryId, label: group.categoryName }))}
        selectedId={selected?.categoryId}
        onClose={() => setChoosingGroup(false)}
        onSelect={(id) => {
          setSelectedId(id);
          setChoosingGroup(false);
        }}
      />
    </ReportPanel>
  );
}
