"use client";
import { useState } from "react";
import { RegistrationForm } from "./RegistrationForm";

export function RegistrationApp() {
  const [formKey, setFormKey] = useState(0);
  const [reference, setReference] = useState<string | null>(null);

  return (
    <main id="app">
      <header className="hero">
        <h1>LUO TRUCKERS ASSOCIATION</h1>
        <p>Membership Application &amp; Registration</p>
        <p style={{ marginTop: 10, fontSize: ".9rem" }}>Complete the form carefully. Fields marked * are required.</p>
      </header>
      <div className="wrap">
        {reference ? (
          <section className="section">
            <h2>Registration submitted</h2>
            <p>Your registration has been sent to the Registrar.</p>
            <p><strong>Reference: {reference}</strong></p>
            <p className="hint">Keep this reference number for follow-up.</p>
            <button className="btn secondary" type="button" onClick={() => { setReference(null); setFormKey((k) => k + 1); }}>
              Register another member
            </button>
          </section>
        ) : (
          <RegistrationForm key={formKey} onSuccess={setReference} />
        )}
      </div>
    </main>
  );
}
