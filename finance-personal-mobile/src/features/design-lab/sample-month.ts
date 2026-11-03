// A single synthetic fixture powers every direction. No API or persistence.
export const categoryNames = ['Vivienda', 'Alimentación', 'Transporte', 'Ocio'] as const;
export const sampleExpenses = [
  { day: 1, category: 0, amount: 1_200_000 },
  { day: 3, category: 1, amount: 180_000 },
  { day: 5, category: 2, amount: 150_000 },
  { day: 8, category: 1, amount: 200_000 },
  { day: 10, category: 3, amount: 120_000 },
  { day: 13, category: 2, amount: 100_000 },
  { day: 15, category: 1, amount: 160_000 },
  { day: 20, category: 2, amount: 120_000 },
  { day: 24, category: 1, amount: 240_000 },
  { day: 27, category: 3, amount: 180_000 },
  { day: 29, category: 2, amount: 80_000 },
];
export const sampleIncome = [
  { day: 2, amount: 2_100_000 },
  { day: 16, amount: 2_100_000 },
];
export const categories = categoryNames.map((name, index) => ({
  name,
  amount: sampleExpenses
    .filter((item) => item.category === index)
    .reduce((sum, item) => sum + item.amount, 0),
}));
export const expense = categories.reduce((sum, item) => sum + item.amount, 0);
export const income = sampleIncome.reduce((sum, item) => sum + item.amount, 0);
export const weeks = [
  [1, 7],
  [8, 14],
  [15, 21],
  [22, 31],
].map(([from, to]) => ({
  label: `${from}–${to}`,
  amount: sampleExpenses
    .filter((item) => item.day >= from! && item.day <= to!)
    .reduce((sum, item) => sum + item.amount, 0),
}));
export const daily = Array.from({ length: 31 }, (_, index) => {
  const day = index + 1;
  const expenses = sampleExpenses.filter((item) => item.day === day);
  return {
    day,
    hasRecords: expenses.length > 0,
    amount: expenses.reduce((sum, item) => sum + item.amount, 0),
    net:
      sampleIncome.filter((item) => item.day <= day).reduce((sum, item) => sum + item.amount, 0) -
      sampleExpenses.filter((item) => item.day <= day).reduce((sum, item) => sum + item.amount, 0),
  };
});
export const formatSampleMoney = (value: number) => `$ ${value.toLocaleString('es-CO')}`;
export const comparisonMonths = [
  { label: 'Ago', state: 'unavailable', income: null, expense: null },
  { label: 'Sep', state: 'empty', income: 0, expense: 0 },
  { label: 'Oct', state: 'records', income, expense },
] as const;
