export function nativeShortcutAvailability(platform: string, available: boolean): string {
  if (platform === 'android') {
    return 'En Android, mantén pulsado el icono de Finance Personal para registrar un movimiento desde sus accesos rápidos. Las tarjetas vinculadas ayudan a revisar las compras detectadas.';
  }
  if (platform === 'ios') {
    return available
      ? 'Las acciones de Atajos están disponibles en esta versión instalada de Finance Personal.'
      : 'Las acciones de Atajos de iPhone requieren la versión nativa de Finance Personal. Expo Go no las incluye.';
  }
  return 'Las tarjetas vinculadas ayudan a identificar la cuenta de las compras detectadas. Los accesos rápidos se usan desde la app instalada en tu teléfono.';
}
