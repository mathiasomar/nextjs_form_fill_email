export interface Registration {
  reference: string;
  submittedAt: string;
  /** All flat text fields keyed by input name (birthSubLocation already resolved). */
  fields: Record<string, string>;
  spouses: { name: string; phone: string }[];
  nominees: { name: string; relationship: string; phone: string; idNumber: string; benefit: number }[];
  children: { name: string; dob: string; age: number; gender: string; status: string; documents: string[] }[];
  attachmentNames: string[];
}
