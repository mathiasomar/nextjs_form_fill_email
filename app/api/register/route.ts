import { NextResponse, type NextRequest } from "next/server";
import { parseRegistration } from "@/lib/registration";
import { sendRegistrationEmail } from "@/lib/mailer";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let fd: FormData;
  try { fd = await req.formData(); }
  catch { return NextResponse.json({ success: false, message: "Invalid or too-large submission." }, { status: 400 }); }

  if (fd.get("website")) return NextResponse.json({ success: true, reference: "OK" }); // honeypot: pretend success to bots

  const parsed = await parseRegistration(fd);
  if (!parsed.ok) return NextResponse.json({ success: false, message: parsed.errors.join(" • ") }, { status: 422 });

  try {
    await sendRegistrationEmail(parsed.data, parsed.attachments);
  } catch (err) {
    console.error("Registration email failed:", err);
    return NextResponse.json({ success: false, message: "Could not deliver your registration to the Registrar. Please try again." }, { status: 502 });
  }
  return NextResponse.json({ success: true, reference: parsed.data.reference });
}
