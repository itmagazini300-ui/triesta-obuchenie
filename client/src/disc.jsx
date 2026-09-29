// Имена и цветове на DISC стиловете (същите като в server/src/disc.js).
export const DISC = {
  D: { name: 'Доминантен', color: '#E1352B' },
  I: { name: 'Влиятелен', color: '#F0A020' },
  S: { name: 'Постоянен', color: '#3F9A54' },
  C: { name: 'Последователен', color: '#2F73C4' },
};
export const DISC_KEYS = ['D', 'I', 'S', 'C'];

export function DiscBadge({ style }) {
  const s = DISC[style];
  if (!s) return <span className="pill n">—</span>;
  return <span className="pill" style={{ background: s.color, color: '#fff' }}>{style} · {s.name}</span>;
}
