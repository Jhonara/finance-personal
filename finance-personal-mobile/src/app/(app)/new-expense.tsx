import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';
import { ScreenHeader } from '@/ui/headers';
import { Button, DateField, Input, MoneyInput, Screen, SelectField } from '@/ui/primitives';

export default function NewExpenseScreen() {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  return (
    <Screen scroll keyboard>
      <ScreenHeader
        title="Nuevo gasto"
        subtitle="Vista previa sin guardar"
        back
        onBack={() => router.back()}
      />
      <View style={styles.form}>
        <MoneyInput label="Monto" value={amount} onChangeText={setAmount} />
        <SelectField label="Cuenta" placeholder="Selecciona una cuenta" />
        <SelectField label="Categoría" placeholder="Selecciona una categoría" />
        <DateField value="2026-08-30" />
        <Input label="Descripción" placeholder="Opcional" value={description} onChangeText={setDescription} />
        <Button onPress={() => router.back()}>Guardar gasto</Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ form: { gap: spacing.lg, paddingTop: spacing.md } });
