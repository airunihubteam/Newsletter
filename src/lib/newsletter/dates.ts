export const HE_MONTHS = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];

export const HE_MONTHS_SHORT = [
  "ינו׳",
  "פבר׳",
  "מרץ",
  "אפר׳",
  "מאי",
  "יוני",
  "יולי",
  "אוג׳",
  "ספט׳",
  "אוק׳",
  "נוב׳",
  "דצמ׳",
];

export const HE_DAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

export function heDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return `${d.getDate()} ב${HE_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function dotDate(iso: string): string {
  return iso.split("-").reverse().join(".");
}
