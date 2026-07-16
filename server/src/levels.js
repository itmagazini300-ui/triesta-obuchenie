// Нивата на служителя според общия прогрес (%), спрямо инфографиката.
export const LEVELS = [
  { key: 'nachinaesht', name: 'Начинаещ',  min: 0,   max: 40,  color: '#EA5514' },
  { key: 'uveren',      name: 'Уверен',     min: 40,  max: 70,  color: '#EA5514' },
  { key: 'naprednal',   name: 'Напреднал',  min: 70,  max: 100, color: '#EA5514' },
  { key: 'mentor',      name: 'Ментор',     min: 100, max: 101, color: '#EA5514' },
];

export function levelFor(percent) {
  if (percent >= 100) return LEVELS[3];
  if (percent >= 70) return LEVELS[2];
  if (percent >= 40) return LEVELS[1];
  return LEVELS[0];
}
