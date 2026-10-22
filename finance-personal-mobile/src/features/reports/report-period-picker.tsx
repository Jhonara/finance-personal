import { useState } from 'react';
import { Animated, Modal, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  currentDashboardPeriod,
  formatDashboardPeriod,
  shiftDashboardPeriod,
  type DashboardPeriod,
} from '@/features/dashboard/dashboard-period';
import { MotionPressable } from '@/ui/motion';
import { useModalMotion } from '@/ui/use-modal-motion';
import { Button } from '@/ui/primitives';
import { colors, radius, spacing } from '@/theme';
import { themedStyleSheet } from '@/theme/themed-styles';
import { reportStyles as s } from './report-ui';
import { shortReportMonth } from './report-model';

export function ReportPeriodPicker({
  period,
  onChange,
}: {
  period: DashboardPeriod;
  onChange: (period: DashboardPeriod) => void;
}) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(period.year);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const modal = useModalMotion(open, () => setOpen(false));
  const choose = (value: DashboardPeriod) => {
    onChange(value);
    modal.close();
  };
  return (
    <>
      <View style={styles.selector}>
        <Arrow
          label="Mes anterior"
          back
          disabled={period.year === 1900 && period.month === 1}
          onPress={() => onChange(shiftDashboardPeriod(period, -1))}
        />
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel="Elegir mes del reporte"
          onPress={() => {
            setYear(period.year);
            setOpen(true);
          }}
          style={styles.center}
        >
          <Text style={s.eyebrow}>MES DEL REPORTE</Text>
          <View style={s.row}>
            <Text style={s.label}>{formatDashboardPeriod(period)}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.primary} />
          </View>
        </MotionPressable>
        <Arrow
          label="Mes siguiente"
          disabled={period.year === 9999 && period.month === 12}
          onPress={() => onChange(shiftDashboardPeriod(period, 1))}
        />
      </View>
      <Modal transparent visible={modal.present} animationType="none" onRequestClose={modal.close}>
        <Animated.View style={[styles.overlay, modal.overlay]}>
          <MotionPressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar calendario de reportes"
            style={styles.dismiss}
            onPress={modal.close}
          />
          <Animated.View
            style={[
              styles.sheet,
              { maxHeight: height - insets.top - 16, paddingBottom: Math.max(insets.bottom, 16) },
              modal.sheet,
            ]}
          >
            <ScrollView contentContainerStyle={s.stack}>
              <View style={s.between}>
                <Text style={s.title}>Elige un mes</Text>
                <Arrow label="Cerrar calendario" close onPress={modal.close} />
              </View>
              <View style={s.between}>
                <Arrow label="Año anterior" back disabled={year <= 1900} onPress={() => setYear(year - 1)} />
                <Text style={s.amount}>{year}</Text>
                <Arrow label="Año siguiente" disabled={year >= 9999} onPress={() => setYear(year + 1)} />
              </View>
              <View style={styles.grid}>
                {Array.from({ length: 12 }, (_, index) => {
                  const value = { year, month: index + 1 };
                  const selected = period.year === year && period.month === value.month;
                  return (
                    <MotionPressable
                      key={value.month}
                      accessibilityRole="button"
                      accessibilityLabel={formatDashboardPeriod(value)}
                      accessibilityState={{ selected }}
                      onPress={() => choose(value)}
                      style={[styles.month, selected && s.selectedChip]}
                    >
                      <Text style={selected ? s.selectedText : s.label}>{shortReportMonth(value)}</Text>
                    </MotionPressable>
                  );
                })}
              </View>
              <Button variant="secondary" onPress={() => choose(currentDashboardPeriod())}>
                Ir a este mes
              </Button>
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}
function Arrow({
  label,
  back,
  close,
  disabled,
  onPress,
}: {
  label: string;
  back?: boolean;
  close?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[styles.arrow, disabled && { opacity: 0.35 }]}
    >
      <Ionicons
        name={close ? 'close' : back ? 'chevron-back' : 'chevron-forward'}
        size={20}
        color={colors.primary}
      />
    </MotionPressable>
  );
}
const styles = themedStyleSheet(() => ({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xs,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 54 },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  dismiss: { flex: 1 },
  sheet: {
    padding: spacing.lg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.surface,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  month: {
    width: '30%',
    flexGrow: 1,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
}));
