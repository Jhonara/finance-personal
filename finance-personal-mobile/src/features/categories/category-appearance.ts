import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { colors, lightPalette } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
export const categoryIcons = [
  { key: 'pricetag-outline', label: 'Etiqueta', group: 'general' },
  { key: 'restaurant-outline', label: 'Comida', group: 'food' },
  { key: 'basket-outline', label: 'Mercado', group: 'food' },
  { key: 'car-sport-outline', label: 'Transporte', group: 'transport' },
  { key: 'home-outline', label: 'Hogar', group: 'home' },
  { key: 'medkit-outline', label: 'Salud', group: 'health' },
  { key: 'school-outline', label: 'Estudio', group: 'education' },
  { key: 'balloon-outline', label: 'Ocio', group: 'leisure' },
  { key: 'briefcase-outline', label: 'Trabajo', group: 'work' },
  { key: 'storefront-outline', label: 'Ventas', group: 'work' },
  { key: 'trending-up-outline', label: 'Inversión', group: 'work' },
  { key: 'cash-outline', label: 'Dinero', group: 'work' },
  { key: 'gift-outline', label: 'Regalos', group: 'family' },
  { key: 'paw-outline', label: 'Mascotas', group: 'family' },
  { key: 'airplane-outline', label: 'Viajes', group: 'leisure' },
  { key: 'game-controller-outline', label: 'Juegos', group: 'leisure' },
  { key: 'folder-outline', label: 'Carpeta', group: 'general' },
  { key: 'calendar-outline', label: 'Calendario', group: 'general' },
  { key: 'time-outline', label: 'Tiempo', group: 'general' },
  { key: 'document-text-outline', label: 'Documentos', group: 'general' },
  { key: 'shield-checkmark-outline', label: 'Protección', group: 'general' },
  { key: 'star-outline', label: 'Favorito', group: 'general' },
  { key: 'cafe-outline', label: 'Café y desayunos', group: 'food' },
  { key: 'fast-food-outline', label: 'Comida rápida', group: 'food' },
  { key: 'pizza-outline', label: 'Pizza', group: 'food' },
  { key: 'ice-cream-outline', label: 'Helados', group: 'food' },
  { key: 'nutrition-outline', label: 'Frutas', group: 'food' },
  { key: 'fish-outline', label: 'Pescado', group: 'food' },
  { key: 'wine-outline', label: 'Restaurantes y bebidas', group: 'food' },
  { key: 'bed-outline', label: 'Habitación', group: 'home' },
  { key: 'bulb-outline', label: 'Energía', group: 'home' },
  { key: 'water-outline', label: 'Agua', group: 'home' },
  { key: 'flame-outline', label: 'Gas', group: 'home' },
  { key: 'wifi-outline', label: 'Internet', group: 'home' },
  { key: 'phone-portrait-outline', label: 'Telefonía', group: 'home' },
  { key: 'tv-outline', label: 'Televisión', group: 'home' },
  { key: 'construct-outline', label: 'Reparaciones', group: 'home' },
  { key: 'shirt-outline', label: 'Ropa', group: 'home' },
  { key: 'flower-outline', label: 'Jardín', group: 'home' },
  { key: 'bus-outline', label: 'Bus', group: 'transport' },
  { key: 'train-outline', label: 'Tren y metro', group: 'transport' },
  { key: 'bicycle-outline', label: 'Bicicleta', group: 'transport' },
  { key: 'walk-outline', label: 'Caminatas', group: 'transport' },
  { key: 'boat-outline', label: 'Barco', group: 'transport' },
  { key: 'speedometer-outline', label: 'Vehículo y mantenimiento', group: 'transport' },
  { key: 'map-outline', label: 'Rutas', group: 'transport' },
  { key: 'fitness-outline', label: 'Bienestar', group: 'health' },
  { key: 'barbell-outline', label: 'Gimnasio', group: 'health' },
  { key: 'pulse-outline', label: 'Chequeos', group: 'health' },
  { key: 'bandage-outline', label: 'Cuidados', group: 'health' },
  { key: 'medical-outline', label: 'Medicamentos', group: 'health' },
  { key: 'glasses-outline', label: 'Óptica', group: 'health' },
  { key: 'book-outline', label: 'Libros', group: 'education' },
  { key: 'library-outline', label: 'Universidad', group: 'education' },
  { key: 'laptop-outline', label: 'Tecnología', group: 'education' },
  { key: 'pencil-outline', label: 'Papelería', group: 'education' },
  { key: 'business-outline', label: 'Empresa', group: 'work' },
  { key: 'wallet-outline', label: 'Billetera', group: 'work' },
  { key: 'card-outline', label: 'Tarjeta', group: 'work' },
  { key: 'calculator-outline', label: 'Contabilidad', group: 'work' },
  { key: 'receipt-outline', label: 'Facturas', group: 'work' },
  { key: 'swap-horizontal-outline', label: 'Intercambio', group: 'work' },
  { key: 'stats-chart-outline', label: 'Resultados', group: 'work' },
  { key: 'musical-notes-outline', label: 'Música', group: 'leisure' },
  { key: 'film-outline', label: 'Cine', group: 'leisure' },
  { key: 'football-outline', label: 'Deportes', group: 'leisure' },
  { key: 'camera-outline', label: 'Fotografía', group: 'leisure' },
  { key: 'headset-outline', label: 'Entretenimiento', group: 'leisure' },
  { key: 'ticket-outline', label: 'Eventos', group: 'leisure' },
  { key: 'people-outline', label: 'Familia', group: 'family' },
  { key: 'heart-outline', label: 'Personas queridas', group: 'family' },
  { key: 'happy-outline', label: 'Niños', group: 'family' },
  { key: 'accessibility-outline', label: 'Accesibilidad', group: 'family' },
] as const satisfies ReadonlyArray<{ key: IconName; label: string; group: string }>;

