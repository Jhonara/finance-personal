import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Button, Card, Screen } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { Disclosure } from '@/ui/disclosure';
import { localDateFromNative } from '@/utils/local-date';
import { spacing, typography } from '@/theme';

export default function ShortcutsGuide() {
  const [error, setError] = useState('');
  const [sample] = useState(() => ({
    v: '1',
    demo: '1',
    kind: 'EXPENSE',
    amount: '12500',
    currency: 'COP',
    description: 'Cafe de prueba',
    date: localDateFromNative(new Date()),
  }));
  const sampleUrl = Linking.createURL('/shortcut', { queryParams: sample });
  const expoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  const openApple = async () => {
    setError('');
    try {
      await Linking.openURL('https://support.apple.com/es-co/guide/shortcuts/apd65c67538a/ios');
    } catch {
      setError('No pudimos abrir la guía de Apple. Inténtalo de nuevo.');
    }
  };
  return (
    <Screen entry scroll style={{ gap: spacing.lg }}>
      <ScreenHeader
        title="Atajos en iPhone"
        subtitle="Primero una prueba, después tus compras."
        back
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(app)/inbox'))}
      />
      <Card tone="info" style={{ padding: spacing.lg, gap: spacing.sm }}>
        <Text style={typography.cardTitle}>Un botón para traer una compra</Text>
        <Text style={typography.bodySecondary}>
          Un atajo es una pequeña secuencia de pasos que ejecuta tu iPhone. Abrirá los datos en esta app para
          que los revises.
        </Text>
        <Text style={typography.caption}>Abrir un enlace no guarda borradores ni registra gastos.</Text>
      </Card>
      {Platform.OS !== 'ios' && (
        <Text style={typography.bodySecondary}>
          Puedes explorar esta guía aquí. La prueba con Atajos y Apple Pay se hace en tu iPhone.
        </Text>
      )}
      <Disclosure title="1. Preparar el iPhone" defaultOpen>
        <View style={{ gap: spacing.sm }}>
          <Text style={typography.bodySecondary}>
            Abre Finance Personal e inicia sesión. Comprueba que puedes ver tus cuentas antes de crear el
            atajo.
          </Text>
          {expoGo && (
            <Text style={typography.bodySecondary}>
              En Expo Go, usa la misma cuenta Expo que en el computador y conéctate a la misma red. Esta
              conexión de prueba depende de que el computador esté encendido.
            </Text>
          )}
        </View>
      </Disclosure>
      <Disclosure title="2. Crear el atajo de prueba" defaultOpen>
        <View style={{ gap: spacing.md }}>
          <Text style={typography.bodySecondary}>
            1. En tu iPhone abre Atajos, pulsa + y nómbralo «Probar Finance Personal».
          </Text>
          <Text style={typography.bodySecondary}>
            2. Añade la acción «URL» o «Dirección URL». Pega el enlace de abajo.
          </Text>
          <Text style={typography.bodySecondary}>
            3. Añade «Abrir direcciones URL», usando el resultado del paso anterior. Pulsa ▶ para ejecutarlo.
          </Text>
          <Text style={typography.caption}>
            Abre esta guía en el iPhone. Mantén pulsado el enlace para copiarlo. Contiene solo una compra
            ficticia.
          </Text>
          <Card style={{ padding: spacing.md }}>
            <Text selectable style={typography.caption}>
              {sampleUrl}
            </Text>
          </Card>
          <Text style={typography.bodySecondary}>
            Debe aparecer «Prueba de Atajos» con Café de prueba por 12.500 COP. Esa pantalla no permite
            guardarlo.
          </Text>
          <Button variant="secondary" onPress={() => router.push({ pathname: '/shortcut', params: sample })}>
            Ver el ejemplo en la app
          </Button>
        </View>
      </Disclosure>
      <Disclosure title="3. Después: Apple Pay">
        <View style={{ gap: spacing.md }}>
          <Text style={typography.bodySecondary}>
            Cuando la prueba funcione, en Atajos → Automatización → + busca «Transacción» y elige la tarjeta
            que quieras usar.
          </Text>
          <Text style={typography.bodySecondary}>
            Apple ofrece el activador «Cuando use sin contacto». Tendremos que comprobar qué datos entrega tu
            tarjeta: importe, moneda, comercio y fecha. Si falta alguno, se completa al revisar.
          </Text>
          <Text style={typography.bodySecondary}>
            No recupera por sí solo tus compras anteriores. Una activación tampoco confirma que el banco haya
            cobrado: revisa siempre la operación.
          </Text>
          <Text style={typography.caption}>
            {expoGo
              ? 'De momento usa el ejemplo ficticio. Para una conexión estable prepararemos la app instalada con su enlace definitivo.'
              : 'No conectes pagos reales hasta comprobar los datos recibidos y la detección de coincidencias.'}
          </Text>
          <Button variant="ghost" onPress={() => void openApple()}>
            Ver la explicación de Apple
          </Button>
          {error ? (
            <Text accessibilityLiveRegion="polite" style={typography.bodySecondary}>
              {error}
            </Text>
          ) : null}
        </View>
      </Disclosure>
      <Disclosure title="Qué datos se comparten">
        <Text style={typography.bodySecondary}>
          Solo importe, moneda, comercio, fecha y un identificador de la operación cuando exista. El atajo no
          necesita tu contraseña bancaria, números completos de tarjeta, ubicación ni acceso general a tus
          mensajes. Los datos recibidos son sugerencias que tú revisas.
        </Text>
      </Disclosure>
    </Screen>
  );
}
