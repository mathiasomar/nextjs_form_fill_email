export const subCounties: Record<string, string[]> = {
  Siaya: ["Alego Usonga", "Gem", "Ugenya", "Ugunja", "Bondo", "Rarieda"],
  Kisumu: ["Kisumu Central", "Kisumu East", "Kisumu West", "Seme", "Nyando", "Muhoroni", "Nyakach"],
  Migori: ["Rongo", "Awendo", "Suna East", "Suna West", "Uriri", "Nyatike", "Kuria East", "Kuria West"],
  "Homa Bay": ["Homa Bay Town", "Ndhiwa", "Mbita", "Suba South", "Suba North", "Rangwe", "Kasipul", "Kabondo Kasipul"],
};
export const counties = Object.keys(subCounties);

// PROVISIONAL: verified district / division / sub-location lists were not in the original file.
export const districtsOf = (subCounty: string) => (subCounty ? [subCounty] : []);
export const DIVISIONS = ["Main Division", "Other / not listed"];
/** Fill this in per division when you have verified data, e.g. { "Main Division": ["..."] } */
export const subLocationMap: Record<string, string[]> = {};
export const NOT_LISTED = "Not listed — enter manually";
