import crypto from "node:crypto";
import { z } from "zod";
import { ageFromDob } from "./age";
import { CHILD_ADULT_AGE, MAX_FILE_BYTES, MAX_TOTAL_BYTES } from "./constants";
import { NOT_LISTED } from "./locations";
import { buildIdPdf } from "./pdf";
import type { Registration } from "./types";

export interface MailAttachment {
  filename: string; content: Buffer; contentType: string; cid?: string; contentDisposition?: "inline" | "attachment";
}
export type ParseResult = { ok: true; data: Registration; attachments: MailAttachment[] } | { ok: false; errors: string[] };

const PHONE = /^\+?[0-9\s-]{9,16}$/;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif", "application/pdf": "pdf" };

const text = (label: string, max = 200) => z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);
const phone = (label: string) => z.string().trim().regex(PHONE, `${label} is not a valid phone number`);
const isoDate = (label: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${label} is required`);
const oneOf = (label: string, list: string[]) => z.string().refine((v) => list.includes(v), `${label} is required`);

const TEXT_FIELDS: Record<string, string> = {
  memberName: "Full name", idno: "National ID number", birthCounty: "County of birth", birthSubCounty: "Sub-County of birth",
  birthDistrict: "District of birth", birthDivision: "Division of birth", birthLocation: "Location of birth", birthVillage: "Village of birth",
  countyChairmanName: "County Chairman name", countyChairmanCode: "County Chairman code", countyChairmanId: "County Chairman ID number",
  subCountyRepName: "Sub-County Representative name", subCountyRepCode: "Sub-County Representative code", subCountyRepId: "Sub-County Representative ID number",
  declarant: "Declarant name",
};
const PHONE_FIELDS: Record<string, string> = {
  countyChairmanPhone: "County Chairman phone", subCountyRepPhone: "Sub-County Representative phone", whatsapp: "WhatsApp number", safaricom: "Safaricom payment number",
};
const shape: Record<string, z.ZodTypeAny> = {};
for (const [k, l] of Object.entries(TEXT_FIELDS)) shape[k] = text(l);
for (const [k, l] of Object.entries(PHONE_FIELDS)) shape[k] = phone(l);
Object.assign(shape, {
  memberType: oneOf("Membership type", ["new", "origin"]),
  memberCode: z.string().trim().max(50),
  applicationDate: isoDate("Application date"),
  dob: isoDate("Date of birth"),
  signatureDate: isoDate("Declaration date"),
  sex: oneOf("Sex", ["Male", "Female"]),
  marital: oneOf("Marital status", ["Single", "Married", "Widowed", "Other"]),
  email: z.string().trim().max(200).refine((v) => v === "" || z.string().email().safeParse(v).success, "Email address is not valid"),
  alternativeNumber: z.string().trim().refine((v) => v === "" || PHONE.test(v), "Alternative number is not valid"),
  birthSubLocation: text("Sub-Location of birth"),
  birthSubLocationOther: z.string().trim().max(200),
  father: z.string().trim().max(200), fatherId: z.string().trim().max(50), fatherPhone: z.string().trim().max(30),
  mother: z.string().trim().max(200), motherId: z.string().trim().max(50), motherPhone: z.string().trim().max(30),
  guardian: z.string().trim().max(200), guardianId: z.string().trim().max(50), guardianPhone: z.string().trim().max(30),
  fatherDeceased: z.string().max(10), motherDeceased: z.string().max(10), totalOrphan: z.string().max(10),
  agree: oneOf("Declaration confirmation", ["on"]),
  photoDeclaration: oneOf("Selfie confirmation", ["on"]),
  signature: z.string().max(2_000_000).startsWith("data:image/png;base64,", "Signature is required"),
});
const schema = z.object(shape);

/** Groups keys like `children[3][name]` into [{name: ...}, ...] ordered by index. */
function group(fd: FormData, key: string) {
  const re = new RegExp(`^${key}\\[(\\d+)\\]\\[(\\w+)\\]$`);
  const map = new Map<number, Record<string, FormDataEntryValue>>();
  for (const [k, v] of fd.entries()) {
    const m = re.exec(k);
    if (!m) continue;
    const i = Number(m[1]);
    map.set(i, { ...(map.get(i) ?? {}), [m[2]]: v });
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([, o]) => o);
}
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const asFile = (v: unknown): File | null => (v instanceof File && v.size > 0 ? v : null);

export async function parseRegistration(fd: FormData): Promise<ParseResult> {
  const errors: string[] = [];
  const raw: Record<string, string> = {};
  for (const key of Object.keys(schema.shape)) { const v = fd.get(key); raw[key] = typeof v === "string" ? v : ""; }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: [...new Set(parsed.error.issues.map((i) => i.message))] };
  const f = { ...(parsed.data as Record<string, string>) };

  // conditional rules
  if (f.memberType === "origin" && !f.memberCode) errors.push("Existing member code is required");
  if (f.birthSubLocation === NOT_LISTED) {
    if (!f.birthSubLocationOther) errors.push("Sub-Location of birth is required");
    f.birthSubLocation = f.birthSubLocationOther;
  }
  const total = f.totalOrphan === "on";
  const fatherDead = total || f.fatherDeceased === "on";
  const motherDead = total || f.motherDeceased === "on";
  const need = (cond: boolean, keys: [string, string][]) => { if (cond) keys.forEach(([k, l]) => { if (!f[k]) errors.push(`${l} is required`); }); };
  need(!fatherDead, [["father", "Father's name"], ["fatherId", "Father's ID number"], ["fatherPhone", "Father's phone"]]);
  need(!motherDead, [["mother", "Mother's name"], ["motherId", "Mother's ID number"], ["motherPhone", "Mother's phone"]]);
  need(total, [["guardian", "Guardian name"], ["guardianId", "Guardian ID number"], ["guardianPhone", "Guardian phone"]]);
  for (const [p, dead] of [["father", fatherDead], ["mother", motherDead]] as const) {
    if (dead) { f[p] = "Deceased"; f[p + "Id"] = ""; f[p + "Phone"] = ""; }
  }
  f.parentStatus = total ? "Total orphan" : fatherDead || motherDead ? "Partial orphan" : "Both parents living";

  const spouses = f.marital === "Married"
    ? group(fd, "spouses").map((s) => ({ name: str(s.name), phone: str(s.phone) })).filter((s) => s.name || s.phone)
    : [];

  const nominees = group(fd, "nominees").map((n) => ({
    name: str(n.name), relationship: str(n.relationship), phone: str(n.phone), idNumber: str(n.idNumber), benefit: Number(str(n.benefit)),
  }));
  if (!nominees.length) errors.push("At least one nominated member is required");
  nominees.forEach((n, i) => {
    if (!n.name || !n.relationship || !n.phone) errors.push(`Nominated member ${i + 1}: name, relationship and phone are required`);
    if (!Number.isInteger(n.benefit) || n.benefit < 1 || n.benefit > 100) errors.push(`Nominated member ${i + 1}: benefit must be 1–100%`);
  });
  if (nominees.reduce((s, n) => s + (n.benefit || 0), 0) > 100) errors.push("Nominated-member benefit percentages must total no more than 100%");

  // files
  const ref = `LTA-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const attachments: MailAttachment[] = [];
  let totalBytes = 0;
  async function addFile(file: File | null, label: string, human: string, required: boolean): Promise<MailAttachment | null> {
    if (!file) { if (required) errors.push(`${human} is required`); return null; }
    if (!(file.type.startsWith("image/") || file.type === "application/pdf")) { errors.push(`${human}: only images or PDF files are accepted`); return null; }
    if (file.size > MAX_FILE_BYTES) { errors.push(`${human} is too large`); return null; }
    totalBytes += file.size;
    const ext = EXT[file.type] ?? (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const att: MailAttachment = { filename: `${ref}_${label}.${ext}`, content: Buffer.from(await file.arrayBuffer()), contentType: file.type };
    attachments.push(att);
    return att;
  }

  const idFront = await addFile(asFile(fd.get("idFront")), "National-ID-front", "National ID front", true);
  const idBack = await addFile(asFile(fd.get("idBack")), "National-ID-back", "National ID back", true);
  await addFile(asFile(fd.get("faceSelfie")), "Passport-selfie", "Selfie", true);
  await addFile(asFile(fd.get("drivingLicenceFront")), "Driving-licence-front", "Driving licence front", true);
  await addFile(asFile(fd.get("drivingLicenceBack")), "Driving-licence-back", "Driving licence back", true);
  if (idFront && idBack) {
    const pdf = await buildIdPdf([{ bytes: idFront.content, type: idFront.contentType }, { bytes: idBack.content, type: idBack.contentType }]);
    if (pdf) attachments.unshift({ filename: `${ref}_National-ID-combined.pdf`, content: pdf, contentType: "application/pdf" });
  }

  const children: Registration["children"] = [];
  const kids = group(fd, "children");
  for (let i = 0; i < kids.length; i++) {
    const c = kids[i], tag = `Child ${i + 1}`;
    const dob = str(c.dob), age = ageFromDob(dob);
    const gender = str(c.gender), status = str(c.status), name = str(c.name);
    if (!name || age === null || !["Male", "Female"].includes(gender) || !["Biological", "Adopted"].includes(status)) {
      errors.push(`${tag}: name, valid date of birth, gender and status are required`); continue;
    }
    const docs: string[] = [];
    const over = age > CHILD_ADULT_AGE;
    const doc = over
      ? await addFile(asFile(c.schoolDoc), `Child-${i + 1}-school-proof`, `${tag} school proof`, true)
      : await addFile(asFile(c.birthDoc), `Child-${i + 1}-birth-document`, `${tag} birth certificate/notification`, true);
    if (doc) docs.push(doc.filename);
    if (status === "Adopted") {
      const a = await addFile(asFile(c.adoptionDoc), `Child-${i + 1}-adoption-letter`, `${tag} adoption letter`, true);
      if (a) docs.push(a.filename);
    }
    children.push({ name, dob, age, gender, status, documents: docs });
  }
  if (totalBytes > MAX_TOTAL_BYTES) errors.push("The combined size of all documents is too large");
  if (errors.length) return { ok: false, errors };

  attachments.push({
    filename: `${ref}_signature.png`, contentType: "image/png", cid: "signature", contentDisposition: "inline",
    content: Buffer.from(f.signature.split(",")[1], "base64"),
  });
  delete f.signature;

  return {
    ok: true,
    attachments,
    data: {
      reference: ref,
      submittedAt: new Intl.DateTimeFormat("en-KE", { dateStyle: "full", timeStyle: "short", timeZone: "Africa/Nairobi" }).format(new Date()),
      fields: f, spouses, nominees, children,
      attachmentNames: attachments.map((a) => a.filename),
    },
  };
}
