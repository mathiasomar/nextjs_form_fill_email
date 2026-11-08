"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { FileField, SelectField, TextField, Field } from "./fields";
import { SignaturePad } from "./SignaturePad";
import { counties, subCounties, districtsOf, DIVISIONS, subLocationMap, NOT_LISTED } from "@/lib/locations";
import { ageFromDob, compressImage, todayLocal } from "@/lib/client-utils";
import { CHILD_ADULT_AGE, MAX_FILE_MB } from "@/lib/constants";

const RELATIONSHIPS = ["Spouse", "Parent", "Child", "Brother", "Sister", "Guardian", "Other relative", "Other"];
const PHONE = "+254 7XX XXX XXX";

type Status = { kind: "idle" | "loading" | "error"; message: string };

export function RegistrationForm({ onSuccess }: { onSuccess: (reference: string) => void }) {
  const [memberType, setMemberType] = useState("");
  const [marital, setMarital] = useState("");
  const [county, setCounty] = useState("");
  const [subCounty, setSubCounty] = useState("");
  const [district, setDistrict] = useState("");
  const [division, setDivision] = useState("");
  const [subLoc, setSubLoc] = useState("");
  const [fatherDead, setFatherDead] = useState(false);
  const [motherDead, setMotherDead] = useState(false);
  const [totalOrphan, setTotalOrphan] = useState(false);
  const [spouseIds, setSpouseIds] = useState([0]);
  const [nomineeIds, setNomineeIds] = useState([0]);
  const [childIds, setChildIds] = useState<number[]>([]);
  const [nomineeTotal, setNomineeTotal] = useState(0);
  const [signature, setSignature] = useState("");
  const [appDate, setAppDate] = useState("");
  const [sigDate, setSigDate] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "" });
  const nextId = useRef(1);
  const nomineesRef = useRef<HTMLDivElement>(null);

  useEffect(() => { const t = todayLocal(); setAppDate(t); setSigDate(t); }, []);

  const recalcNominees = () => {
    const inputs = nomineesRef.current?.querySelectorAll<HTMLInputElement>('input[name$="[benefit]"]');
    setNomineeTotal([...(inputs ?? [])].reduce((s, el) => s + (Number(el.value) || 0), 0));
  };
  useEffect(recalcNominees, [nomineeIds]);

  const fail = (message: string) => setStatus({ kind: "error", message });
  const add = (setter: React.Dispatch<React.SetStateAction<number[]>>) => setter((l) => [...l, nextId.current++]);
  const remove = (setter: React.Dispatch<React.SetStateAction<number[]>>, id: number) => setter((l) => l.filter((x) => x !== id));

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.reportValidity()) return;
    if (nomineeTotal > 100) return fail("Suggested nominated-member benefit percentages must total no more than 100%.");
    if (!signature) return fail("Please sign in the signature box to confirm your submission.");

    setStatus({ kind: "loading", message: "Preparing your documents…" });
    try {
      const fd = new FormData();
      for (const [key, value] of new FormData(form).entries()) {
        if (value instanceof File) {
          if (value.size === 0) continue; // nothing chosen
          const f = await compressImage(value);
          if (f.size > MAX_FILE_MB * 1024 * 1024)
            throw new Error(`"${value.name}" is larger than ${MAX_FILE_MB} MB. Take a smaller photo or compress the file.`);
          fd.append(key, f, f.name);
        } else fd.append(key, value);
      }
      fd.append("signature", signature);

      setStatus({ kind: "loading", message: "Submitting your registration…" });
      const res = await fetch("/api/register", { method: "POST", body: fd });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) throw new Error(result.message || `Submission failed (${res.status})`);
      onSuccess(result.reference);
    } catch (err) {
      fail("We could not confirm submission. " + (err instanceof Error ? err.message : "Check your connection or contact the Registrar."));
    }
  }

  const subLocOptions = [...(subLocationMap[division] ?? []), NOT_LISTED];
  const loading = status.kind === "loading";

  return (
    <form onSubmit={onSubmit}>
      <div className="hp" aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" /></div>

      <section className="section">
        <h2>1. Membership category</h2>
        <div className="grid">
          <SelectField id="memberType" label="Membership type" required placeholder="Select type" value={memberType}
            onChange={(e) => setMemberType(e.target.value)}
            options={[{ value: "new", label: "New member" }, { value: "origin", label: "Origin/existing member" }]} />
          {memberType === "origin" && (
            <TextField id="memberCode" label="Existing member code" required placeholder="Enter assigned code" />
          )}
          <TextField id="applicationDate" label="Application date" type="date" required value={appDate} onChange={(e) => setAppDate(e.target.value)} />
          <TextField id="memberName" label="Full name as on National ID" required autoComplete="name" />
          <TextField id="dob" label="Date of birth" type="date" required />
          <TextField id="idno" label="National ID number" required autoComplete="off" />
          <SelectField id="birthCounty" label="County of birth" required placeholder="Select county of birth" options={counties}
            value={county} onChange={(e) => { setCounty(e.target.value); setSubCounty(""); setDistrict(""); setDivision(""); setSubLoc(""); }} />
          <SelectField id="birthSubCounty" label="Sub-County of birth" required disabled={!county}
            placeholder={county ? "Select sub-county of birth" : "Select county first"} options={subCounties[county] ?? []}
            value={subCounty} onChange={(e) => { setSubCounty(e.target.value); setDistrict(""); setDivision(""); setSubLoc(""); }} />
          <SelectField id="birthDistrict" label="District of birth" required disabled={!subCounty}
            placeholder={subCounty ? "Select district of birth" : "Select sub-county first"} options={districtsOf(subCounty)}
            value={district} onChange={(e) => { setDistrict(e.target.value); setDivision(""); setSubLoc(""); }} />
          <SelectField id="birthDivision" label="Division of birth" required disabled={!district}
            placeholder={district ? "Select division of birth" : "Select district first"} options={district ? DIVISIONS : []}
            value={division} onChange={(e) => { setDivision(e.target.value); setSubLoc(""); }} />
          <TextField id="birthLocation" label="Location of birth" required placeholder="Type location of birth" />
          <SelectField id="birthSubLocation" label="Sub-Location of birth" required disabled={!division}
            placeholder={division ? "Select Sub-Location of birth" : "Select division first"} options={division ? subLocOptions : []}
            hint="Choose a listed Sub-Location. If it is not listed, select “Not listed” and enter it below."
            value={subLoc} onChange={(e) => setSubLoc(e.target.value)} />
          {subLoc === NOT_LISTED && (
            <TextField id="birthSubLocationOther" label="Enter Sub-Location of birth" required placeholder="Type Sub-Location of birth" />
          )}
          <TextField id="birthVillage" label="Village of birth" required placeholder="Type village of birth" />
          <Field label="Sex" required>
            <div className="choice">
              <label><input type="radio" name="sex" value="Male" required /> Male</label>
              <label><input type="radio" name="sex" value="Female" /> Female</label>
            </div>
          </Field>
          <TextField id="email" label="Email address (if any)" type="email" />
          <SelectField id="marital" label="Marital status" required options={["Single", "Married", "Widowed", "Other"]}
            value={marital} onChange={(e) => setMarital(e.target.value)} />
        </div>
      </section>

      <section className="section">
        <h2>2. County Chairman Details</h2>
        <div className="grid">
          <TextField id="countyChairmanName" label="County Chairman Name" required autoComplete="name" placeholder="Enter County Chairman full name" />
          <TextField id="countyChairmanCode" label="County Chairman Code" required placeholder="Enter County Chairman code" />
          <TextField id="countyChairmanPhone" label="County Chairman Phone Number" type="tel" required placeholder={PHONE} />
        </div>
      </section>

      <section className="section">
        <h2>3. Sub-County Representative Details</h2>
        <div className="grid">
          <TextField id="subCountyRepName" label="Sub-County Representative Name" required autoComplete="name" placeholder="Enter representative full name" />
          <TextField id="subCountyRepCode" label="Sub-County Representative Code Number" required placeholder="Enter representative code number" />
          <TextField id="subCountyRepPhone" label="Sub-County Representative Phone Number" type="tel" required placeholder={PHONE} />
        </div>
      </section>

      <section className="section">
        <h2>4. Identity verification documents</h2>
        <p className="hint">Both sides of the National ID, a straight-facing passport-style selfie and driving licence are mandatory. Capture clear images in good lighting.</p>
        <p className="photo-note">Do not submit photos with masks, sunglasses, face coverings, side-facing poses or hidden faces. The Registrar must visually verify that the face is unobstructed.</p>
        <div className="grid">
          <FileField id="idFront" label="National ID — front side" required preview capture="environment" accept="image/*" hint="Keep all ID details within the image." />
          <FileField id="idBack" label="National ID — back side" required preview capture="environment" accept="image/*" hint="Keep all ID details within the image." />
          <FileField id="faceSelfie" label="Straight-facing passport-size selfie" required full preview capture="user" accept="image/*" hint="Face centered, looking directly at camera, without mask or sunglasses." />
          <FileField id="drivingLicenceFront" label="Driving licence — front side" required full capture="environment" />
          <FileField id="drivingLicenceBack" label="Driving licence — back side (mandatory for Smart DL)" required full capture="environment"
            hint="Upload/capture both sides for a Smart Driving Licence. For older licences, upload the front image in both fields if the Registrar instructs you to." />
        </div>
        <div className="field full" style={{ marginTop: 12 }}>
          <label className="check"><input name="photoDeclaration" type="checkbox" required /> I confirm my selfie shows my uncovered face straight toward the camera, without a mask or sunglasses. <span className="req">*</span></label>
        </div>
        <p className="hint">The Registrar automatically receives both ID sides combined into one PDF, plus the original images.</p>
      </section>

      <section className="section">
        <h2>5. Contact and payment numbers</h2>
        <div className="grid">
          <TextField id="whatsapp" label="Working WhatsApp mobile number" type="tel" required placeholder={PHONE} />
          <TextField id="safaricom" label="Safaricom payment number" type="tel" required placeholder={PHONE} />
          <TextField id="alternativeNumber" label="Alternative contact number" type="tel" placeholder={PHONE} />
          <div className="field full"><p className="hint">Use country code where possible. These numbers may be the same if appropriate.</p></div>
        </div>
      </section>

      {marital === "Married" && (
        <section className="section">
          <h2>6. Spouse details</h2>
          <p className="hint">One spouse field is provided first. Add more spouse entries only where applicable.</p>
          {spouseIds.map((id, i) => (
            <div className="repeat" key={id}>
              {i > 0 && (
                <div className="repeat-head"><strong>Additional spouse {i + 1}</strong>
                  <button type="button" className="btn remove" onClick={() => remove(setSpouseIds, id)}>Remove</button></div>
              )}
              <div className="grid">
                <TextField id={`spouse-${id}-name`} name={`spouses[${id}][name]`} label="Spouse full name" placeholder="Full name" />
                <TextField id={`spouse-${id}-phone`} name={`spouses[${id}][phone]`} label="Spouse phone number" type="tel" placeholder="+254..." />
              </div>
            </div>
          ))}
          <button className="btn secondary" type="button" onClick={() => add(setSpouseIds)}>+ Add another spouse</button>
        </section>
      )}

      <section className="section">
        <h2>7. Nominated Member(s)</h2>
        <p className="hint">Add each nominated member separately. The benefit percentage is the percentage suggested by the member; the total must not exceed 100%.</p>
        <div ref={nomineesRef} onInput={recalcNominees}>
          {nomineeIds.map((id, i) => (
            <div className="repeat" key={id}>
              {i > 0 && (
                <div className="repeat-head"><strong>Additional nominated member</strong>
                  <button type="button" className="btn remove" onClick={() => remove(setNomineeIds, id)}>Remove</button></div>
              )}
              <div className="grid">
                <TextField id={`nominee-${id}-name`} name={`nominees[${id}][name]`} label="Nominated member full name" required />
                <SelectField id={`nominee-${id}-rel`} name={`nominees[${id}][relationship]`} label="Relationship to member" required
                  placeholder="Select relationship" options={RELATIONSHIPS} />
                <TextField id={`nominee-${id}-phone`} name={`nominees[${id}][phone]`} label="Nominated member phone" type="tel" required />
                <TextField id={`nominee-${id}-idn`} name={`nominees[${id}][idNumber]`} label="Nominated member ID number" />
                <TextField id={`nominee-${id}-benefit`} name={`nominees[${id}][benefit]`} label="Benefit percentage suggested by member (%)"
                  type="number" min={1} max={100} step={1} required placeholder="e.g. 60" />
              </div>
            </div>
          ))}
        </div>
        <button className="btn secondary" type="button" onClick={() => add(setNomineeIds)}>+ Add another nominated member</button>
        <p className="hint" style={{ color: nomineeTotal > 100 ? "#b42318" : undefined }}>
          Suggested benefit total: {nomineeTotal}%{nomineeTotal > 100 ? " — total cannot exceed 100%." : ""}
        </p>
      </section>

      <section className="section">
        <h2>8. Parents / guardian</h2>
        <p className="hint">For a partial orphan, tick the deceased parent; that parent&apos;s fields are hidden and the record will state “Deceased”. Tick total orphan only if both parents are deceased.</p>
        {!totalOrphan && (
          <div className="grid">
            {!fatherDead && (<>
              <TextField id="father" label="Father's full name" required />
              <TextField id="fatherPhone" label="Father's phone number" type="tel" required placeholder="+254..." />
            </>)}
            {!motherDead && (<>
              <TextField id="mother" label="Mother's full name" required />
              <TextField id="motherPhone" label="Mother's phone number" type="tel" required placeholder="+254..." />
            </>)}
            <div className="field full"><label className="check"><input type="checkbox" name="fatherDeceased" checked={fatherDead} onChange={(e) => setFatherDead(e.target.checked)} /> Father is deceased (partial orphan)</label></div>
            <div className="field full"><label className="check"><input type="checkbox" name="motherDeceased" checked={motherDead} onChange={(e) => setMotherDead(e.target.checked)} /> Mother is deceased (partial orphan)</label></div>
          </div>
        )}
        {totalOrphan && (
          <div className="repeat">
            <strong>Total-orphan guardian details</strong>
            <div className="grid" style={{ marginTop: 10 }}>
              <TextField id="guardian" label="Guardian full name" required />
              <TextField id="guardianPhone" label="Guardian phone number" type="tel" required />
            </div>
          </div>
        )}
        <div style={{ marginTop: 14 }}>
          <label className="check"><input type="checkbox" name="totalOrphan" checked={totalOrphan} onChange={(e) => setTotalOrphan(e.target.checked)} /> I am a total orphan (both parents deceased) and need to provide guardian details</label>
        </div>
      </section>

      <section className="section">
        <h2>9. Children</h2>
        <p className="hint">Add each child separately. Provide only information requested by the Association Registrar.</p>
        {childIds.map((id, i) => (
          <ChildCard key={id} id={id} position={i + 1} onRemove={() => remove(setChildIds, id)} />
        ))}
        <button className="btn secondary" type="button" onClick={() => add(setChildIds)}>+ Add child</button>
      </section>

      <section className="section">
        <h2>10. Member declaration</h2>
        <p>I declare that the information provided is accurate to the best of my knowledge and agree to abide by the rules and responsibilities of Luo Truckers Association.</p>
        <div className="grid">
          <TextField id="declarant" label="Member full name" required />
          <TextField id="signatureDate" label="Declaration date" type="date" required value={sigDate} onChange={(e) => setSigDate(e.target.value)} />
          <div className="field full">
            <label>Member signature (draw with finger or mouse) <span className="req">*</span></label>
            <SignaturePad onChange={setSignature} />
            <small>Sign in the box to confirm this submission. A thumbprint is not required.</small>
          </div>
          <div className="field full"><label className="check"><input name="agree" type="checkbox" required /> I confirm the declaration above <span className="req">*</span></label></div>
        </div>
        <button className="btn primary" type="submit" disabled={loading}>{loading ? "SUBMITTING…" : "SUBMIT REGISTRATION"}</button>
        {status.kind !== "idle" && (
          <div className={"status" + (status.kind === "error" ? " error" : "")} role="status">{status.message}</div>
        )}
      </section>
    </form>
  );
}

