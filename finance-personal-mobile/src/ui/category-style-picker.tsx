import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  categoryIcons,
  categoryIconGroups,
  categoryColors,
  categoryColorAppearance,
  savedCategoryAppearance,
  filterCategoryIcons,
  type CategoryColorKey,
} from '@/features/categories/category-appearance';
import { colors, radius, spacing, typography } from '@/theme';
import { themedStyleSheet } from '@/theme/themed-styles';
import { Input } from './primitives';
import { MotionPressable } from './motion';

export function CategoryStylePicker({
  iconKey,
  colorKey,
  onIconChange,
  onColorChange,
  disabled = false,
}: {
  iconKey?: string;
  colorKey?: string;
  onIconChange: (icon: (typeof categoryIcons)[number]['key']) => void;
  onColorChange: (color: CategoryColorKey) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('all');
  const appearance = savedCategoryAppearance({ iconKey, colorKey });
  const results = filterCategoryIcons(query, group);
  return (
    <View style={styles.container}>
      <View
        style={[styles.preview, { backgroundColor: appearance.soft }]}
        accessible
        accessibilityLabel={`Vista previa: ${categoryIcons.find((item) => item.key === appearance.icon)?.label ?? 'Etiqueta'}`}
      >
        <Ionicons name={appearance.icon} size={30} color={appearance.ink} />
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text style={[typography.cardTitle, { color: appearance.ink }]}>Vista previa</Text>
          <Text style={[typography.caption, { color: appearance.ink }]}>
            {categoryIcons.find((item) => item.key === appearance.icon)?.label}
          </Text>
        </View>
      </View>
      <Text accessibilityRole="header" style={typography.cardTitle}>
        Color de la categoría
      </Text>
      <View style={styles.grid}>
        {categoryColors.map((color) => {
          const look = categoryColorAppearance(color.key);
          return (
            <MotionPressable
              key={color.key}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={`Color ${color.label}`}
              accessibilityState={{ selected: appearance.colorKey === color.key }}
              onPress={() => onColorChange(color.key)}
              style={[
                styles.color,
                {
                  backgroundColor: look.soft,
                  borderColor: appearance.colorKey === color.key ? look.ink : 'transparent',
                },
              ]}
            >
              <Ionicons
                name={appearance.colorKey === color.key ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={look.ink}
              />
              <Text style={[typography.caption, { color: look.ink }]}>{color.label}</Text>
            </MotionPressable>
          );
        })}
      </View>
      <Input
        label="Buscar ícono"
        placeholder="Ej. café, tarjeta, transporte"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        disabled={disabled}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: spacing.sm }}
      >
        {categoryIconGroups.map((option) => (
          <MotionPressable
            key={option.key}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`Grupo de íconos: ${option.label}`}
            accessibilityState={{ selected: group === option.key }}
            onPress={() => setGroup(option.key)}
            style={[
              styles.group,
              group === option.key && { backgroundColor: colors.primarySoft, borderColor: colors.primary },
            ]}
          >
            <Text style={typography.label}>{option.label}</Text>
          </MotionPressable>
        ))}
      </ScrollView>
      <Text accessibilityLiveRegion="polite" style={typography.caption}>
        {results.length === 1 ? '1 ícono disponible' : `${results.length} íconos disponibles`}
      </Text>
      <View style={styles.grid}>
        {results.map((icon) => (
          <MotionPressable
            key={icon.key}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`Ícono ${icon.label}`}
            accessibilityState={{ selected: appearance.icon === icon.key }}
            onPress={() => onIconChange(icon.key)}
            style={[
              styles.icon,
              appearance.icon === icon.key && {
                backgroundColor: colors.primarySoft,
                borderColor: colors.primary,
              },
            ]}
          >
            <Ionicons name={icon.key} size={26} color={colors.primary} />
            <Text style={styles.iconLabel}>{icon.label}</Text>
            {appearance.icon === icon.key ? (
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
            ) : null}
          </MotionPressable>
        ))}
      </View>
      {!results.length ? (
        <Text style={typography.bodySecondary}>
          No encontramos ese ícono. Prueba otra palabra o cambia de grupo.
        </Text>
      ) : null}
    </View>
  );
}
const styles = themedStyleSheet(() => ({
  container: { gap: spacing.md },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.medium,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  group: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.controlBorder,
  },
  color: {
    minWidth: 80,
    minHeight: 60,
    padding: spacing.sm,
    borderRadius: radius.medium,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  icon: {
    flexBasis: '30%',
    flexGrow: 1,
    minWidth: 80,
    minHeight: 88,
    padding: spacing.sm,
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconLabel: { ...typography.caption, color: colors.textPrimary, textAlign: 'center' },
}));
