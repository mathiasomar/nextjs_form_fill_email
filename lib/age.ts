import { normalizeDateInput } from "./date";

/** Age in whole years today from a DD/MM/YYYY or YYYY-MM-DD string, or null if invalid. */
export function ageFromDob(dob: string): number | null {
  const normalized = normalizeDateInput(dob);
  if (!normalized) return null;
  const [year, month, day] = normalized.split("-").map(Number);
  const now = new Date();
  let age = now.getFullYear() - year;
  if (now.getMonth() < month - 1 || (now.getMonth() === month - 1 && now.getDate() < day)) age--;
  return age;
}