function ChildCard({ id, position, onRemove }: { id: number; position: number; onRemove: () => void }) {
  const [dob, setDob] = useState("");
  const [childStatus, setChildStatus] = useState("");
  const age = ageFromDob(dob);
  const over = age !== null && age > CHILD_ADULT_AGE;
  const n = (field: string) => `children[${id}][${field}]`;

  return (
    <div className="repeat">
      <div className="repeat-head"><strong>Child {position}</strong>
        <button type="button" className="btn remove" onClick={onRemove}>Remove</button></div>
      <div className="grid">
        <TextField id={`child-${id}-name`} name={n("name")} label="Child full name" required />
        <TextField id={`child-${id}-dob`} name={n("dob")} label="Date of birth (as on birth document)" type="date" required
          value={dob} onChange={(e) => setDob(e.target.value)} />
        <Field label="Calculated age" htmlFor={`child-${id}-age`}>
          <input id={`child-${id}-age`} readOnly value={age ?? ""} placeholder="Auto-calculated" />
        </Field>
        <SelectField id={`child-${id}-gender`} name={n("gender")} label="Gender" required options={["Male", "Female"]} />
        <SelectField id={`child-${id}-status`} name={n("status")} label="Child status" required options={["Biological", "Adopted"]}
          value={childStatus} onChange={(e) => setChildStatus(e.target.value)} />
        {!over ? (
          <FileField id={`child-${id}-birth`} name={n("birthDoc")} label={`Birth certificate / birth notification (age ${CHILD_ADULT_AGE} or below)`}
            required capture="environment" hint="Clear image or PDF of the document." />
        ) : (
          <FileField id={`child-${id}-school`} name={n("schoolDoc")} label={`School proof document (above age ${CHILD_ADULT_AGE})`}
            required capture="environment" note="Mandatory for children above 23 years old. Registration will be rejected if this document is missing." />
        )}
        {childStatus === "Adopted" && (
          <FileField id={`child-${id}-adopt`} name={n("adoptionDoc")} label="Adoption letter" required capture="environment"
            note="Mandatory when child status is Adopted." />
        )}
        <div className="field full">
          <p className="hint">
            {age === null ? "Enter the date of birth exactly as shown on the supporting document."
              : over ? `Age ${age}: school proof is mandatory; without it this child registration cannot be submitted.`
              : `Age ${age}: birth certificate or birth notification is mandatory.`}
          </p>
        </div>
      </div>
    </div>
  );
}
