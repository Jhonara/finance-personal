export const localDateFromNative = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const nativeFromLocalDate = (value: string) => {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
};
