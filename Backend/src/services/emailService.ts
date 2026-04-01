import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import type { Env } from '../config/env';

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export async function sendTransactionalEmail(env: Env, input: SendEmailInput): Promise<void> {
  if (env.emailProvider === 'gmail') {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: env.gmailEmail,
        pass: env.gmailPassword
      }
    });

    await transporter.sendMail({
      from: env.emailFrom,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text
    });

    return;
  }

  const resend = new Resend(env.resendApiKey);
  const result = await resend.emails.send({
    from: env.resendEmailFrom ?? env.emailFrom,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text
  });

  if (result.error) {
    throw new Error(`Resend send failed: ${result.error.message}`);
  }
}
