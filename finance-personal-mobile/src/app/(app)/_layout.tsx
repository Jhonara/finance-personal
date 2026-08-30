import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, View, type ColorValue } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useAuth } from '@/auth/auth-provider';
import { colors, radius, sizes, spacing } from '@/theme';

export default function AppLayout() {
  const { state } = useAuth();

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

  const options = (label: string, icon: keyof typeof Ionicons.glyphMap) => ({
    title: label,
    tabBarIcon: ({ color, size }: { color: ColorValue; size: number }) => (
      <Ionicons name={icon} color={color} size={size} />
    ),
  });
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          height: sizes.tabBar,
          paddingTop: spacing.xs,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        },
        tabBarItemStyle: { borderRadius: radius.pill, marginVertical: spacing.xs },
        tabBarActiveBackgroundColor: colors.primarySoft,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={options('Inicio', 'home-outline')} />
      <Tabs.Screen name="transactions" options={options('Movimientos', 'swap-horizontal-outline')} />
      <Tabs.Screen name="accounts" options={options('Cuentas', 'wallet-outline')} />
      <Tabs.Screen name="more" options={options('Más', 'grid-outline')} />
      <Tabs.Screen name="new-expense" options={{ href: null }} />
      <Tabs.Screen name="new-income" options={{ href: null }} />
      <Tabs.Screen name="new-transfer" options={{ href: null }} />
      <Tabs.Screen name="account-form" options={{ href: null }} />
      <Tabs.Screen name="account-detail" options={{ href: null }} />
      <Tabs.Screen name="budgets" options={{ href: null }} />
    </Tabs>
  );
}
