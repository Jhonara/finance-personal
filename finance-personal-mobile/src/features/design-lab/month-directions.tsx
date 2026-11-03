import { useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { useAppTheme } from '@/theme/theme-provider';
import { usePrivacy } from '@/privacy/privacy-provider';
import { MotionPressable, MotionEntry } from '@/ui/motion';
import {
  categories,
  comparisonMonths,
  daily,
  expense,
  formatSampleMoney,
  income,
  sampleExpenses,
  weeks,
} from './sample-month';

type Direction = 'Editorial' | 'Atlas' | 'Órbita';
type Lens = 'Ritmo' | 'Categorías' | 'Actividad';
const directions: Direction[] = ['Editorial', 'Atlas', 'Órbita'];
const inks = ['#153E38', '#362A55', '#492D21', '#203952'];
const fills = ['#A9E1CF', '#CFBFEA', '#F4CAA5', '#B9D7EC'];
const icons = ['home-outline', 'restaurant-outline', 'train-outline', 'sparkles-outline'] as const;

export function MonthDirections() {
  const { isDark } = useAppTheme();
  const privacy = usePrivacy();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [direction, setDirection] = useState<Direction>('Editorial');
  const [darkOverride, setDarkOverride] = useState<boolean>();
  const [conceal, setConceal] = useState(false);
  const [lens, setLens] = useState<Lens>('Ritmo');
  const [selection, setSelection] = useState<number | null>(null);
  const [flowDay, setFlowDay] = useState(31);
  const [period, setPeriod] = useState(2);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const dark = darkOverride ?? isDark;
  const hidden = privacy.hidden || conceal;
  const ink = dark ? '#F1F4EE' : '#142F2C';
  const muted = dark ? '#B0C6BD' : '#526A60';
  const background = dark ? '#101F1D' : '#F7F6EF';
  const accent = dark ? '#94E2C6' : '#17634B';
  const line = dark ? '#3B5148' : '#CDD8CE';
  const money = (value: number) => (hidden ? '••••••' : formatSampleMoney(value));
  const compact = width < 370 || fontScale > 1.2;
  const changeDirection = (next: Direction) => {
    setDirection(next);
    setLens(next === 'Atlas' ? 'Categorías' : 'Ritmo');
    setSelection(null);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const label = (text: string, extra?: object) => (
    <Text style={[s.label, { color: muted }, extra]}>{text}</Text>
  );
  const title = (text: string) => <Text style={[s.section, { color: ink }]}>{text}</Text>;
  const selectedCategory = lens === 'Categorías' && selection != null ? categories[selection] : undefined;
  const selectedDay = lens === 'Actividad' && selection != null ? daily[selection] : undefined;
  const selectedWeek = lens === 'Ritmo' && selection != null ? weeks[selection] : undefined;

  function tool(name: keyof typeof Ionicons.glyphMap, text: string, action: () => void, active = false) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={text}
        accessibilityState={{ selected: active }}
        onPress={action}
        style={s.tool}
      >
        <Ionicons name={name} size={21} color={ink} />
      </Pressable>
    );
  }
  function tab(text: string, active: boolean, action: () => void) {
    return (
      <Pressable
        key={text}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        onPress={action}
        style={[s.tab, { borderBottomColor: active ? accent : 'transparent' }]}
      >
        <Text style={[s.tabText, { color: active ? ink : muted }]}>{text}</Text>
      </Pressable>
    );
  }
  function metric(text: string, amount: number, sign: string) {
    return (
      <View style={{ flex: 1, gap: 5 }}>
        {label(text)}
        <Text style={[s.metric, { color: ink, fontSize: compact ? 19 : 22 }]}>
          {sign}
          {money(amount)}
        </Text>
      </View>
    );
  }
  function detail() {
    let heading = 'Toca el gráfico para explorar';
    let description = 'Los importes exactos aparecen aquí.';
    if (selectedCategory) {
      heading = selectedCategory.name + ' · ' + money(selectedCategory.amount);
      description = sampleExpenses
        .filter((item) => categories[item.category]?.name === selectedCategory.name)
        .map((item) => item.day + ' oct · ' + money(item.amount))
        .join('\n');
    } else if (selectedDay) {
      heading = selectedDay.day + ' de octubre';
      description = selectedDay.hasRecords
        ? money(selectedDay.amount) + ' en gastos'
        : 'Sin registros de gasto en esta fecha.';
    } else if (selectedWeek) {
      heading = selectedWeek.label + ' de octubre';
      description = money(selectedWeek.amount) + ' en gastos registrados';
    }
    return (
      <View style={[s.detail, { borderColor: line }]} accessibilityLiveRegion="polite">
        <Text style={[s.body, { color: ink, fontFamily: 'Inter_600SemiBold' }]}>{heading}</Text>
        <Text style={[s.caption, { color: muted }]}>{description}</Text>
      </View>
    );
  }
  function activity() {
    const max = Math.max(...daily.map((day) => day.amount));
    return (
      <View style={{ gap: 8 }}>
        <View style={s.calendar}>
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
            <View key={day} style={s.cell}>
              {label(day, { textAlign: 'center' })}
            </View>
          ))}
          {[0, 1, 2].map((index) => (
            <View key={'blank' + index} style={s.cell} />
          ))}
          {daily.map((day, index) => (
            <Pressable
              key={day.day}
              accessibilityRole="button"
              accessibilityLabel={
                'Día ' + day.day + ', ' + (day.hasRecords ? money(day.amount) + ' de gasto' : 'sin registros')
              }
              accessibilityState={{ selected: selection === index }}
              onPress={() => setSelection(index)}
              style={[s.cell, { minHeight: 44 }]}
            >
              <View
                style={[
                  s.day,
                  {
                    backgroundColor: day.hasRecords
                      ? day.amount / max > 0.5
                        ? '#245E49'
                        : '#B5DFB9'
                      : dark
                        ? '#20372D'
                        : '#EBEEE5',
                    borderColor: selection === index ? (dark ? '#FFFFFF' : '#102D25') : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[
                    s.dayText,
                    {
                      color:
                        day.hasRecords && day.amount / max > 0.5
                          ? '#FFFFFF'
                          : day.hasRecords
                            ? '#163C29'
                            : muted,
                    },
                  ]}
                >
                  {day.day}
                </Text>
                {day.hasRecords && (
                  <View
                    style={{
                      height: 3,
                      backgroundColor: day.amount / max > 0.5 ? '#FFFFFF' : '#245E49',
                      width: Math.max(4, (day.amount / max) * 28),
                      borderRadius: 2,
                    }}
                  />
                )}
              </View>
            </Pressable>
          ))}
        </View>
        {label('Claro → oscuro · menor a mayor gasto')}
      </View>
    );
  }
  function rhythm() {
    const max = Math.max(...weeks.map((week) => week.amount));
    return (
      <View>
        <View style={[s.row, { alignItems: 'flex-end', gap: 14, height: 172 }]}>
          {weeks.map((week, index) => (
            <MotionPressable
              key={week.label}
              accessibilityRole="button"
              accessibilityLabel={'Semana ' + week.label + ', ' + money(week.amount)}
              accessibilityState={{ selected: selection === index }}
              onPress={() => setSelection(index)}
              style={{ flex: 1, height: '100%', justifyContent: 'flex-end', gap: 7 }}
            >
              <Text style={[s.caption, { color: muted, textAlign: 'center' }]}>
                {hidden
                  ? '••'
                  : (week.amount / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 2 }) + ' M'}
              </Text>
              <View
                style={{
                  height: (week.amount / max) * 120,
                  backgroundColor: index === selection ? accent : index === 0 ? '#B5C898' : '#9ACAB6',
                  borderTopLeftRadius: 7,
                  borderTopRightRadius: 7,
                }}
              />
            </MotionPressable>
          ))}
        </View>
        <View style={[s.row, { gap: 14, borderTopWidth: 1, borderColor: line, paddingTop: 9 }]}>
          {weeks.map((week) => (
            <Text key={week.label} style={[s.caption, { flex: 1, textAlign: 'center', color: muted }]}>
              {week.label}
            </Text>
          ))}
        </View>
      </View>
    );
  }
  function categoryMap() {
    // Equal-height tiles, width proportional to spending within each row.
    // Both rows have height proportional to their share of the grand total.
    const rowTotals = [
      categories[0]!.amount + categories[1]!.amount,
      categories[2]!.amount + categories[3]!.amount,
    ];
    return (
      <View style={{ gap: 4, height: compact ? 330 : 278 }}>
        {[0, 1].map((row) => (
          <View key={row} style={{ flex: rowTotals[row]! / expense, flexDirection: 'row', gap: 4 }}>
            {categories.slice(row * 2, row * 2 + 2).map((item, offset) => {
              const index = row * 2 + offset;
              return (
                <MotionPressable
                  key={item.name}
                  onPress={() => setSelection(index)}
                  accessibilityRole="button"
                  accessibilityLabel={item.name + ', ' + money(item.amount)}
                  accessibilityState={{ selected: selection === index }}
                  style={{
                    flex: item.amount / rowTotals[row]!,
                    backgroundColor: fills[index],
                    padding: 12,
                    borderRadius: 5,
                    borderWidth: selection === index ? 2 : 0,
                    borderColor: inks[index],
                    justifyContent: 'space-between',
                  }}
                >
                  <Ionicons name={icons[index]} size={row === 0 ? 25 : 18} color={inks[index]} />
                  <View style={{ gap: 4 }}>
                    <Text style={[s.caption, { color: inks[index], fontFamily: 'Inter_600SemiBold' }]}>
                      {item.name}
                    </Text>
                    <Text style={[s.metric, { color: inks[index], fontSize: row === 0 ? 20 : 16 }]}>
                      {money(item.amount)}
                    </Text>
                  </View>
                </MotionPressable>
              );
            })}
          </View>
        ))}
      </View>
    );
  }
  function lensControls() {
    return (
      <View style={[s.row, { borderBottomWidth: 1, borderColor: line }]}>
        {(['Ritmo', 'Categorías', 'Actividad'] as Lens[]).map((next) =>
          tab(next, lens === next, () => {
            setLens(next);
            setSelection(null);
          }),
        )}
      </View>
    );
  }
  function lensContent() {
    if (hidden)
      return (
        <View style={s.placeholder}>
          <Ionicons name="eye-off-outline" size={32} color={muted} />
          {label('Visualización oculta')}
        </View>
      );
    return (
      <View style={{ gap: 14 }}>
        {lens === 'Actividad' ? activity() : lens === 'Categorías' ? categoryMap() : rhythm()}
        {detail()}
      </View>
    );
  }
  function history() {
    return (
      <View style={{ gap: 12 }}>
        {title('Una historia que empieza')}
        {label('Octubre es el único mes con movimientos.')}
        {comparisonMonths.map((month) => (
          <View
            key={month.label}
            style={[
              s.row,
              {
                justifyContent: 'space-between',
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderColor: line,
              },
            ]}
          >
            <Text style={[s.body, { color: ink }]}>{month.label}</Text>
            <Text style={[s.caption, { color: muted }]}>
              {month.state === 'unavailable'
                ? 'Sin información'
                : month.state === 'empty'
                  ? 'Sin registros'
                  : money(month.income) + ' / ' + money(month.expense)}
            </Text>
          </View>
        ))}
        {label('Ingresos / gastos · COP')}
      </View>
    );
  }
  function orbit() {
    const min = Math.min(0, ...daily.map((item) => item.net));
    const max = Math.max(0, ...daily.map((item) => item.net));
    const x = (index: number) => 5 + index * 10;
    const y = (value: number) => 142 - ((value - min) / (max - min)) * 126;
    const path = daily
      .map((day, index) =>
        index === 0 ? 'M ' + x(index) + ' ' + y(day.net) : 'H ' + x(index) + ' V ' + y(day.net),
      )
      .join(' ');
    const selected = daily[flowDay - 1]!;
    return (
      <LinearGradient colors={dark ? ['#162B2A', '#234A42'] : ['#102D2B', '#1C4C42']} style={s.orbit}>
        <Text style={[s.label, { color: '#B7D2C5', letterSpacing: 2 }]}>FLUJO ACUMULADO</Text>
        <Text style={[s.display, { color: '#F4F9F3', fontSize: compact ? 40 : 48 }]}>
          {money(selected.net)}
        </Text>
        <Text style={[s.caption, { color: '#B7D2C5' }]}>
          {selected.day} de octubre · ingresos menos gastos
        </Text>
        {hidden ? (
          <View style={s.placeholder}>
            <Text style={[s.body, { color: '#B7D2C5' }]}>Gráfico oculto</Text>
          </View>
        ) : (
          <View style={{ marginTop: 20 }}>
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Svg width="100%" height={164} viewBox="0 0 310 164">
                <Line x1={0} x2={310} y1={y(0)} y2={y(0)} stroke="#7B9E8F" strokeDasharray="3 5" />
                <Path d={path + ' L 305 164 L 5 164 Z'} fill="#83C6AA" opacity={0.09} />
                <Path d={path} stroke="#B3E4B9" fill="none" strokeWidth={2.5} />
                <Circle cx={x(selected.day - 1)} cy={y(selected.net)} r={5} fill="#E0F5B8" />
              </Svg>
            </View>
            <View style={[s.row, { justifyContent: 'space-between' }]}>
              {[1, 8, 16, 24, 31].map((day) => (
                <Pressable
                  key={day}
                  accessibilityRole="button"
                  accessibilityLabel={'Flujo al día ' + day + ', ' + money(daily[day - 1]!.net)}
                  accessibilityState={{ selected: selected.day === day }}
                  onPress={() => setFlowDay(day)}
                  style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={[s.caption, { color: selected.day === day ? '#FFFFFF' : '#B7D2C5' }]}>
                    {day} oct
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        <View style={{ borderTopWidth: 1, borderColor: '#517265', paddingTop: 16, marginTop: 8 }}>
          <Text style={[s.caption, { color: '#D3E4D9' }]}>Flujo del mes · {money(income - expense)}</Text>
        </View>
      </LinearGradient>
    );
  }
  let content: ReactNode;
  if (period !== 2) {
    content = (
      <View style={[s.empty, { borderColor: line }]}>
        <Ionicons name={period === 0 ? 'cloud-offline-outline' : 'leaf-outline'} size={42} color={accent} />
        {title(period === 0 ? 'Este mes está pendiente' : 'Un mes sin movimientos')}
        {label(
          period === 0
            ? 'La información de agosto aún no está disponible.'
            : 'Septiembre se consultó y no tiene registros.',
        )}
        {period === 1 && <Text style={[s.display, { color: ink }]}>{money(0)}</Text>}
        <Pressable accessibilityRole="button" onPress={() => setPeriod(2)} style={s.tab}>
          <Text style={[s.body, { color: accent }]}>Volver a octubre →</Text>
        </Pressable>
      </View>
    );
  } else if (showHistory) {
    content = history();
  } else if (direction === 'Órbita') {
    content = (
      <View style={{ gap: 22 }}>
        {orbit()}
        <View style={s.row}>
          {metric('↓ Ingresos', income, '')}
          {metric('↑ Gastos', expense, '')}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setLens('Categorías');
            setSelection(null);
            setShowHistory(false);
          }}
          style={[s.row, { justifyContent: 'space-between', minHeight: 48 }]}
        >
          {title('Dónde se fue')}
          <Ionicons name="arrow-down-outline" size={20} color={ink} />
        </Pressable>
        {lens === 'Categorías' ? (
          lensContent()
        ) : (
          <View style={{ gap: 10 }}>
            {categories.map((item, index) => (
              <View key={item.name} style={[s.row, { justifyContent: 'space-between' }]}>
                <View style={s.row}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: fills[index] }} />
                  <Text style={[s.body, { color: ink }]}>{item.name}</Text>
                </View>
                <Text style={[s.body, { color: ink }]}>{money(item.amount)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  } else {
    content = (
      <View style={{ gap: 22 }}>
        <View>
          {label(direction === 'Atlas' ? 'GASTOS DEL MES' : 'FLUJO NETO · COP', { letterSpacing: 1.5 })}
          <Text style={[s.display, { color: ink, fontSize: compact ? 42 : 52 }]}>
            {money(direction === 'Atlas' ? expense : income - expense)}
          </Text>
          {direction === 'Editorial' && (
            <Text style={[s.caption, { color: muted }]}>Ingresos menos gastos · octubre cerrado</Text>
          )}
        </View>
        {direction === 'Atlas' ? (
          <View
            style={[
              s.row,
              { justifyContent: 'space-between', borderLeftWidth: 3, borderColor: accent, paddingLeft: 12 },
            ]}
          >
            {label('Ingresos ' + money(income))}
            {label('Flujo +' + money(income - expense))}
          </View>
        ) : (
          <View
            style={[
              s.row,
              { borderTopWidth: 1, borderBottomWidth: 1, borderColor: line, paddingVertical: 16 },
            ]}
          >
            {metric('↓ Ingresos', income, '')}
            {metric('↑ Gastos', expense, '')}
          </View>
        )}
        <View style={{ gap: 16 }}>
          {lensControls()}
          {direction === 'Editorial' && (
            <View style={[s.row, { justifyContent: 'space-between' }]}>
              {title(
                lens === 'Ritmo'
                  ? 'El pulso de tus gastos'
                  : lens === 'Actividad'
                    ? 'Tu mes, día a día'
                    : 'El mapa de tus gastos',
              )}
              {label('OCT / 26')}
            </View>
          )}
          {lensContent()}
        </View>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: background, paddingTop: insets.top }}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <View style={{ paddingHorizontal: 20, borderBottomWidth: 1, borderColor: line }}>
        <View style={[s.row, { justifyContent: 'space-between' }]}>
          <View style={s.row}>
            {tool('arrow-back-outline', 'Salir del laboratorio', () => router.back())}
            {tool(
              'options-outline',
              'Opciones del prototipo',
              () => setShowSettings(!showSettings),
              showSettings,
            )}
            {label('LAB · DATOS FICTICIOS', { letterSpacing: 1 })}
          </View>
        </View>
        <View style={s.row}>
          {directions.map((next, index) =>
            tab(String.fromCharCode(65 + index) + ' ' + next, direction === next, () =>
              changeDirection(next),
            ),
          )}
        </View>
        {showSettings && (
          <View style={{ paddingVertical: 8, gap: 10 }}>
            <View style={[s.row, { justifyContent: 'space-between' }]}>
              {tool(dark ? 'sunny-outline' : 'moon-outline', 'Cambiar tema del prototipo', () =>
                setDarkOverride(!dark),
              )}
              {tool(
                hidden ? 'eye-off-outline' : 'eye-outline',
                'Ocultar importes de ejemplo',
                () => setConceal(!conceal),
                hidden,
              )}
              <Pressable accessibilityRole="button" onPress={() => setDarkOverride(undefined)} style={s.tool}>
                {label('Tema de la app')}
              </Pressable>
            </View>
            {label('Explora agosto sin información y septiembre sin registros con las flechas del período.')}
          </View>
        )}
      </View>
      <ScrollView
        ref={scroll}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[s.row, { justifyContent: 'space-between', paddingTop: 20, paddingBottom: 18 }]}>
          <Text style={[s.title, { color: ink }]}>
            Mi mes<Text style={{ color: accent }}>.</Text>
          </Text>
          <View style={[s.row, { gap: 0 }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mes anterior de ejemplo"
              disabled={period === 0}
              onPress={() => {
                setPeriod(period - 1);
                setSelection(null);
              }}
              style={s.tool}
            >
              <Ionicons name="chevron-back" size={16} color={period === 0 ? line : ink} />
            </Pressable>
            <Text style={[s.caption, { color: ink }]}>{comparisonMonths[period]!.label} 2026</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mes siguiente de ejemplo"
              disabled={period === 2}
              onPress={() => {
                setPeriod(period + 1);
                setSelection(null);
              }}
              style={s.tool}
            >
              <Ionicons name="chevron-forward" size={16} color={period === 2 ? line : ink} />
            </Pressable>
          </View>
        </View>
        <MotionEntry revision={direction + lens + period + showHistory}>{content}</MotionEntry>
        {period === 2 && (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setShowHistory(!showHistory);
              scroll.current?.scrollTo({ y: 0, animated: false });
            }}
            style={[
              s.row,
              {
                justifyContent: 'space-between',
                borderTopWidth: 1,
                borderColor: line,
                paddingVertical: 14,
                marginTop: 24,
                minHeight: 48,
              },
            ]}
          >
            <Text style={[s.body, { color: accent }]}>
              {showHistory ? '← Volver a Mi mes' : 'Explorar evolución'}
            </Text>
            <Ionicons name="arrow-forward-outline" size={19} color={accent} />
          </Pressable>
        )}
        <Text style={[s.caption, { color: muted, marginTop: 12 }]}>
          Finance Personal / {direction}
          {'\n'}Prototipo interactivo · moneda COP
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 11, lineHeight: 17 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 30, letterSpacing: -1.1 },
  display: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 48,
    letterSpacing: -2.4,
    fontVariant: ['tabular-nums'],
    marginTop: 8,
    marginBottom: 6,
  },
  metric: { fontFamily: 'Inter_600SemiBold', fontVariant: ['tabular-nums'], letterSpacing: -0.7 },
  section: { fontFamily: 'Inter_600SemiBold', fontSize: 19, letterSpacing: -0.5 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21 },
  caption: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, fontVariant: ['tabular-nums'] },
  tool: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' },
  tab: {
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderBottomWidth: 2,
    marginRight: 5,
  },
  tabText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  detail: { paddingVertical: 14, borderTopWidth: 1, gap: 5 },
  calendar: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.2857%', justifyContent: 'center', padding: 2 },
  day: {
    minHeight: 38,
    borderWidth: 2,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  dayText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  orbit: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
    paddingVertical: 26,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  placeholder: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 12 },
  empty: { paddingVertical: 38, borderTopWidth: 1, gap: 20 },
});
