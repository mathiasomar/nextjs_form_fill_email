import nodemailer from "nodemailer";
import { render } from "@react-email/render";
import { RegistrationEmail } from "@/emails/RegistrationEmail";
import type { Registration } from "./types";
import type { MailAttachment } from "./registration";

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

export async function sendRegistrationEmail(data: Registration, attachments: MailAttachment[]) {
  const port = Number(process.env.SMTP_PORT || 465);
  const transporter = nodemailer.createTransport({
    host: env("SMTP_HOST"), port, secure: port === 465,
    auth: { user: env("SMTP_USER"), pass: env("SMTP_PASS") },
  });

  const element = <RegistrationEmail data={data} />;
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);

  await transporter.sendMail({
    from: `"Luo Truckers Registration" <${data.fields.email || env("SMTP_USER")}>`,
    to: env("REGISTRAR_EMAIL"),
    replyTo: data.fields.email || undefined,
    subject: `New membership registration — ${data.fields.memberName} (${data.reference})`,
    html, text, attachments,
  });
}
