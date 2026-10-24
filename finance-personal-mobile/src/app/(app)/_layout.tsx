import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, Text, View, useWindowDimensions, type ColorValue } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useAuth } from '@/auth/auth-provider';
import { QuickActionProvider } from '@/features/quick-actions/quick-action-provider';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { CenterActionButton } from '@/ui/center-action';
import { BrandTabIcon } from '@/ui/brand-tab-icon';
import { InteractiveTourProvider } from '@/features/onboarding/interactive-tour';
import { NavigationDock } from '@/ui/navigation-dock';

// SDK 58 redirects away from href: null/hidden routes. Internal screens must
// stay reachable; only their dock button is omitted.
const internalScreenOptions = { tabBarButton: () => null };

export default function AppLayout() {
  const { state } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  if (state.status === 'bootstrapping') {
    return (
      <View>
        <ActivityIndicator />
      </View>
    );
  }
  if (state.status !== 'authenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  const options = (
    label: string,
    icon: keyof typeof Ionicons.glyphMap,
    selectedIcon: keyof typeof Ionicons.glyphMap,
  ) => ({
    title: label,
    tabBarAccessibilityLabel: label === 'Plan' ? 'Plan: créditos, ahorros y presupuestos' : label,
    tabBarLabel: ({ color }: { color: ColorValue }) => (
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        style={{
          ...typography.caption,
          fontSize: width <= 360 ? 10 : 11,
          lineHeight: 14,
          fontWeight: '600',
          color,
          textAlign: 'center',
          width: '90%',
        }}
      >
        {label === 'Movimientos' && width <= 360 ? 'Movim.' : label}
      </Text>
    ),
    tabBarIcon: ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => (
      <BrandTabIcon name={focused ? selectedIcon : icon} color={color} size={size} focused={focused} />
    ),
  });
  return (
    <QuickActionProvider>
      <InteractiveTourProvider>
        <Tabs
          backBehavior="history"
          tabBar={(props) => <NavigationDock {...props} />}
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textMuted,
            tabBarStyle: {
              height: 64 + insets.bottom,
              paddingBottom: insets.bottom,
              paddingTop: spacing.xs,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              borderRadius: 26,
              marginHorizontal: spacing.sm,
              marginBottom: spacing.sm,
              backgroundColor: '#FBFEFF',
              ...shadows.floating,
            },
            tabBarItemStyle: { borderRadius: radius.pill, marginVertical: spacing.xxs, paddingHorizontal: 2 },
            tabBarActiveBackgroundColor: 'transparent',
            tabBarHideOnKeyboard: true,
            tabBarLabelStyle: {
              ...typography.caption,
              fontSize: 10,
              fontWeight: '600',
              marginBottom: spacing.xs,
            },
          }}
        >
          <Tabs.Screen name="index" options={options('Inicio', 'home-outline', 'home')} />
          <Tabs.Screen
            name="transactions"
            options={options('Movimientos', 'swap-horizontal-outline', 'swap-horizontal')}
          />
          <Tabs.Screen
            name="action"
            options={{
              title: 'Registrar',
              tabBarAccessibilityLabel: 'Registrar movimiento',
              tabBarShowLabel: false,
              tabBarActiveBackgroundColor: 'transparent',
              tabBarButton: () => <CenterActionButton />,
            }}
          />
          <Tabs.Screen name="accounts" options={options('Cuentas', 'wallet-outline', 'wallet')} />
          <Tabs.Screen name="plan" options={options('Menú', 'grid-outline', 'grid')} />
          <Tabs.Screen name="more" options={{ ...internalScreenOptions, tabBarStyle: { display: 'none' } }} />
          <Tabs.Screen name="reports" options={internalScreenOptions} />
          <Tabs.Screen name="report-transactions" options={internalScreenOptions} />
          <Tabs.Screen name="guide" options={internalScreenOptions} />
          <Tabs.Screen
            name="new-expense"
            options={{ ...internalScreenOptions, tabBarStyle: { display: 'none' } }}
          />
          <Tabs.Screen
            name="new-income"
            options={{ ...internalScreenOptions, tabBarStyle: { display: 'none' } }}
          />
          <Tabs.Screen
            name="new-transfer"
            options={{ ...internalScreenOptions, tabBarStyle: { display: 'none' } }}
          />
          <Tabs.Screen
            name="account-form"
            options={{ ...internalScreenOptions, tabBarStyle: { display: 'none' } }}
          />
          <Tabs.Screen name="account-detail" options={internalScreenOptions} />
          <Tabs.Screen name="recurrences" options={internalScreenOptions} />
          <Tabs.Screen
            name="recurring-form"
            options={{ ...internalScreenOptions, tabBarStyle: { display: 'none' } }}
          />
          <Tabs.Screen name="categories" options={internalScreenOptions} />
          <Tabs.Screen
            name="category-form"
            options={{ ...internalScreenOptions, tabBarStyle: { display: 'none' } }}
          />
          <Tabs.Screen name="budgets" options={internalScreenOptions} />
          <Tabs.Screen name="alerts" options={internalScreenOptions} />
          <Tabs.Screen name="savings" options={internalScreenOptions} />
          <Tabs.Screen name="credits" options={internalScreenOptions} />
          <Tabs.Screen
            name="budget-form"
            options={{ ...internalScreenOptions, tabBarStyle: { display: 'none' } }}
          />
          <Tabs.Screen name="budget-detail" options={internalScreenOptions} />
          <Tabs.Screen
            name="saving-form"
            options={{ ...internalScreenOptions, tabBarStyle: { display: 'none' } }}
          />
          <Tabs.Screen name="saving-detail" options={internalScreenOptions} />
          <Tabs.Screen
            name="credit-form"
            options={{ ...internalScreenOptions, tabBarStyle: { display: 'none' } }}
          />
          <Tabs.Screen name="credit-detail" options={internalScreenOptions} />
          <Tabs.Screen name="credit-amortization" options={internalScreenOptions} />
          <Tabs.Screen name="credit-payments" options={internalScreenOptions} />
          <Tabs.Screen
            name="credit-opening"
            options={{ ...internalScreenOptions, tabBarStyle: { display: 'none' } }}
          />
          <Tabs.Screen name="inbox" options={internalScreenOptions} />
          <Tabs.Screen name="shortcuts" options={internalScreenOptions} />
          <Tabs.Screen
            name="purchase-review"
            options={{ ...internalScreenOptions, tabBarStyle: { display: 'none' } }}
          />
        </Tabs>
      </InteractiveTourProvider>
    </QuickActionProvider>
  );
}
