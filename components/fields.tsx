"use client";
import { useEffect, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";

export function Field({ label, htmlFor, required, full, hint, children }: {
  label: string; htmlFor?: string; required?: boolean; full?: boolean; hint?: string; children: ReactNode;
}) {
  return (
    <div className={"field" + (full ? " full" : "")}>
      <label htmlFor={htmlFor}>
        {label}
        {required && <span className="req"> *</span>}
      </label>
      {children}
      {hint && <small className="hint">{hint}</small>}
    </div>
  );
}

type Common = { id: string; name?: string; label: string; required?: boolean; full?: boolean; hint?: string };

export function TextField({ id, name, label, required, full, hint, ...rest }:
  Common & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "name" | "required">) {
  return (
    <Field label={label} htmlFor={id} required={required} full={full} hint={hint}>
      <input id={id} name={name ?? id} required={required} {...rest} />
    </Field>
  );
}

export function DateField({ id, name, label, required, full, hint = "Use DD/MM/YYYY.", placeholder = "DD/MM/YYYY", ...rest }:
  Common & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "name" | "required" | "type">) {
  return (
    <Field label={label} htmlFor={id} required={required} full={full} hint={hint}>
      <input id={id} name={name ?? id} type="text" inputMode="text" placeholder={placeholder} required={required} {...rest} />
    </Field>
  );
}

export function SelectField({ id, name, label, required, full, hint, options, placeholder = "Select", ...rest }:
  Common & { options: (string | { value: string; label: string })[]; placeholder?: string } & Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "name" | "required">) {
  return (
    <Field label={label} htmlFor={id} required={required} full={full} hint={hint}>
      <select id={id} name={name ?? id} required={required} {...rest}>
        <option value="">{placeholder}</option>
        {options.map((o) => {
          const v = typeof o === "string" ? { value: o, label: o } : o;
          return <option key={v.value} value={v.value}>{v.label}</option>;
        })}
      </select>
    </Field>
  );
}

export function FileField({ id, name, label, required, full, hint, preview, capture, accept = "image/*,.pdf,application/pdf", note }:
  Common & { preview?: boolean; capture?: "user" | "environment"; accept?: string; note?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return (
    <Field label={label} htmlFor={id} required={required} full={full} hint={hint}>
      <input
        id={id} name={name ?? id} type="file" accept={accept} capture={capture} required={required}
        onChange={(e) => {
          const f = e.target.files?.[0];
          setUrl(preview && f && f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
        }}
      />
      {note && <small className="photo-note">{note}</small>}
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="preview-img" src={url} alt={`${label} preview`} />
      )}
    </Field>
  );
}
