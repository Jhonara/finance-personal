import { withFormSession, useFormSessionActive } from '@/features/forms/form-session';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useCreateCategory } from '@/features/categories/use-categories';
import { useFeedback } from '@/feedback/feedback-provider';
import { Button, Input, Screen } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
function CategoryForm() {
  const activeSession = useFormSessionActive();
  const { type = 'EXPENSE' } = useLocalSearchParams<{ type?: 'EXPENSE' | 'INCOME' }>();
  const [name, setName] = useState('');
  const m = useCreateCategory();
  const f = useFeedback();
  return (
    <Screen scroll keyboard>
      <ScreenHeader title="Nueva categoría" back onBack={() => router.back()} />
      <Input label="Nombre" value={name} onChangeText={setName} />
      <Button
        loading={m.isPending}
        disabled={m.isPending}
        onPress={() => {
          if (name.trim())
            m.mutate(
              { name: name.trim(), type },
              {
                onSuccess: () => {
                  if (!activeSession()) return;
                  setName('');
                  m.reset();
                  f.show('Categoría creada.');
                  router.back();
                },
              },
            );
        }}
      >
        Crear categoría
      </Button>
    </Screen>
  );
}

export default withFormSession(CategoryForm);
