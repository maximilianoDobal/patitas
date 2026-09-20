export function startOfWeek(isoDate) {
  const d = new Date(`${isoDate}T12:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekRangeFromAnchor(anchorIso) {
  const start = startOfWeek(anchorIso);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
