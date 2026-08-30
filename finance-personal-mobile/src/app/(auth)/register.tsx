import { Link } from 'expo-router';
import { Text, View } from 'react-native';

export default function RegisterScreen() {
  return (
    <View>
      <Text>Registro técnico pendiente de formulario.</Text>
      <Link href="/(auth)/login">Volver</Link>
    </View>
  );
}
