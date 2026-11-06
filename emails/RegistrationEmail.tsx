import { Body, Column, Container, Head, Heading, Hr, Html, Img, Preview, Row, Section, Text } from "@react-email/components";
import type { Registration } from "@/lib/types";

const s = {
  body: { backgroundColor: "#f5f7f6", fontFamily: "Arial, Helvetica, sans-serif", margin: 0, padding: "16px 0" },
  container: { maxWidth: 640, margin: "0 auto", backgroundColor: "#ffffff", borderRadius: 8 },
  header: { backgroundColor: "#176b50", color: "#ffffff", padding: "20px 24px", borderRadius: "8px 8px 0 0" },
  h1: { color: "#ffffff", fontSize: 20, margin: "0 0 4px" },
  sub: { color: "#e8f3ed", fontSize: 13, margin: 0 },
  block: { padding: "4px 24px 8px" },
  h2: { color: "#176b50", fontSize: 15, margin: "16px 0 8px" },
  label: { color: "#5a6b63", fontSize: 12, margin: "2px 0" },
  value: { color: "#18231f", fontSize: 13, margin: "2px 0", wordBreak: "break-word" as const },
  hr: { borderColor: "#dce4df", margin: "8px 24px" },
};

type Rows = [string, string | number | undefined][];
function Block({ title, rows }: { title: string; rows: Rows }) {
  const shown = rows.filter(([, v]) => v !== undefined && String(v).trim() !== "");
  if (!shown.length) return null;
  return (
    <Section style={s.block}>
      <Heading as="h2" style={s.h2}>{title}</Heading>
      {shown.map(([label, value], i) => (
        <Row key={i}>
          <Column style={{ width: "42%", verticalAlign: "top" }}><Text style={s.label}>{label}</Text></Column>
          <Column style={{ verticalAlign: "top" }}><Text style={s.value}>{String(value)}</Text></Column>
        </Row>
      ))}
    </Section>
  );
}

export function RegistrationEmail({ data }: { data: Registration }) {
  const f = data.fields;
  return (
    <Html lang="en">
      <Head />
      <Preview>{`New registration: ${f.memberName} (${data.reference})`}</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <Section style={s.header}>
            <Heading as="h1" style={s.h1}>New membership registration</Heading>
            <Text style={s.sub}>Reference {data.reference} · Submitted {data.submittedAt}</Text>
          </Section>

          <Block title="Member" rows={[
            ["Membership type", f.memberType === "origin" ? "Origin/existing member" : "New member"],
            ["Existing member code", f.memberCode], ["Application date", f.applicationDate], ["Full name", f.memberName],
            ["Date of birth", f.dob], ["National ID number", f.idno], ["Sex", f.sex], ["Marital status", f.marital], ["Email", f.email],
          ]} />
          <Block title="Place of birth" rows={[
            ["County", f.birthCounty], ["Sub-County", f.birthSubCounty], ["District", f.birthDistrict], ["Division", f.birthDivision],
            ["Location", f.birthLocation], ["Sub-Location", f.birthSubLocation], ["Village", f.birthVillage],
          ]} />
          <Block title="Contact and payment" rows={[
            ["WhatsApp", f.whatsapp], ["Safaricom payment number", f.safaricom], ["Alternative number", f.alternativeNumber],
          ]} />
          <Block title="County Chairman" rows={[
            ["Name", f.countyChairmanName], ["Code", f.countyChairmanCode], ["National ID", f.countyChairmanId], ["Phone", f.countyChairmanPhone],
          ]} />
          <Block title="Sub-County Representative" rows={[
            ["Name", f.subCountyRepName], ["Code", f.subCountyRepCode], ["National ID", f.subCountyRepId], ["Phone", f.subCountyRepPhone],
          ]} />
          {data.spouses.map((sp, i) => (
            <Block key={i} title={`Spouse ${i + 1}`} rows={[["Name", sp.name], ["Phone", sp.phone]]} />
          ))}
          {data.nominees.map((n, i) => (
            <Block key={i} title={`Nominated member ${i + 1}`} rows={[
              ["Name", n.name], ["Relationship", n.relationship], ["Phone", n.phone], ["ID number", n.idNumber], ["Suggested benefit", `${n.benefit}%`],
            ]} />
          ))}
          <Block title={`Parents / guardian — ${f.parentStatus}`} rows={[
            ["Father", f.father], ["Father ID", f.fatherId], ["Father phone", f.fatherPhone],
            ["Mother", f.mother], ["Mother ID", f.motherId], ["Mother phone", f.motherPhone],
            ["Guardian", f.guardian], ["Guardian ID", f.guardianId], ["Guardian phone", f.guardianPhone],
          ]} />
          {data.children.map((c, i) => (
            <Block key={i} title={`Child ${i + 1}`} rows={[
              ["Name", c.name], ["Date of birth", c.dob], ["Age", c.age], ["Gender", c.gender], ["Status", c.status], ["Documents", c.documents.join(", ")],
            ]} />
          ))}

          <Hr style={s.hr} />
          <Block title="Declaration" rows={[["Declared by", f.declarant], ["Date", f.signatureDate]]} />
          <Section style={{ padding: "0 24px 8px" }}>
            <Text style={s.label}>Signature</Text>
            <Img src="cid:signature" alt="Member signature" width={240} style={{ border: "1px solid #dce4df", borderRadius: 6 }} />
          </Section>

          <Hr style={s.hr} />
          <Section style={s.block}>
            <Heading as="h2" style={s.h2}>Attached documents ({data.attachmentNames.length})</Heading>
            {data.attachmentNames.map((n) => <Text key={n} style={{ ...s.value, margin: "1px 0" }}>• {n}</Text>)}
            <Text style={{ ...s.label, marginTop: 10 }}>All files are attached to this email — download them from the attachment bar.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
