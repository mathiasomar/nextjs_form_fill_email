export function normalizeDateInput(value: string): string | null {
  const input = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  const local = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(input);
  let year: number, month: number, day: number;
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else if (local) {
    year = Number(local[3]);
    month = Number(local[2]);
    day = Number(local[1]);
  } else {
    return null;
  }
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