export const categoryIconGroups = [
  { key: 'all', label: 'Todos' },
  { key: 'general', label: 'General' },
  { key: 'food', label: 'Alimentación' },
  { key: 'home', label: 'Hogar' },
  { key: 'transport', label: 'Transporte' },
  { key: 'health', label: 'Salud' },
  { key: 'education', label: 'Educación' },
  { key: 'work', label: 'Trabajo y dinero' },
  { key: 'leisure', label: 'Ocio y viajes' },
  { key: 'family', label: 'Familia y mascotas' },
] as const;
const normalizedSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .trim();
export function filterCategoryIcons(query: string, group = 'all') {
  const terms = normalizedSearch(query).split(/\s+/).filter(Boolean);
  return categoryIcons.filter(
    (icon) =>
      (group === 'all' || icon.group === group) &&
      terms.every((term) =>
        normalizedSearch(
          `${icon.label} ${categoryIconGroups.find((item) => item.key === icon.group)?.label ?? ''}`,
        ).includes(term),
      ),
  );
}

export const categoryColors = [
  { key: 'mint', label: 'Menta', soft: '#DDF7EA', ink: '#167657' },
  { key: 'amber', label: 'Ámbar', soft: '#FFF0DB', ink: '#946016' },
  { key: 'blue', label: 'Azul', soft: '#DDF4FF', ink: '#196386' },
  { key: 'violet', label: 'Violeta', soft: '#E9E4FF', ink: '#66509E' },
  { key: 'coral', label: 'Coral', soft: '#FFE5E8', ink: '#A74455' },
  { key: 'pink', label: 'Rosa', soft: '#FFE9F4', ink: '#9B4870' },
] as const;

export type CategoryColorKey = (typeof categoryColors)[number]['key'];

const darkCategoryColors: Record<CategoryColorKey, { soft: string; ink: string }> = {
  mint: { soft: '#193F35', ink: '#80DFC0' },
  amber: { soft: '#413622', ink: '#F2CA83' },
  blue: { soft: '#1B394A', ink: '#8FCFEF' },
  violet: { soft: '#342E4D', ink: '#C3B4F6' },
  coral: { soft: '#472E34', ink: '#F3A6B0' },
  pink: { soft: '#442D40', ink: '#EEAED3' },
};

/** Category identity stays constant; only its readable colors follow the app theme. */
export function categoryColorAppearance(key: CategoryColorKey) {
  const color = categoryColors.find((item) => item.key === key) ?? categoryColors[0];
  return {
    colorKey: color.key,
    ...(colors.background === lightPalette.background
      ? { soft: color.soft, ink: color.ink }
      : darkCategoryColors[color.key]),
  };
}

export function savedCategoryAppearance(category: {
  name?: string;
  type?: string;
  iconKey?: string;
  colorKey?: string;
}) {
  const fallback = categoryAppearance(category.name, category.type);
  const icon = categoryIcons.find((item) => item.key === category.iconKey)?.key ?? fallback.icon;
  const color = categoryColors.find((item) => item.key === category.colorKey)?.key ?? fallback.colorKey;
  return { icon, ...categoryColorAppearance(color) };
}

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
    return { icon: 'restaurant-outline' as const, ...categoryColorAppearance('amber') };
  if (/transport|auto|gasolina|taxi|moto/.test(text))
    return { icon: 'car-sport-outline' as const, ...categoryColorAppearance('blue') };
  if (/vivienda|hogar|casa|arriendo|alquiler|servicio/.test(text))
    return { icon: 'home-outline' as const, ...categoryColorAppearance('violet') };
  if (/salud|medic|farmac/.test(text))
    return { icon: 'medkit-outline' as const, ...categoryColorAppearance('coral') };
  if (/ocio|salida|viaje|diversion/.test(text))
    return { icon: 'balloon-outline' as const, ...categoryColorAppearance('pink') };
  if (/educ|estudio|curso|libro/.test(text))
    return { icon: 'school-outline' as const, ...categoryColorAppearance('blue') };
  if (/nomina|sueldo|salario|trabajo/.test(text))
    return { icon: 'briefcase-outline' as const, ...categoryColorAppearance('mint') };
  if (/venta/.test(text)) return { icon: 'storefront-outline' as const, ...categoryColorAppearance('amber') };
  if (/rendimiento|inversion|interes/.test(text))
    return { icon: 'trending-up-outline' as const, ...categoryColorAppearance('mint') };
  return type === 'INCOME'
    ? { icon: 'cash-outline' as const, ...categoryColorAppearance('mint') }
    : { icon: 'pricetag-outline' as const, ...categoryColorAppearance('coral') };
}
