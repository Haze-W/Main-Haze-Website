import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

export type SendEmailOptions = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendEmail({ to, subject, text, html }: SendEmailOptions) {
  if (!resend) {
    if (process.env.NODE_ENV === "development") {
      console.log("[email] (no RESEND_API_KEY) would send:", { to, subject });
    }
    return;
  }
  await resend.emails.send({
    from: FROM,
    to: [to],
    subject,
    text,
    html: html ?? text.replace(/\n/g, "<br>"),
  });
}
