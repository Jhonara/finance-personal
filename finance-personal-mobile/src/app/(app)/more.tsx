import { router } from 'expo-router';

import { useAuth } from '@/auth/auth-provider';
import { MoreListItem, ScreenHeader, SectionHeader } from '@/ui/headers';
import { Button, Screen } from '@/ui/primitives';

export default function MoreScreen() {
  const { logout } = useAuth();
  return (
    <Screen scroll>
      <ScreenHeader title="Más" subtitle="Organiza y configura tu experiencia" />
      <SectionHeader title="Tu dinero" />
      <MoreListItem
        icon="pie-chart-outline"
        label="Presupuestos"
        onPress={() => router.push('/(app)/budgets')}
      />
      <MoreListItem icon="ribbon-outline" label="Ahorros" />
      <MoreListItem icon="card-outline" label="Créditos" />
      <MoreListItem icon="notifications-outline" label="Alertas" />
      <SectionHeader title="Cuenta" />
      <MoreListItem icon="person-outline" label="Perfil" />
      <MoreListItem icon="settings-outline" label="Ajustes" />
      <SectionHeader title="Sesión" />
      <Button variant="ghost" accessibilityLabel="Cerrar sesión" onPress={() => void logout()}>
        Cerrar sesión
      </Button>
    </Screen>
  );
}
