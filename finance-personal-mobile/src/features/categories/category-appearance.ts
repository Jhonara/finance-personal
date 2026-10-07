export const categorySuggestions = {
  EXPENSE: ['Alimentación', 'Transporte', 'Vivienda', 'Salud', 'Ocio', 'Educación'],
  INCOME: ['Nómina', 'Trabajo independiente', 'Ventas', 'Rendimientos'],
} as const;

/** Visual hints only: no category, classification or financial record is created. */
export function categoryAppearance(name = '', type = 'EXPENSE') {
  const text = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (/comida|aliment|restaur|supermerc|mercado/.test(text))
    return { icon: 'restaurant-outline' as const, soft: '#FFF0DB', ink: '#946016' };
  if (/transport|auto|gasolina|taxi|moto/.test(text))
    return { icon: 'car-sport-outline' as const, soft: '#DDF4FF', ink: '#196386' };
  if (/vivienda|hogar|casa|arriendo|alquiler|servicio/.test(text))
    return { icon: 'home-outline' as const, soft: '#E9E4FF', ink: '#66509E' };
  if (/salud|medic|farmac/.test(text))
    return { icon: 'medkit-outline' as const, soft: '#FFE5E8', ink: '#A74455' };
  if (/ocio|salida|viaje|diversion/.test(text))
    return { icon: 'balloon-outline' as const, soft: '#FFE9F4', ink: '#9B4870' };
  if (/educ|estudio|curso|libro/.test(text))
    return { icon: 'school-outline' as const, soft: '#E2F0FF', ink: '#365F96' };
  if (/nomina|sueldo|salario|trabajo/.test(text))
    return { icon: 'briefcase-outline' as const, soft: '#DDF7EA', ink: '#167657' };
  if (/venta/.test(text)) return { icon: 'storefront-outline' as const, soft: '#FFF0DB', ink: '#946016' };
  if (/rendimiento|inversion|interes/.test(text))
    return { icon: 'trending-up-outline' as const, soft: '#DDF7EA', ink: '#167657' };
  return type === 'INCOME'
    ? { icon: 'cash-outline' as const, soft: '#DDF7EA', ink: '#167657' }
    : { icon: 'pricetag-outline' as const, soft: '#FFE9E6', ink: '#AD4852' };
}
