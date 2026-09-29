// Телефонът е потребителското име на служителите. Един номер – един запис,
// независимо дали е написан с интервали, +359 или 00359.
export function normalizePhone(s) {
  if (s == null) return null;
  let d = String(s).replace(/\D/g, '');
  if (d.startsWith('00359')) d = '0' + d.slice(5);
  else if (d.startsWith('359')) d = '0' + d.slice(3);
  return /^0\d{9}$/.test(d) ? d : null;
}
